/**
 * Note de suivi d'une offre (offres.commentaires), telle que le client peut la lire.
 *
 * Le champ est visible par le client. Les routines et les agents y écrivent une
 * note courte de suivi (« Visite du 20.10.2026 passée : annonceur recontacté
 * pour une nouvelle date, en attente. »). Les anciennes notes techniques
 * (score, source, routine, consignes internes) ne doivent jamais apparaître
 * côté client : elles sont filtrées ici, sans toucher aux données.
 */
const NOTE_INTERNE = [
  /score\s*:?\s*\d+\s*\/\s*100/i,
  /\boffre auto\b/i,
  /\broutine\b/i,
  /appel requis/i,
  /doublon/i,
  /\[\s*retir/i,
  /enrichissement/i,
  /supprimer/i,
  /non lisible/i,
  /manuellement/i,
  /^\s*source\s*:/i,
  /\(\s*k\s*\)/i,
  /compte agence/i,
  /needs_agent_action|client_id|offre_id/i,
];

export function noteSuiviClient(commentaires?: string | null): string | null {
  const note = (commentaires ?? '').trim();
  if (!note) return null;
  if (NOTE_INTERNE.some((re) => re.test(note))) return null;
  return note;
}
