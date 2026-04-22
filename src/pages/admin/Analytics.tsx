import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DateRangeFilter, getDefaultDateRange, type DateRange } from '@/components/stats/DateRangeFilter';
import { ConversionFunnel } from '@/components/stats/ConversionFunnel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, TrendingUp, Globe, Target, DollarSign } from 'lucide-react';
import { format, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);

  // Funnel data (all-time, not filtered by date)
  const [funnelData, setFunnelData] = useState({
    leads: 0, mandats: 0, clients: 0, offres: 0,
    candidatures: 0, bails: 0, cles: 0,
  });
  const [funnelLoading, setFunnelLoading] = useState(true);

  // ROI data
  const [roiData, setRoiData] = useState<{ source: string; leads: number; transactions: number; revenue: number }[]>([]);

  // Fetch funnel data (all-time)
  useEffect(() => {
    const fetchFunnel = async () => {
      setFunnelLoading(true);
      const [leadsRes, mandatsRes, clientsRes, offresRes, candRes, bailsRes, clesRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('demandes_mandat').select('id', { count: 'exact', head: true }).eq('statut', 'active'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).not('agent_id', 'is', null),
        supabase.from('offres').select('id', { count: 'exact', head: true }),
        supabase.from('candidatures').select('id', { count: 'exact', head: true }),
        supabase.from('candidatures').select('id', { count: 'exact', head: true }).in('statut', ['signature_effectuee', 'etat_lieux_fixe', 'cles_remises']),
        supabase.from('candidatures').select('id', { count: 'exact', head: true }).eq('statut', 'cles_remises'),
      ]);
      setFunnelData({
        leads: leadsRes.count || 0,
        mandats: mandatsRes.count || 0,
        clients: clientsRes.count || 0,
        offres: offresRes.count || 0,
        candidatures: candRes.count || 0,
        bails: bailsRes.count || 0,
        cles: clesRes.count || 0,
      });
      setFunnelLoading(false);
    };
    fetchFunnel();
  }, []);

  // Fetch date-filtered data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const fromISO = dateRange.from.toISOString();
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();

      const [leadsRes, mandatsRes] = await Promise.all([
        supabase.from('leads').select('id, created_at, utm_source, utm_medium, utm_campaign, source')
          .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: true }),
        supabase.from('demandes_mandat').select('id, created_at')
          .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: true }),
      ]);

      setLeads((leadsRes.data as Lead[]) || []);
      setMandats((mandatsRes.data as Mandat[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [dateRange]);

  // Fetch ROI data
  useEffect(() => {
    const fetchROI = async () => {
      // Get all leads with utm_source
      const { data: allLeads } = await supabase
        .from('leads').select('id, email, utm_source, source');

      // Get transactions with commissions
      const { data: transactions } = await supabase
        .from('transactions').select('id, commission_totale, client_id, statut')
        .eq('statut', 'conclue');

      // Get clients with user mapping
      const { data: clients } = await supabase
        .from('clients').select('id, user_id');

      // Get profiles emails
      const { data: profiles } = await supabase
        .from('profiles').select('id, email');

      if (!allLeads || !transactions || !clients || !profiles) return;

      // Build email->source map from leads
      const emailToSource = new Map<string, string>();
      allLeads.forEach(l => {
        const src = l.utm_source || l.source || 'direct';
        if (l.email) emailToSource.set(l.email.toLowerCase(), src);
      });

      // Build user_id -> email map
      const userToEmail = new Map<string, string>();
      profiles.forEach(p => { if (p.email) userToEmail.set(p.id, p.email.toLowerCase()); });

      // Map transactions to sources
      const sourceMap = new Map<string, { leads: number; transactions: number; revenue: number }>();

      // Count leads per source
      allLeads.forEach(l => {
        const src = l.utm_source || l.source || 'direct';
        if (!sourceMap.has(src)) sourceMap.set(src, { leads: 0, transactions: 0, revenue: 0 });
        sourceMap.get(src)!.leads++;
      });

      // Map transactions to sources via client -> profile -> email -> lead source
      transactions.forEach(t => {
        const client = clients.find(c => c.id === t.client_id);
        if (!client) return;
        const email = userToEmail.get(client.user_id);
        if (!email) return;
        const src = emailToSource.get(email) || 'direct';
        if (!sourceMap.has(src)) sourceMap.set(src, { leads: 0, transactions: 0, revenue: 0 });
        sourceMap.get(src)!.transactions++;
        sourceMap.get(src)!.revenue += t.commission_totale || 0;
      });

      setRoiData(
        Array.from(sourceMap.entries())
          .map(([source, data]) => ({ source, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
      );
    };
    fetchROI();
  }, []);

  const chartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'dd/MM', { locale: fr }),
        Leads: leads.filter(l => l.created_at.startsWith(dayStr)).length,
        Mandats: mandats.filter(m => m.created_at.startsWith(dayStr)).length,
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
    <div className="relative space-y-6 p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Suivi des performances marketing & conversions</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="roi">ROI Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Leads
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{leads.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Mandats
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{mandats.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Conversion
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{conversionRate}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Sources
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{utmSources.length}</p></CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Leads & Mandats par jour</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-base">Sources de trafic (UTM)</CardTitle></CardHeader>
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
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <ConversionFunnel
            leads={funnelData.leads}
            mandats={funnelData.mandats}
            clientsAssignes={funnelData.clients}
            offresEnvoyees={funnelData.offres}
            candidatures={funnelData.candidatures}
            bailsSignes={funnelData.bails}
            clesRemises={funnelData.cles}
            loading={funnelLoading}
          />
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          {/* ROI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" /> Sources actives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{roiData.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Revenu total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {roiData.reduce((s, r) => s + r.revenue, 0).toLocaleString('fr-CH')} CHF
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {roiData.reduce((s, r) => s + r.transactions, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue by Source Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Revenu par source</CardTitle></CardHeader>
              <CardContent>
                {roiData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roiData.filter(r => r.revenue > 0)}
                        dataKey="revenue"
                        nameKey="source"
                        cx="50%" cy="50%"
                        outerRadius={100}
                        label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {roiData.filter(r => r.revenue > 0).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-CH')} CHF`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* ROI Table */}
            <Card>
              <CardHeader><CardTitle className="text-base">ROI par canal</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-muted-foreground">Source</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Leads</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Transactions</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Revenu</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roiData.map(r => (
                        <tr key={r.source} className="border-b last:border-0">
                          <td className="py-2 font-medium">{r.source}</td>
                          <td className="py-2 text-right">{r.leads}</td>
                          <td className="py-2 text-right">{r.transactions}</td>
                          <td className="py-2 text-right font-medium">
                            {r.revenue > 0 ? `${r.revenue.toLocaleString('fr-CH')} CHF` : '-'}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {r.leads > 0 ? `${((r.transactions / r.leads) * 100).toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
