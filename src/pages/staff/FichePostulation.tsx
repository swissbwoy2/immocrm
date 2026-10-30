import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStoragePath } from '@/lib/documentUtils';
import { cn } from '@/lib/utils';

/**
 * Fiche de postulation : TOUTES les informations utiles à une candidature sur une seule page,
 * sans onglet ni contenu masqué (lisible par la routine de postulation et par un humain).
 * Client principal, co-candidats et garants, infos de postulation, documents, offres + visites + compte rendu.
 * Lecture seule. ?offre=<id> met l'offre concernée en tête.
 */

type Ligne = Record<string, unknown>;

const LIBELLES: Record<string, string> = {
  prenom: 'Prénom', nom: 'Nom', email: 'E-mail', telephone: 'Téléphone', date_naissance: 'Date de naissance',
  nationalite: 'Nationalité', type_permis: 'Permis', etat_civil: 'État civil', situation_familiale: 'Situation familiale',
  adresse: 'Adresse actuelle', profession: 'Profession', employeur: 'Employeur', secteur_activite: 'Secteur',
  type_contrat: 'Type de contrat', source_revenus: 'Source des revenus', anciennete_mois: 'Ancienneté (mois)',
  date_engagement: 'Date d’engagement', revenus_mensuels: 'Revenu mensuel déclaré (net, CHF)',
  charges_mensuelles: 'Charges mensuelles', charges_extraordinaires: 'Charges extraordinaires',
  montant_charges_extra: 'Montant charges extraordinaires', autres_credits: 'Autres crédits', apport_personnel: 'Apport',
  poursuites: 'Poursuites', curatelle: 'Curatelle', gerance_actuelle: 'Gérance / bailleur actuel',
  contact_gerance: 'Contact gérance actuelle', loyer_actuel: 'Loyer actuel (CHF)', depuis_le: 'Locataire depuis le',
  pieces_actuel: 'Pièces actuelles', motif_changement: 'Motif du changement', nombre_occupants: 'Nombre d’occupants',
  animaux: 'Animaux', instrument_musique: 'Instrument de musique', vehicules: 'Véhicule', numero_plaques: 'Plaques',
  utilisation_logement: 'Utilisation du logement', type_recherche: 'Type de recherche', type_bien: 'Type de bien',
  pieces: 'Pièces recherchées', budget_max: 'Budget max (CHF)', region_recherche: 'Région', souhaits_particuliers: 'Souhaits',
  note_agent: 'Note agent', statut: 'Statut', rc_menage: 'Assurance RC ménage', rc_compagnie: 'Compagnie RC',
  parking_souhaite: 'Parking souhaité', nombre_enfants: 'Nombre d’enfants', enfants_ages: 'Âge des enfants',
  statut_logement_actuel: 'Statut dans le logement actuel', mobile_suivi_autorise: 'Mobile de suivi autorisé',
  infos_postulation_completees_at: 'Infos de postulation complétées le', type: 'Rôle', lien_avec_client: 'Lien avec le client',
};

// Champs techniques jamais affichés
const EXCLUS = /^(id|user_id|client_id|agent_id|demande_mandat_id|abaninja_|steeve_|anonymise_|refund_|mandat_signature_data|mandat_pdf_url|commission_split|payslip_|extrait_poursuites_|cancellation_|mandate_|relance_|derniere_relance|journey_type|priorite|etat_avancement|date_ajout|date_changement_statut|mandat_renewal_count|updated_at)$|^(abaninja_|steeve_|anonymise_|refund_|payslip_|extrait_poursuites_|cancellation_|mandate_)/;

