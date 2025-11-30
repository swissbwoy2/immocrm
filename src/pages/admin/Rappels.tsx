import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Mail, Clock, CheckCircle, Search, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ReminderWithDetails {
  id: string;
  visite_id: string;
  user_id: string;
  reminder_type: string;
  sent_at: string;
  created_at: string;
  profile?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

const getReminderTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'etat_lieux_24h_email': 'État des lieux (24h)',
    'signature_24h_email': 'Signature bail (24h)',
    'visite_24h': 'Visite (24h)',
    'visite_2h': 'Visite (2h)',
    'visite_30min': 'Visite (30min)',
  };
  return labels[type] || type;
};

const getReminderTypeColor = (type: string) => {
  if (type.includes('etat_lieux')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (type.includes('signature')) return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
  if (type.includes('visite')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  return 'bg-muted text-muted-foreground';
};

export default function AdminRappels() {
  const [reminders, setReminders] = useState<ReminderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    byType: {} as Record<string, number>,
  });

  const loadReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_reminders')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch profiles for each reminder
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const remindersWithProfiles = (data || []).map(reminder => ({
        ...reminder,
        profile: profileMap.get(reminder.user_id),
      }));

      setReminders(remindersWithProfiles);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const byType: Record<string, number> = {};
      let todayCount = 0;
      let weekCount = 0;

      remindersWithProfiles.forEach(r => {
        byType[r.reminder_type] = (byType[r.reminder_type] || 0) + 1;
        const sentDate = new Date(r.sent_at);
        if (sentDate >= todayStart) todayCount++;
        if (sentDate >= weekStart) weekCount++;
      });

      setStats({
        total: remindersWithProfiles.length,
        today: todayCount,
        thisWeek: weekCount,
        byType,
      });
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast.error('Erreur lors du chargement des rappels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = 
      reminder.profile?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.profile?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.reminder_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || reminder.reminder_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(reminders.map(r => r.reminder_type))];

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rappels envoyés</h1>
          <p className="text-muted-foreground">Suivi des rappels automatiques envoyés aux clients et agents</p>
        </div>
        <Button onClick={loadReminders} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total envoyés</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                <p className="text-3xl font-bold">{stats.today}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cette semaine</p>
                <p className="text-3xl font-bold">{stats.thisWeek}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Types différents</p>
                <p className="text-3xl font-bold">{Object.keys(stats.byType).length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div 
                key={type} 
                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card"
              >
                <Badge variant="outline" className={getReminderTypeColor(type)}>
                  {getReminderTypeLabel(type)}
                </Badge>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[250px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {getReminderTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type de rappel</TableHead>
                  <TableHead>Date d'envoi</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Chargement...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredReminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Mail className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">Aucun rappel trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell className="font-medium">
                        {reminder.profile 
                          ? `${reminder.profile.prenom} ${reminder.profile.nom}`
                          : 'Utilisateur inconnu'
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reminder.profile?.email || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getReminderTypeColor(reminder.reminder_type)}>
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(reminder.sent_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Envoyé
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredReminders.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-right">
              {filteredReminders.length} rappel{filteredReminders.length > 1 ? 's' : ''} affiché{filteredReminders.length > 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
