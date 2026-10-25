import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Search, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SharedMailboxesManager } from '@/components/settings/SharedMailboxesManager';
import { SteeveAuthServersCard } from '@/components/settings/SteeveAuthServersCard';

type Settings = Record<string, string>;
type Overview = {
  settings: Settings;
  spend: { month_usd: number; day_usd: number };
  public_spend: { month_usd: number; day_usd: number };
  today: { reponses: number; accueils: number; transferts: number; echecs: number; site_public: number };
  conversations: { avec_steeve: number; accueillies: number };
};
type ClientRow = {
  client_id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  statut: string | null;
  in_pilot: boolean;
  email_verifie: boolean;
  has_conversation: boolean;
};
type JournalRow = {
  run_id: string;
  created_at: string;
  kind: string;
  status: string;
  reason: string | null;
  cost_usd: number;
  calls: number;
  conversation_id: string;
  client_nom: string | null;
  error: string | null;
};

const BUDGET_FIELDS: { key: string; label: string; step: string }[] = [
  { key: 'steeve_budget_month_usd', label: 'Plafond mensuel (USD)', step: '1' },
  { key: 'steeve_alert_month_usd', label: 'Alerte mensuelle (USD)', step: '1' },
  { key: 'steeve_budget_day_usd', label: 'Plafond quotidien (USD)', step: '0.5' },
  { key: 'steeve_client_day_usd', label: 'Par client et par jour (USD)', step: '0.1' },
  { key: 'steeve_client_day_messages', label: 'Messages par client et par jour', step: '1' },
  { key: 'steeve_public_day_usd', label: 'Site public : plafond quotidien (USD)', step: '0.1' },
  { key: 'steeve_public_month_usd', label: 'Site public : plafond mensuel (USD)', step: '1' },
  { key: 'steeve_public_minute_messages', label: 'Site public : messages par minute (tous visiteurs)', step: '1' },
  { key: 'steeve_public_session_messages', label: 'Site public : messages par visiteur et par jour', step: '1' },
  { key: 'steeve_public_ip_messages', label: 'Site public : messages par adresse IP et par jour', step: '1' },
];

const STATUS_LABEL: Record<string, string> = {
  done: 'Publié',
  skipped: 'Écarté',
  capped: 'Plafond',
  failed: 'Échec',
  queued: 'En file',
  running: 'En cours',
};

const usd = (n: number | string | null | undefined) => `${Number(n ?? 0).toFixed(2)} USD`;
const when = (iso: string) =>
  new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const fullName = (c: ClientRow) => [c.prenom, c.nom].filter(Boolean).join(' ') || 'Client sans nom';