function valeur(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(vide)';
  if (v === true) return 'Oui';
  if (v === false) return 'Non';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Champs({ ligne }: { ligne: Ligne }) {
  const cles = Object.keys(ligne).filter((k) => !EXCLUS.test(k));
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {cles.map((k) => (
        <div key={k} className="flex justify-between gap-3 border-b border-border/50 py-1.5 text-sm">
          <dt className="text-muted-foreground">{LIBELLES[k] ?? k}</dt>
          <dd className={cn('text-right font-medium', valeur(ligne[k]) === '(vide)' ? 'text-destructive' : 'text-foreground')}>{valeur(ligne[k])}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-5">
      <h2 className="text-base font-semibold text-foreground">{titre}</h2>
      {children}
    </section>
  );
}

const STATUTS_POSTULATION = ['souhaite_postuler', 'candidature', 'candidature_deposee', 'interesse', 'visite_planifiee', 'visite_effectuee', 'visite_confirmee', 'acceptee'];

export default function FichePostulation() {
  const { id } = useParams<{ id: string }>();
  const lieu = useLocation();
  const scope = lieu.pathname.startsWith('/agent') ? 'agent' : 'admin';
  const offreCible = new URLSearchParams(lieu.search).get('offre');
  const [client, setClient] = useState<Ligne | null>(null);
  const [profil, setProfil] = useState<Ligne | null>(null);
  const [coCandidats, setCoCandidats] = useState<Ligne[]>([]);
  const [documents, setDocuments] = useState<Ligne[]>([]);
  const [offres, setOffres] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setChargement(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: c, error } = await db.from('clients').select('*').eq('id', id).maybeSingle();
      if (error || !c) { setErreur('Client introuvable'); setChargement(false); return; }
      setClient(c);
      const [p, cc, docs, off] = await Promise.all([
        c.user_id ? db.from('profiles').select('prenom, nom, email, telephone').eq('id', c.user_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from('client_candidates').select('*').eq('client_id', id).order('created_at', { ascending: true }),
        db.from('documents').select('id, nom, type, type_document, url, date_upload, candidate_id, taille').eq('client_id', id).order('date_upload', { ascending: false }),
        db.from('offres').select('*, visites(*)').eq('client_id', id).order('updated_at', { ascending: false }).limit(60),
      ]);
      setProfil(p.data ?? null);
      setCoCandidats(cc.data ?? []);
      setDocuments(docs.data ?? []);
      const liste: Ligne[] = (off.data ?? []).filter((o: Ligne) =>
        o.id === offreCible || STATUTS_POSTULATION.includes(String(o.statut ?? '')) || (Array.isArray(o.visites) && (o.visites as unknown[]).length > 0));
      liste.sort((a, b) => (a.id === offreCible ? -1 : b.id === offreCible ? 1 : 0));
      setOffres(liste);
      setChargement(false);
    })();
  }, [id, offreCible]);

  const ouvrirDocument = async (doc: Ligne) => {
    const fenetre = window.open('', '_blank');
    try {
      const url = String(doc.url ?? '');
      let lien = url;
      if (!url.startsWith('data:')) {
        const { data, error } = await supabase.storage.from('client-documents').download(getStoragePath(url));
        if (error || !data) throw error;
        lien = URL.createObjectURL(data);
      }
      if (fenetre) fenetre.location.href = lien; else window.location.href = lien;
    } catch {
      if (fenetre) fenetre.close();
      alert('Document impossible à ouvrir');
    }
  };

  if (chargement) return <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement de la fiche…</p>;
  if (erreur || !client) return <p className="p-6 text-sm text-destructive">{erreur ?? 'Client introuvable'}</p>;

  const nomPersonne = (cid: unknown) => {
    if (!cid) return 'Client principal';
    const k = coCandidats.find((x) => x.id === cid);
    return k ? String(k.prenom ?? '') + ' ' + String(k.nom ?? '') + ' (' + String(k.type ?? 'co-candidat') + ')' : 'Co-candidat';
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={'/' + scope + '/clients/' + id} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Fiche client
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        Fiche de postulation — {String(profil?.prenom ?? '')} {String(profil?.nom ?? '')}
      </h1>
      <p className="text-sm text-muted-foreground">
        Toutes les informations sont sur cette page. Une valeur « (vide) » n’est pas renseignée dans Logisorama.
        Contact de suivi des candidatures : relocation@immo-rama.ch · 021 634 31 61.
      </p>

      <Section titre="Client principal">
        {profil && <Champs ligne={profil} />}
        <Champs ligne={client} />
      </Section>

      <Section titre={'Co-candidats et garants (' + coCandidats.length + ')'}>
        {coCandidats.length === 0
          ? <p className="text-sm text-muted-foreground">Aucun co-candidat ni garant.</p>
          : coCandidats.map((k) => (
            <div key={String(k.id)} className="space-y-2 rounded-xl border border-border/60 p-3">
              <p className="font-medium text-foreground">{String(k.prenom ?? '')} {String(k.nom ?? '')} — {String(k.type ?? 'co-candidat')}</p>
              <Champs ligne={k} />
            </div>
          ))}
      </Section>

      <Section titre={'Documents (' + documents.length + ', du plus récent au plus ancien)'}>
        {documents.length === 0 ? <p className="text-sm text-muted-foreground">Aucun document.</p> : (
          <ul className="divide-y divide-border/60">
            {documents.map((d) => (
              <li key={String(d.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium text-foreground">{String(d.nom ?? 'document')}</span>
                <span className="text-muted-foreground">· {String(d.type_document ?? d.type ?? 'autre')}</span>
                <span className="text-muted-foreground">· {nomPersonne(d.candidate_id)}</span>
                <span className="text-muted-foreground">· chargé le {d.date_upload ? new Date(String(d.date_upload)).toLocaleDateString('fr-CH') : '?'}</span>
                <button type="button" onClick={() => void ouvrirDocument(d)} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titre={'Offres et visites (' + offres.length + ')'}>
        {offres.length === 0 ? <p className="text-sm text-muted-foreground">Aucune offre en cours de postulation.</p> : offres.map((o) => {
          const visites = (Array.isArray(o.visites) ? (o.visites as Ligne[]) : [])
            .slice().sort((a, b) => String(a.date_visite ?? '').localeCompare(String(b.date_visite ?? '')));
          const offreSeule: Ligne = { ...o };
          delete offreSeule.visites;
          return (
            <div key={String(o.id)} className={cn('space-y-3 rounded-xl border p-3', o.id === offreCible ? 'border-primary' : 'border-border/60')}>
              <p className="font-medium text-foreground">
                {o.id === offreCible ? 'OFFRE CONCERNÉE — ' : ''}{String(o.adresse ?? 'Adresse inconnue')} — statut {String(o.statut ?? '?')}
              </p>
              <p className="text-xs text-muted-foreground">Identifiant offre : {String(o.id)}</p>
              {o.lien_annonce ? <a href={String(o.lien_annonce)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Annonce : {String(o.lien_annonce)}</a> : null}
              <Champs ligne={offreSeule} />
              {visites.length === 0 ? <p className="text-sm text-muted-foreground">Aucune visite.</p> : visites.map((v, i) => (
                <div key={String(v.id)} className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Visite {i + 1}{i === 0 ? ' (première)' : ''} — {v.date_visite ? new Date(String(v.date_visite)).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' }) : 'date inconnue'} — {String(v.statut ?? '')}
                  </p>
                  {v.compte_rendu ? (
                    <pre className="whitespace-pre-wrap break-words text-xs text-foreground">{JSON.stringify(v.compte_rendu, null, 2)}</pre>
                  ) : <p className="text-xs text-muted-foreground">Pas de compte rendu.</p>}
                  {Array.isArray(v.medias) && (v.medias as Ligne[]).length > 0 && (
                    <ul className="list-disc pl-5 text-xs">
                      {(v.medias as Ligne[]).map((m, j) => (
                        <li key={j}>
                          {m.url ? <a href={String(m.url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{String(m.name ?? m.nom ?? m.type ?? 'fichier')}</a> : String(m.name ?? m.nom ?? 'fichier')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </Section>
    </main>
  );
}
