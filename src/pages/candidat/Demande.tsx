import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCandidatCandidatures } from '@/hooks/useCandidatCandidatures';
import { notifyPostulationRequest } from '@/lib/postulationRequest';

const ETAT_CIVIL = ['Célibataire', 'Marié(e)', 'Partenariat enregistré', 'Divorcé(e)', 'Veuf/Veuve', 'Séparé(e)'];
const PERMIS = ['B', 'C', 'D', 'L', 'G', 'F', 'N', 'S', 'Aucun'];
const EMPLOI = ['Employé(e)', 'Indépendant(e)', 'Étudiant(e)', "Pas d'occupation", 'Sans emploi', 'Retraité(e)', "Pension d'invalidité"];
const SALAIRE = ["moins de 30'000", "30'000-40'000", "40'000-50'000", "50'000-60'000", "60'000-70'000", "70'000-80'000", "80'000-90'000", "90'000-100'000", "100'000-120'000", "120'000-140'000", "140'000-160'000", "160'000-200'000", "200'000-250'000", "plus de 250'000"];
const CONTRAT = ['Durée déterminée', 'Durée indéterminée'];
const OUI_NON = ['Oui', 'Non'];
const PAYS_TOP = ['Suisse', 'Liechtenstein', 'Allemagne', 'Autriche'];
const PAYS = ['Afghanistan', 'Albanie', 'Algérie', 'Andorre', 'Angola', 'Argentine', 'Arménie', 'Australie', 'Azerbaïdjan', 'Belgique', 'Bénin', 'Biélorussie', 'Bolivie', 'Bosnie-Herzégovine', 'Brésil', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cameroun', 'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Congo', 'Congo (RDC)', 'Corée du Sud', "Côte d'Ivoire", 'Croatie', 'Cuba', 'Danemark', 'Égypte', 'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'États-Unis', 'Éthiopie', 'Finlande', 'France', 'Gabon', 'Géorgie', 'Ghana', 'Grèce', 'Guinée', 'Haïti', 'Hongrie', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande', 'Islande', 'Israël', 'Italie', 'Japon', 'Kenya', 'Kosovo', 'Lettonie', 'Liban', 'Lituanie', 'Luxembourg', 'Macédoine du Nord', 'Madagascar', 'Mali', 'Malte', 'Maroc', 'Maurice', 'Mexique', 'Moldavie', 'Monaco', 'Monténégro', 'Niger', 'Nigeria', 'Norvège', 'Pakistan', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Marin', 'Sénégal', 'Serbie', 'Slovaquie', 'Slovénie', 'Somalie', 'Sri Lanka', 'Suède', 'Syrie', 'Tchad', 'Tchéquie', 'Thaïlande', 'Togo', 'Tunisie', 'Turquie', 'Ukraine', 'Uruguay', 'Venezuela', 'Vietnam', 'Autre'];

type Personne = Record<string, string>;
const P_FIELDS: { k: string; l: string; req?: boolean; type?: string; opts?: string[]; note?: string }[] = [
  { k: 'prenom', l: 'Prénom', req: true, note: 'Tel que figurant sur le passeport / la carte d’identité' },
  { k: 'nom', l: 'Nom', req: true, note: 'Tel que figurant sur le passeport / la carte d’identité' },
  { k: 'etat_civil', l: 'État civil', opts: ETAT_CIVIL },
  { k: 'date_naissance', l: 'Date de naissance', req: true, type: 'date' },
  { k: 'nationalite', l: 'Nationalité', opts: [...PAYS_TOP, ...PAYS] },
  { k: 'permis', l: 'Permis de séjour', opts: PERMIS },
  { k: 'portable', l: 'Numéro de portable personnel', req: true, type: 'tel', note: 'Indispensable pour la signature numérique' },
  { k: 'tel_bureau', l: 'Numéro de téléphone du bureau', type: 'tel' },
  { k: 'email', l: 'Adresse e-mail', req: true, type: 'email' },
  { k: 'adresse', l: 'Adresse', req: true },
  { k: 'npa', l: 'Code postal', req: true },
  { k: 'ville', l: 'Ville', req: true },
  { k: 'pays', l: 'Pays', req: true, opts: [...PAYS_TOP, ...PAYS] },
  { k: 'bailleur_actuel', l: 'Nom du bailleur actuel / gérance actuelle', req: true },
  { k: 'bailleur_ref_nom', l: 'Personne de référence bailleur' },
  { k: 'bailleur_ref_tel', l: 'Tél. réf. bailleur', type: 'tel' },
  { k: 'bailleur_ref_email', l: 'E-mail réf. bailleur', type: 'email' },
  { k: 'statut_emploi', l: "Statut d'emploi", req: true, opts: EMPLOI },
  { k: 'profession', l: 'Profession', req: true },
  { k: 'salaire_annuel', l: 'Salaire brut annuel (CHF)', req: true, opts: SALAIRE },
  { k: 'employeur', l: 'Employeur', req: true },
  { k: 'employe_depuis', l: 'Employé depuis', req: true, type: 'date' },
  { k: 'employeur_ref_nom', l: 'Personne de référence employeur', req: true },
  { k: 'employeur_ref_tel', l: 'Tél. réf. employeur', req: true, type: 'tel' },
  { k: 'employeur_ref_email', l: 'E-mail réf. employeur', type: 'email' },
  { k: 'contrat', l: 'Contrat', req: true, opts: CONTRAT },
  { k: 'poursuites', l: 'Poursuites au cours des 2 dernières années ?', req: true, opts: OUI_NON },
];
const G_FIELDS: { k: string; l: string; req?: boolean; type?: string; opts?: string[] }[] = [
  { k: 'raison_demenagement', l: 'Raison du déménagement' },
  { k: 'adultes', l: 'Adultes (nombre total)', req: true, type: 'number' },
  { k: 'enfants', l: 'Enfants (nombre total)', req: true, type: 'number' },
  { k: 'residence_principale', l: 'Résidence principale ?', opts: OUI_NON },
  { k: 'animaux', l: 'Animaux domestiques ?', opts: OUI_NON },
  { k: 'parking', l: 'Intéressé par un parking ?', req: true, opts: OUI_NON },
  { k: 'date_entree', l: "Date d'entrée souhaitée", req: true, type: 'date' },
];

const chf = (v: any) => (v == null || v === '' ? '—' : `CHF ${Number(v).toLocaleString('fr-CH')}.-`);
const DEPOSE = ['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises'];

function Field({ f, value, onChange, id }: { f: { k: string; l: string; req?: boolean; type?: string; opts?: string[]; note?: string }; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{f.l}{f.req && ' *'}</Label>
      {f.opts ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>{f.opts.map((o, i) => <SelectItem key={`${o}-${i}`} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input id={id} type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} className="min-h-[44px]" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
    </div>
  );
}

export default function CandidatDemande() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const candId = sp.get('candidature');
  const { data: candidatures = [] } = useCandidatCandidatures();
  const eligibles = candidatures.filter((c) => c.source === 'location' && !c.annulee && !DEPOSE.includes(c.statut) && !['refusee', 'desiste'].includes(c.statut));

  const [loading, setLoading] = useState(!!candId);
  const [annonce, setAnnonce] = useState<any>(null);
  const [cand, setCand] = useState<any>(null);
  const [principal, setPrincipal] = useState<Personne>({});
  const [co, setCo] = useState<Personne[]>([]);
  const [gen, setGen] = useState<Personne>({ adultes: '1', enfants: '0' });
  const [commentaires, setCommentaires] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!candId || !user?.id) return;
    setLoading(true);
    (async () => {
      const [{ data: r }, { data: prof }, { data: crit }] = await Promise.all([
        (supabase as any).from('candidatures_location').select('*, annonces_publiques(*)').eq('id', candId).maybeSingle(),
        (supabase as any).from('profiles').select('prenom, nom, telephone, email').eq('id', user.id).maybeSingle(),
        (supabase as any).from('candidat_criteres').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      setCand(r);
      setAnnonce(r?.annonces_publiques ?? null);
      const saved = (r?.demande_data ?? {}) as any;
      const base: Personne = {
        prenom: r?.prenom || prof?.prenom || '', nom: r?.nom || prof?.nom || '',
        date_naissance: r?.date_naissance || '', nationalite: r?.nationalite || '', permis: r?.type_permis || '',
        portable: r?.telephone || prof?.telephone || '', email: r?.email || prof?.email || user.email || '',
        adresse: r?.adresse_actuelle || '', profession: r?.profession || '', employeur: r?.employeur || '',
        pays: 'Suisse', poursuites: crit?.poursuites === true ? 'Oui' : crit?.poursuites === false ? 'Non' : '',
      };
      setPrincipal({ ...base, ...(saved.locataire_principal ?? {}) });
      setCo(Array.isArray(saved.co_candidats) ? saved.co_candidats : []);
      setGen({
        adultes: String(r?.nombre_occupants || crit?.nombre_occupants || 1), enfants: '0',
        raison_demenagement: r?.motif_changement || '', date_entree: crit?.date_entree_souhaitee || '',
        animaux: crit?.details?.animaux ? 'Oui' : '', ...(saved.general ?? {}),
      });
      setCommentaires(saved.commentaires ?? '');
      setLoading(false);
    })();
  }, [candId, user?.id]);

  if (!candId) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
          <h1 className="text-2xl font-bold text-foreground">Demande de location</h1>
          <Card><CardContent className="space-y-3 p-4">
            {eligibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Réservez et effectuez d'abord une visite pour pouvoir déposer une demande de location.</p>
            ) : (
              <>
                <Label>Choisir le logement visité</Label>
                <Select onValueChange={(v) => setSp({ candidature: v })}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{eligibles.map((c) => <SelectItem key={c.id} value={c.id}>{c.adresse}</SelectItem>)}</SelectContent>
                </Select>
              </>
            )}
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const deja = cand && DEPOSE.includes(cand.statut);
  const a = annonce ?? {};
  const charges = Number(a.charges_mensuelles) || 0;
  const brut = a.prix != null ? Number(a.prix) + (a.charges_comprises ? 0 : charges) : null;
  const net = a.prix != null ? Number(a.prix) - (a.charges_comprises ? charges : 0) : null;
  const header: [string, string][] = [
    ['Adresse', [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'],
    ['Loyer brut', chf(brut)], ['Référence', a.reference || '—'], ['Charges', chf(charges || null)],
    ['Étage', a.etage != null ? String(a.etage) : '—'], ['Loyer net', chf(net)],
    ['Pièces', a.nombre_pieces != null ? String(a.nombre_pieces) : '—'], ['Surface', a.surface_habitable ? `${a.surface_habitable} m²` : '—'],
    ['Disponibilité', a.disponible_immediatement ? 'Immédiatement' : a.disponible_des ? new Date(a.disponible_des).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—'],
  ];

  const buildData = () => ({ locataire_principal: principal, co_candidats: co, general: gen, commentaires });

  const validate = () => {
    const errs: string[] = [];
    [principal, ...co].forEach((p, i) => P_FIELDS.filter((f) => f.req && !String(p[f.k] ?? '').trim()).forEach((f) => errs.push(`${i === 0 ? 'Locataire principal' : `Personne ${i + 1}`} : ${f.l}`)));
    G_FIELDS.filter((f) => f.req && !String(gen[f.k] ?? '').trim()).forEach((f) => errs.push(`Renseignements généraux : ${f.l}`));
    setErrors(errs);
    if (errs.length) { toast.error('Veuillez compléter les champs obligatoires'); window.scrollTo({ top: 0, behavior: 'smooth' }); return false; }
    return true;
  };

  const submit = async () => {
    if (!c1 || !c2 || sending) return;
    setSending(true);
    const { error } = await (supabase as any).rpc('candidat_soumettre_demande', {
      p_candidature_id: candId, p_data: buildData(), p_confirme_pret_louer: true, p_autorise_references: true,
    });
    if (error) { setSending(false); return toast.error(error.message); }
    try {
      await notifyPostulationRequest({ address: a.adresse || '', displayName: `${principal.prenom ?? ''} ${principal.nom ?? ''}`.trim() || 'Un candidat' });
    } catch { /* best-effort */ }
    setSending(false);
    setConfirmOpen(false);
    toast.success('Formulaire de candidature envoyé');
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
    navigate('/candidat/candidatures');
  };

  const setP = (i: number, k: string, v: string) => (i === 0 ? setPrincipal((p) => ({ ...p, [k]: v })) : setCo((l) => l.map((x, j) => (j === i - 1 ? { ...x, [k]: v } : x))));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">Demande de location</h1>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{a.titre || 'Objet'}</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {header.map(([k, v]) => <div key={k} className={k === 'Adresse' ? 'col-span-2 sm:col-span-3' : ''}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium text-foreground">{v}</dd></div>)}
            </dl>
          </CardContent>
        </Card>

        {deja && <Card><CardContent className="p-4 text-sm text-muted-foreground">Votre formulaire de candidature a déjà été envoyé pour cet objet.</CardContent></Card>}

        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-semibold">Champs obligatoires manquants :</p>
            <ul className="list-disc pl-5">{errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        {[principal, ...co].map((p, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{i === 0 ? 'Locataire principal' : `Autre personne ${i}`}</CardTitle>
              {i > 0 && <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setCo((l) => l.filter((_, j) => j !== i - 1))}><Trash2 className="h-4 w-4" /></Button>}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {P_FIELDS.map((f) => <Field key={f.k} id={`p${i}-${f.k}`} f={f} value={p[f.k] ?? ''} onChange={(v) => setP(i, f.k, v)} />)}
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" className="min-h-[44px] w-full" onClick={() => setCo((l) => [...l, { pays: 'Suisse' }])}><Plus className="mr-2 h-4 w-4" />Ajouter autre personne</Button>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Renseignements généraux</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {G_FIELDS.map((f) => <Field key={f.k} id={`g-${f.k}`} f={f} value={gen[f.k] ?? ''} onChange={(v) => setGen((g) => ({ ...g, [f.k]: v }))} />)}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="g-comm">Commentaires</Label>
              <Textarea id="g-comm" rows={4} value={commentaires} onChange={(e) => setCommentaires(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 p-4 backdrop-blur md:mx-0 md:rounded-lg md:border">
          <Button className="min-h-[48px] w-full" disabled={!!deja} onClick={() => validate() && setConfirmOpen(true)}>Envoyer le formulaire de candidature</Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !sending && setConfirmOpen(o)}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Soumettre formulaire de candidature ?</DialogTitle>
            <DialogDescription>Le formulaire de candidature sera envoyé à l'annonceur. Veuillez confirmer :</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            <p>Cette demande de location est sans engagement de part et d'autre. La régie se réserve le droit de l'accepter ou de la refuser sans avoir à en indiquer les motifs. Si le candidat locataire se retire après l'établissement du contrat de bail convenu, il doit s'acquitter d'une indemnité qui se monte à 10% du loyer mensuel brut mais au minimum de CHF 100.- (TVA non comprise) pour couvrir les frais administratifs dus à son désistement (art. 82 LP).</p>
            <p>Si votre candidature est sélectionnée sur la base du présent formulaire, nous vous demanderons de produire les pièces justificatives suivantes avant d'établir un contrat :</p>
            <ul className="list-none space-y-0.5">
              <li>• 3 dernières fiches de salaire ou autre(s) document(s) attestant des revenus</li>
              <li>• Copie d'une pièce d'identité et si applicable copie du permis de séjour</li>
              <li>• Extrait original du registre des poursuites ou CreditTrust</li>
              <li>• Attestation d'assurance RC</li>
            </ul>
            <p>Le représentant du bailleur agissant en tant que responsable du traitement, respectivement sous-traitant autorisé, traite les données qui lui sont fournies par les candidats locataires dans le cadre du mandat de gestion et de commercialisation des biens immobiliers qui lui sont confiés par la société propriétaire. Vous trouverez toutes les informations relatives à notre politique de protection des données sur le site de l'annonceur.</p>
          </div>
          <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={c1} onCheckedChange={(v) => setC1(v === true)} />Je confirme que j'ai visité la propriété et que je suis prêt(e) à la louer aux conditions indiquées.</label>
          <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5" checked={c2} onCheckedChange={(v) => setC2(v === true)} />J'accorde à l'annonceur le droit de chercher des références sur le candidat auprès de son employeur et bailleur.</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="min-h-[44px] flex-1" disabled={sending} onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button className="min-h-[44px] flex-1" disabled={!c1 || !c2 || sending} onClick={submit}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Soumettre</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