export default function AdminSteeve() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [draft, setDraft] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const [pilot, setPilot] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [journal, setJournal] = useState<JournalRow[]>([]);

  const loadOverview = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_steeve_overview');
    if (error) {
      toast.error('Impossible de charger les réglages de Steeve');
      return;
    }
    const o = data as unknown as Overview;
    setOverview(o);
    setDraft(o.settings || {});
  }, []);

  const loadPilot = useCallback(async () => {
    const { data } = await supabase.rpc('admin_steeve_clients', { p_query: null });
    setPilot((data ?? []) as ClientRow[]);
  }, []);

  const loadJournal = useCallback(async () => {
    const { data } = await supabase.rpc('admin_steeve_journal', { p_limit: 50 });
    setJournal((data ?? []) as JournalRow[]);
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadPilot();
    void loadJournal();
  }, [loadOverview, loadPilot, loadJournal]);

  const save = async (patch: Settings, message = 'Réglages enregistrés') => {
    setSaving(true);
    const { data, error } = await supabase.rpc('admin_set_steeve_settings', { p_settings: patch });
    setSaving(false);
    if (error) {
      toast.error(error.message || "L'enregistrement a échoué");
      return false;
    }
    const o = data as unknown as Overview;
    setOverview(o);
    setDraft(o.settings || {});
    toast.success(message);
    return true;
  };

  const pilotIds = (draft.steeve_pilot_client_ids || '').split(',').map((s) => s.trim()).filter((s) => s && s !== 'all');
  const allClients = (draft.steeve_pilot_client_ids || '').trim() === 'all';

  const setPilotIds = async (ids: string[]) => {
    if (await save({ steeve_pilot_client_ids: ids.join(',') }, 'Liste des clients mise à jour')) {
      void loadPilot();
      setResults((prev) => prev.map((r) => ({ ...r, in_pilot: ids.includes(r.client_id) })));
    }
  };

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase.rpc('admin_steeve_clients', { p_query: query.trim() });
    setSearching(false);
    setResults((data ?? []) as ClientRow[]);
  };

  const verify = async (c: ClientRow, verified: boolean) => {
    const { error } = await supabase.rpc('staff_verify_client_email', { p_client_id: c.client_id, p_verified: verified });
    if (error) {
      toast.error("La vérification de l'adresse a échoué");
      return;
    }
    toast.success(verified ? 'Adresse vérifiée' : 'Vérification retirée');
    void loadPilot();
  };

  if (!overview) {
    return (
      <div className="p-4 md:p-8" role="status" aria-label="Chargement de Steeve">
        <div className="h-7 w-44 rounded bg-muted/60" />
        <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
      </div>
    );
  }

  const monthCap = Number(overview.settings.steeve_budget_month_usd ?? 30);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Steeve</h1>
          <p className="text-muted-foreground">Activation, clients concernés, budget, journal et boîtes e-mail de l'assistant</p>
        </div>

        <div className="grid max-w-4xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Activation</CardTitle>
              <CardDescription>Steeve ne répond que là où il est activé. Un agent peut toujours reprendre une conversation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="steeve-enabled">Steeve répond aux clients dans la messagerie</Label>
                  <p className="text-sm text-muted-foreground">Pour les clients choisis ci-dessous (ou tous).</p>
                </div>
                <Switch
                  id="steeve-enabled"
                  checked={draft.steeve_enabled === 'true'}
                  disabled={saving}
                  onCheckedChange={(v) => void save({ steeve_enabled: v ? 'true' : 'false' }, v ? 'Steeve activé' : 'Steeve désactivé')}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="steeve-public">Steeve sur le site public</Label>
                  <p className="text-sm text-muted-foreground">Bulle « Une question ? » pour les visiteurs (informations publiées uniquement).</p>
                </div>
                <Switch
                  id="steeve-public"
                  checked={draft.steeve_public_enabled === 'true'}
                  disabled={saving}
                  onCheckedChange={(v) => void save({ steeve_public_enabled: v ? 'true' : 'false' }, v ? 'Steeve activé sur le site' : 'Steeve retiré du site')}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="steeve-model">Modèle</Label>
                <Select
                  value={draft.steeve_model || 'claude-haiku-5-5'}
                  onValueChange={(v) => void save({ steeve_model: v }, 'Modèle enregistré')}
                >
                  <SelectTrigger id="steeve-model" className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-haiku-5-5">Claude Haiku 5.5 (économique)</SelectItem>
                    <SelectItem value="claude-sonnet-5-5">Claude Sonnet 5.5 (plus précis, environ 20 × plus cher)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-3">
                <div><p className="text-muted-foreground">Ce mois</p><p className="font-semibold">{usd(overview.spend.month_usd)} / {usd(monthCap)}</p></div>
                <div><p className="text-muted-foreground">Aujourd'hui</p><p className="font-semibold">{usd(overview.spend.day_usd)}</p></div>
                <div><p className="text-muted-foreground">Site public ce mois</p><p className="font-semibold">{usd(overview.public_spend?.month_usd)} / {usd(overview.settings.steeve_public_month_usd ?? 5)}</p></div>
                <div><p className="text-muted-foreground">Conversations avec Steeve</p><p className="font-semibold">{overview.conversations.avec_steeve}</p></div>
                <div><p className="text-muted-foreground">Réponses du jour</p><p className="font-semibold">{overview.today.reponses}</p></div>
                <div><p className="text-muted-foreground">Accueils du jour</p><p className="font-semibold">{overview.today.accueils}</p></div>
                <div><p className="text-muted-foreground">Transmis à un agent</p><p className="font-semibold">{overview.today.transferts}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clients concernés</CardTitle>
              <CardDescription>
                Steeve ne lit les e-mails d'un client que si son adresse a été vérifiée (bouton « Vérifier l'adresse »).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={allClients ? 'all' : 'some'}
                onValueChange={(v) => void save({ steeve_pilot_client_ids: v === 'all' ? 'all' : pilotIds.join(',') }, 'Clients concernés mis à jour')}
                className="flex flex-col gap-2 sm:flex-row sm:gap-6"
              >
                <div className="flex items-center gap-2"><RadioGroupItem value="some" id="pilot-some" /><Label htmlFor="pilot-some">Clients choisis</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="all" id="pilot-all" /><Label htmlFor="pilot-all">Tous les clients</Label></div>
              </RadioGroup>

              {!allClients && (
                <>
                  {pilot.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun client choisi pour l'instant.</p>
                  ) : (
                    <ul className="divide-y rounded-md border">
                      {pilot.map((c) => (
                        <li key={c.client_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium">{fullName(c)}</p>
                            <p className="break-all text-xs text-muted-foreground">{c.email || 'sans e-mail'} · {c.statut || 'statut inconnu'}{c.has_conversation ? '' : ' · pas de conversation'}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1">
                            {c.email_verifie ? (
                              <Button variant="outline" size="sm" onClick={() => void verify(c, false)}>
                                <ShieldCheck className="mr-1 h-4 w-4 text-primary" /> Adresse vérifiée
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => void verify(c, true)}>Vérifier l'adresse</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => void setPilotIds(pilotIds.filter((id) => id !== c.client_id))} aria-label={`Retirer ${fullName(c)}`}>
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client (nom ou e-mail)" aria-label="Rechercher un client" />
                <Button type="submit" variant="outline" disabled={searching || query.trim().length < 2}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
              {results.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {results.map((c) => (
                    <li key={c.client_id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{fullName(c)}</p>
                        <p className="break-all text-xs text-muted-foreground">{c.email || 'sans e-mail'} · {c.statut || 'statut inconnu'}</p>
                      </div>
                      {c.in_pilot ? (
                        <Badge variant="secondary">Déjà concerné</Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={allClients} onClick={() => void setPilotIds([...pilotIds, c.client_id])}>
                          <UserPlus className="mr-1 h-4 w-4" /> Ajouter
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Au-delà d'un plafond, Steeve prévient le client et transmet à son agent (site public : message d'attente). Le site public a son propre budget : il ne peut jamais entamer celui des clients.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const patch: Settings = {};
                  for (const f of BUDGET_FIELDS) if (draft[f.key] !== undefined) patch[f.key] = draft[f.key];
                  void save(patch, 'Budget enregistré');
                }}
              >
                {BUDGET_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key}>{f.label}</Label>
                    <Input
                      id={f.key}
                      type="number"
                      min="0"
                      step={f.step}
                      value={draft[f.key] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Enregistrer le budget
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal</CardTitle>
              <CardDescription>Les 50 derniers passages de Steeve (réponses et accueils).</CardDescription>
            </CardHeader>
            <CardContent>
              {journal.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun passage pour l'instant.</p>
              ) : (
                <ul className="divide-y rounded-md border text-sm">
                  {journal.map((j) => (
                    <li key={j.run_id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {j.client_nom || 'Client'} · {j.kind === 'welcome' ? 'Accueil' : 'Réponse'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {when(j.created_at)} · {j.reason || '—'} · {j.calls} appel(s) · {usd(j.cost_usd)}
                        </p>
                        {j.error && <p className="text-xs text-destructive">{j.error}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={j.status === 'done' ? 'default' : j.status === 'failed' ? 'destructive' : 'secondary'}>
                          {STATUS_LABEL[j.status] || j.status}
                        </Badge>
                        <Link className="text-xs underline underline-offset-2" to={`/admin/messagerie?conversationId=${j.conversation_id}`}>
                          Conversation
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <SharedMailboxesManager />
          <SteeveAuthServersCard />
        </div>
      </div>
    </div>
  );
}
