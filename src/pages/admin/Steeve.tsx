import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, ClipboardList, Inbox, PhoneCall, Lightbulb, Loader2, MessagesSquare, Power, Save, Search, ShieldCheck, Sparkles, UserMinus, UserPlus, Users, Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashBadge, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import {
  GlassSlot, SETTINGS_INSET, SettingRow, SettingsCard, SettingsList, SettingsSectionNav, type SettingsSection,
} from '@/components/admin/AdminSettingsPrimitives';
import { SharedMailboxesManager } from '@/components/settings/SharedMailboxesManager';
import { SteeveAuthServersCard } from '@/components/settings/SteeveAuthServersCard';
import { SteeveCopilotCard } from '@/components/admin/SteeveCopilotCard';
import { SteeveProposalsCard } from '@/components/steeve/SteeveProposalsCard';
import { SteeveOperatorCard } from '@/components/admin/SteeveOperatorCard';
import { SteeveAppelsCard } from '@/components/admin/SteeveAppelsCard';

type Settings = Record<string, string>;
type Overview = {
  settings: Settings;
  spend: { month_usd: number; day_usd: number };
  public_spend: { month_usd: number; day_usd: number };
  admin_spend?: { month_usd: number; day_usd: number };
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
  { key: 'steeve_admin_day_usd', label: 'Copilote admin : plafond quotidien (USD)', step: '0.5' },
];

/** Regroupement visuel des champs de budget (même ordre, mêmes clés). */
const BUDGET_GROUPS: { title: string; match: (key: string) => boolean; prefix: RegExp }[] = [
  { title: 'Messagerie des clients', match: (k) => !k.startsWith('steeve_public_') && !k.startsWith('steeve_admin_'), prefix: /^$/ },
  { title: 'Site public', match: (k) => k.startsWith('steeve_public_'), prefix: /^Site public : / },
  { title: 'Copilote admin', match: (k) => k.startsWith('steeve_admin_'), prefix: /^Copilote admin : / },
];
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const STATUS_LABEL: Record<string, string> = {
  done: 'Publié',
  skipped: 'Écarté',
  capped: 'Plafond',
  failed: 'Échec',
  queued: 'En file',
  running: 'En cours',
};
const STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'muted' | 'neutral'> = {
  done: 'success',
  failed: 'danger',
  capped: 'warning',
  skipped: 'muted',
  queued: 'neutral',
  running: 'neutral',
};

