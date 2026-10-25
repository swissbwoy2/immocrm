/**
 * Modèle de la page « Demandes d'activation » : une file de travail par étape.
 * À traiter (facturer ou activer) → Paiement attendu (facture envoyée) → Comptes inactifs → Activées → Autres.
 * Fonctions pures, calculées à partir des données déjà chargées (aucune requête ici).
 */

export interface DemandeMandat {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  statut: string;
  created_at: string;
  type_recherche: string;
  montant_acompte: number;
  revenus_mensuels: number;
  budget_max: number;
  region_recherche: string;
  date_paiement: string | null;
  abaninja_invoice_id: string | null;
  abaninja_invoice_ref: string | null;
  [key: string]: any;
}

export interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  actif: boolean;
  created_at: string;
}

export type Etape = 'a_traiter' | 'paiement' | 'comptes' | 'activees' | 'autres';
export type Ton = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
/** Action principale proposée par la carte (le bouton mis en avant). */
export type ActionPrincipale = 'facturer' | 'payer' | 'renvoyer' | 'activer' | 'aucune';

/** Libellés de statut (identiques à l'ancienne page). */
export const STATUT_LABEL: Record<string, { label: string; tone: Ton }> = {
  en_attente: { label: 'En attente', tone: 'danger' },
  facture_envoyee: { label: 'Facture envoyée', tone: 'neutral' },
  paye: { label: 'Payé - À activer', tone: 'success' },
  active: { label: 'Activé', tone: 'muted' },
};

/** Seuils d'attente : une demande à traiter est en retard après 48 h, une facture impayée après 7 jours. */
export const SEUIL_TRAITEMENT_H = 48;
export const SEUIL_PAIEMENT_H = 7 * 24;

export function etapeDemande(d: DemandeMandat): Etape {
  switch (d.statut) {
    case 'en_attente':
    case 'paye':
      return 'a_traiter';
    case 'facture_envoyee':
      return 'paiement';
    case 'active':
      return 'activees';
    default:
      return 'autres';
  }
}

/** Date de référence de l'attente : paiement reçu pour « payé », sinon dernière mise à jour connue, sinon soumission. */
function dateReference(d: DemandeMandat): string {
  if (d.statut === 'paye' && d.date_paiement) return d.date_paiement;
  if (d.statut === 'facture_envoyee' && d.updated_at) return d.updated_at as string;
  return d.created_at;
}

export function libelleDuree(heures: number): string {
  if (heures < 1) return 'à l’instant';
  if (heures < 24) return `depuis ${heures} h`;
  const j = Math.floor(heures / 24);
  return `depuis ${j} j`;
}

export function attente(d: DemandeMandat, now = Date.now()): { heures: number; label: string; enRetard: boolean } {
  const t = new Date(dateReference(d)).getTime();
  const heures = Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 3600000)) : 0;
  const etape = etapeDemande(d);
  const seuil = etape === 'a_traiter' ? SEUIL_TRAITEMENT_H : etape === 'paiement' ? SEUIL_PAIEMENT_H : Infinity;
  return { heures, label: libelleDuree(heures), enRetard: heures >= seuil };
}

export function attenteProfil(p: Profile, now = Date.now()): { heures: number; label: string; enRetard: boolean } {
  const t = new Date(p.created_at).getTime();
  const heures = Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 3600000)) : 0;
  return { heures, label: libelleDuree(heures), enRetard: heures >= SEUIL_TRAITEMENT_H };
}

export type Prochaine = { texte: string; tone: Ton; principale: ActionPrincipale };

/** Formule UNE prochaine action pour la demande. */
export function prochaineAction(d: DemandeMandat, now = Date.now()): Prochaine {
  const att = attente(d, now);
  switch (d.statut) {
    case 'en_attente':
      return {
        texte: att.enRetard
          ? `Demande en attente ${att.label} : vérifier le dossier puis facturer`
          : 'Vérifier le dossier puis envoyer la facture',
        tone: att.enRetard ? 'warning' : 'primary',
        principale: 'facturer',
      };
    case 'paye':
      return {
        texte: att.enRetard ? `Payé ${att.label} : activer le compte sans attendre` : 'Paiement reçu : activer le compte',
        tone: att.enRetard ? 'warning' : 'success',
        principale: 'activer',
      };
    case 'facture_envoyee':
      return att.enRetard
        ? { texte: `Facture impayée ${att.label} : relancer le client (renvoyer la facture)`, tone: 'warning', principale: d.abaninja_invoice_id ? 'renvoyer' : 'payer' }
        : { texte: 'En attente du paiement : marquer payé dès réception', tone: 'neutral', principale: 'payer' };
    case 'active':
      return { texte: 'Compte activé', tone: 'success', principale: 'aucune' };
    default:
      return { texte: `Statut « ${d.statut} » : aucune action prévue`, tone: 'muted', principale: 'aucune' };
  }
}

/** Ordre d'urgence dans « À traiter » : payées (à activer) d'abord, puis les plus anciennes. */
export function rangUrgence(d: DemandeMandat): number {
  if (d.statut === 'paye') return 0;
  if (d.statut === 'en_attente') return 1;
  if (d.statut === 'facture_envoyee') return attente(d).enRetard ? 2 : 3;
  return 4;
}

export function nomComplet(x: { prenom?: string | null; nom?: string | null; email?: string | null }): string {
  const n = `${x.prenom ?? ''} ${x.nom ?? ''}`.trim();
  return n || x.email || 'Client';
}

export function nbDocuments(d: DemandeMandat): number {
  return Array.isArray(d.documents_uploades) ? d.documents_uploades.length : 0;
}

export function texteRecherche(d: DemandeMandat): string {
  return `${d.prenom ?? ''} ${d.nom ?? ''} ${d.email ?? ''} ${d.telephone ?? ''} ${d.region_recherche ?? ''} ${d.abaninja_invoice_ref ?? ''}`.toLowerCase();
}
