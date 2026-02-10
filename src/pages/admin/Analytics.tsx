import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/stats/DateRangeFilter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, FileText, TrendingUp, Globe } from 'lucide-react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Lead {
  id: string;
  created_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source: string | null;
}

interface Mandat {
  id: string;
  created_at: string;
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const fromISO = dateRange.from.toISOString();
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();

      const [leadsRes, mandatsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, created_at, utm_source, utm_medium, utm_campaign, source')
          .gte('created_at', fromISO)
          .lte('created_at', toISO)
          .order('created_at', { ascending: true }),
        supabase
          .from('demandes_mandat')
          .select('id, created_at')
          .gte('created_at', fromISO)
          .lte('created_at', toISO)
          .order('created_at', { ascending: true }),
      ]);

      setLeads((leadsRes.data as Lead[]) || []);
      setMandats((mandatsRes.data as Mandat[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [dateRange]);

  const chartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLeads = leads.filter(l => l.created_at.startsWith(dayStr)).length;
      const dayMandats = mandats.filter(m => m.created_at.startsWith(dayStr)).length;
      return {
        date: format(day, 'dd/MM', { locale: fr }),
        Leads: dayLeads,
        Mandats: dayMandats,
      };
    });
  }, [leads, mandats, dateRange]);

  const utmSources = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const src = l.utm_source || l.source || 'direct';
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const conversionRate = leads.length > 0
    ? ((mandats.length / leads.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Suivi des performances marketing</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Mandats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{mandats.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conversionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{utmSources.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads & Mandats par jour</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chargement...</div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mandats" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* UTM Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources de trafic (UTM)</CardTitle>
        </CardHeader>
        <CardContent>
          {utmSources.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune donnée de source disponible</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Source</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Leads</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {utmSources.map(({ source, count }) => (
                    <tr key={source} className="border-b last:border-0">
                      <td className="py-2 font-medium">{source}</td>
                      <td className="py-2 text-right">{count}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {((count / leads.length) * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