type SectionKey = 'copilote' | 'propositions' | 'appels' | 'operateur' | 'activation' | 'clients' | 'budget' | 'journal' | 'boites';
const SECTION_KEY = 'admin-steeve-section';

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
  const [section, setSectionState] = useState<SectionKey>(() => {
    try {
      // Lien direct (notification du rapport de santé) : ?section=appels
      const saved = (new URLSearchParams(window.location.search).get('section') ?? localStorage.getItem(SECTION_KEY)) as SectionKey | null;
      const valid: SectionKey[] = ['copilote', 'propositions', 'appels', 'operateur', 'activation', 'clients', 'budget', 'journal', 'boites'];
      return saved && valid.includes(saved) ? saved : 'copilote';
    } catch {
      return 'copilote';
    }
  });

  const setSection = (key: SectionKey) => {
    setSectionState(key);
    try { localStorage.setItem(SECTION_KEY, key); } catch { /* stockage indisponible */ }
  };

  // Lien du menu (« Appels du jour ») : suit ?section= même si la page Steeve est déjà ouverte.
  const lieu = useLocation();
  useEffect(() => {
    const demandee = new URLSearchParams(lieu.search).get('section') as SectionKey | null;
    const valides: SectionKey[] = ['copilote', 'propositions', 'appels', 'operateur', 'activation', 'clients', 'budget', 'journal', 'boites'];
    if (demandee && valides.includes(demandee)) setSectionState(demandee);
  }, [lieu.search]);

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
      <DashPage className="max-w-6xl">
        <div role="status" aria-label="Chargement de Steeve">
          <div className="h-8 w-36 rounded-full bg-muted/60" />
          <div className="mt-2 h-4 w-72 max-w-full rounded-full bg-muted/40" />
          <div className="mt-6 h-11 w-full rounded-full bg-muted/40 lg:hidden" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="hidden h-96 rounded-[22px] bg-muted/40 lg:block" />
            <div className="h-72 rounded-[22px] bg-muted/40" />
          </div>
        </div>
      </DashPage>
    );
  }

  const monthCap = Number(overview.settings.steeve_budget_month_usd ?? 30);
  const enabled = draft.steeve_enabled === 'true';
  const publicEnabled = draft.steeve_public_enabled === 'true';

  const sections: SettingsSection<SectionKey>[] = [
    { key: 'copilote', label: 'Copilote', sub: 'Poser une question', icon: Sparkles },
    { key: 'propositions', label: 'Propositions', sub: 'Actions à valider', icon: Lightbulb },
    { key: 'appels', label: 'Appels du jour', sub: 'Régies à appeler', icon: PhoneCall },
    { key: 'operateur', label: 'Opérateur', sub: 'Mode et actions', icon: Bot },
    { key: 'activation', label: 'Activation', sub: 'Où Steeve répond', icon: Power },
    { key: 'clients', label: 'Clients', sub: 'Clients concernés', icon: Users, count: allClients ? undefined : pilot.length },
    { key: 'budget', label: 'Budget', sub: 'Plafonds et alertes', icon: Wallet },
    { key: 'journal', label: 'Journal', sub: '50 derniers passages', icon: ClipboardList },
    { key: 'boites', label: 'Boîtes e-mail', sub: 'Mots de passe, serveurs', icon: Inbox },
  ];

  const STATS: { label: string; value: ReactNode }[] = [
    { label: 'Ce mois', value: <>{usd(overview.spend.month_usd)} / {usd(monthCap)}</> },
    { label: "Aujourd'hui", value: usd(overview.spend.day_usd) },
    { label: 'Site public ce mois', value: <>{usd(overview.public_spend?.month_usd)} / {usd(overview.settings.steeve_public_month_usd ?? 5)}</> },
    { label: 'Copilote ce mois', value: usd(overview.admin_spend?.month_usd) },
    { label: 'Conversations avec Steeve', value: overview.conversations.avec_steeve },
    { label: 'Réponses du jour', value: overview.today.reponses },
    { label: 'Accueils du jour', value: overview.today.accueils },
    { label: 'Transmis à un agent', value: overview.today.transferts },
  ];

  return (
    <DashPage className="max-w-6xl">
      <DashPageHeader
        title="Steeve"
        subtitle="Copilote, opérateur, activation, clients concernés, budget, journal et boîtes e-mail de l'assistant"
        action={
          <>
            <DashBadge tone={enabled ? 'success' : 'muted'}>Messagerie : {enabled ? 'activé' : 'désactivé'}</DashBadge>
            <DashBadge tone={publicEnabled ? 'success' : 'muted'}>Site public : {publicEnabled ? 'activé' : 'désactivé'}</DashBadge>
          </>
        }
      />

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <SettingsSectionNav sections={sections} value={section} onChange={setSection} label="Sections de Steeve" idPrefix="admin-steeve" />

        <div id="admin-steeve-panel" role="tabpanel" aria-labelledby={`admin-steeve-tab-${section}`} className="grid min-w-0 gap-4">
          {section === 'copilote' && <SteeveCopilotCard />}

          {section === 'propositions' && (
            <GlassSlot>
              <SteeveProposalsCard basePath="/admin" />
            </GlassSlot>
          )}

          {section === 'appels' && <SteeveAppelsCard />}

          {section === 'operateur' && <SteeveOperatorCard />}

          {section === 'activation' && (
            <SettingsCard
              id="steeve-activation"
              icon={Power}
              title="Activation"
              description="Steeve ne répond que là où il est activé. Un agent peut toujours reprendre une conversation."
            >
              <SettingsList>
                <SettingRow htmlFor="steeve-enabled" label="Steeve répond aux clients dans la messagerie" description="Pour les clients choisis ci-dessous (ou tous).">
                  <Switch
                    id="steeve-enabled"
                    checked={draft.steeve_enabled === 'true'}
                    disabled={saving}
                    onCheckedChange={(v) => void save({ steeve_enabled: v ? 'true' : 'false' }, v ? 'Steeve activé' : 'Steeve désactivé')}
                  />
                </SettingRow>
                <SettingRow htmlFor="steeve-public" label="Steeve sur le site public" description="Bulle « Une question ? » pour les visiteurs (informations publiées uniquement).">
                  <Switch
                    id="steeve-public"
                    checked={draft.steeve_public_enabled === 'true'}
                    disabled={saving}
                    onCheckedChange={(v) => void save({ steeve_public_enabled: v ? 'true' : 'false' }, v ? 'Steeve activé sur le site' : 'Steeve retiré du site')}
                  />
                </SettingRow>
                <SettingRow htmlFor="steeve-model" label="Modèle" description="Utilisé pour les réponses aux clients." stackOnMobile>
                  <Select
                    value={draft.steeve_model || 'claude-haiku-5-5'}
                    onValueChange={(v) => void save({ steeve_model: v }, 'Modèle enregistré')}
                  >
                    <SelectTrigger id="steeve-model" className="h-11 w-full rounded-xl sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-haiku-5-5">Claude Haiku 5.5 (économique)</SelectItem>
                      <SelectItem value="claude-sonnet-5-5">Claude Sonnet 5.5 (plus précis, environ 20 × plus cher)</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </SettingsList>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Consommation et activité</h3>
              <dl className={`${SETTINGS_INSET} grid grid-cols-2 gap-x-2 gap-y-1 p-1 xl:grid-cols-4`}>
                {STATS.map((s) => (
                  <div key={s.label} className="min-w-0 p-3">
                    <dt className="text-sm text-muted-foreground">{s.label}</dt>
                    <dd className="mt-0.5 break-words text-[15px] font-semibold tabular-nums text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </SettingsCard>
          )}

          {section === 'clients' && (
            <SettingsCard
              id="steeve-clients"
              icon={Users}
              title="Clients concernés"
              description="Steeve ne lit les e-mails d'un client que si son adresse a été vérifiée (bouton « Vérifier l'adresse »)."
            >
              <div className="space-y-4">
                <RadioGroup
                  value={allClients ? 'all' : 'some'}
                  onValueChange={(v) => void save({ steeve_pilot_client_ids: v === 'all' ? 'all' : pilotIds.join(',') }, 'Clients concernés mis à jour')}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <Label htmlFor="pilot-some" className={`${SETTINGS_INSET} flex min-h-12 cursor-pointer items-center gap-3 px-4 text-[15px] font-medium`}>
                    <RadioGroupItem value="some" id="pilot-some" /> Clients choisis
                  </Label>
                  <Label htmlFor="pilot-all" className={`${SETTINGS_INSET} flex min-h-12 cursor-pointer items-center gap-3 px-4 text-[15px] font-medium`}>
                    <RadioGroupItem value="all" id="pilot-all" /> Tous les clients
                  </Label>
                </RadioGroup>

                {!allClients && (
                  <>
                    {pilot.length === 0 ? (
                      <p className={`${SETTINGS_INSET} p-4 text-sm text-muted-foreground`}>Aucun client choisi pour l'instant.</p>
                    ) : (
                      <ul className={`${SETTINGS_INSET} divide-y divide-border/60`}>
                        {pilot.map((c) => (
                          <li key={c.client_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{fullName(c)}</p>
                              <p className="break-all text-sm text-muted-foreground">{c.email || 'sans e-mail'} · {c.statut || 'statut inconnu'}{c.has_conversation ? '' : ' · pas de conversation'}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {c.email_verifie ? (
                                <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => void verify(c, false)}>
                                  <ShieldCheck className="mr-1 h-4 w-4 text-primary" /> Adresse vérifiée
                                </Button>
                              ) : (
                                <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => void verify(c, true)}>Vérifier l'adresse</Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => void setPilotIds(pilotIds.filter((id) => id !== c.client_id))} aria-label={`Retirer ${fullName(c)}`}>
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
                  <Input className="h-11 rounded-xl" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client (nom ou e-mail)" aria-label="Rechercher un client" />
                  <Button type="submit" variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={searching || query.trim().length < 2} aria-label="Rechercher">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </form>
                {results.length > 0 && (
                  <ul className={`${SETTINGS_INSET} divide-y divide-border/60`}>
                    {results.map((c) => (
                      <li key={c.client_id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{fullName(c)}</p>
                          <p className="break-all text-sm text-muted-foreground">{c.email || 'sans e-mail'} · {c.statut || 'statut inconnu'}</p>
                        </div>
                        {c.in_pilot ? (
                          <DashBadge tone="muted">Déjà concerné</DashBadge>
                        ) : (
                          <Button variant="outline" className="min-h-11 shrink-0" disabled={allClients} onClick={() => void setPilotIds([...pilotIds, c.client_id])}>
                            <UserPlus className="mr-1 h-4 w-4" /> Ajouter
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SettingsCard>
          )}

          {section === 'budget' && (
            <SettingsCard
              id="steeve-budget"
              icon={Wallet}
              title="Budget"
              description="Au-delà d'un plafond, Steeve prévient le client et transmet à son agent (site public : message d'attente). Le site public a son propre budget : il ne peut jamais entamer celui des clients."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const patch: Settings = {};
                  for (const f of BUDGET_FIELDS) if (draft[f.key] !== undefined) patch[f.key] = draft[f.key];
                  void save(patch, 'Budget enregistré');
                }}
              >
                <div className="space-y-6">
                  {BUDGET_GROUPS.map((g) => (
                    <fieldset key={g.title} className="min-w-0">
                      <legend className="mb-3 text-sm font-semibold text-foreground">{g.title}</legend>
                      <div className="grid gap-4 md:grid-cols-2">
                        {BUDGET_FIELDS.filter((f) => g.match(f.key)).map((f) => (
                          <div key={f.key} className="space-y-1.5">
                            <Label htmlFor={f.key}>{capitalize(f.label.replace(g.prefix, ''))}</Label>
                            <Input
                              id={f.key}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step={f.step}
                              className="h-11 rounded-xl"
                              value={draft[f.key] ?? ''}
                              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                {/* Barre d'enregistrement collée en bas sur mobile (formulaire long) */}
                <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-5 rounded-b-[22px] border-t border-border/60 bg-background/85 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:mb-0 sm:flex sm:justify-end sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4 sm:backdrop-blur-none">
                  <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Enregistrer le budget
                  </Button>
                </div>
              </form>
            </SettingsCard>
          )}

          {section === 'journal' && (
            <SettingsCard id="steeve-journal" icon={ClipboardList} title="Journal" description="Les 50 derniers passages de Steeve (réponses et accueils).">
              {journal.length === 0 ? (
                <p className={`${SETTINGS_INSET} p-4 text-sm text-muted-foreground`}>Aucun passage pour l'instant.</p>
              ) : (
                <ul className={`${SETTINGS_INSET} divide-y divide-border/60`}>
                  {journal.map((j) => (
                    <li key={j.run_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {j.client_nom || 'Client'} · {j.kind === 'welcome' ? 'Accueil' : 'Réponse'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {when(j.created_at)} · {j.reason || '—'} · {j.calls} appel(s) · {usd(j.cost_usd)}
                        </p>
                        {j.error && <p className="break-words text-sm text-destructive">{j.error}</p>}
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                        <DashBadge tone={STATUS_TONE[j.status] ?? 'neutral'}>
                          {STATUS_LABEL[j.status] || j.status}
                        </DashBadge>
                        <Button asChild variant="ghost" className="min-h-11">
                          <Link to={`/admin/messagerie?conversationId=${j.conversation_id}`}>
                            <MessagesSquare className="mr-1.5 h-4 w-4" /> Conversation
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SettingsCard>
          )}

          {section === 'boites' && (
            <>
              <SharedMailboxesManager />
              <SteeveAuthServersCard />
            </>
          )}
        </div>
      </div>
    </DashPage>
  );
}
