// Fonctions de calcul pour ImmoCRM

// Jours écoulés depuis inscription
export function calculateDaysElapsed(dateInscription: string): number {
  const start = new Date(dateInscription);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Jours restants sur le mandat (90 jours)
export function calculateDaysRemaining(dateInscription: string): number {
  const elapsed = calculateDaysElapsed(dateInscription);
  return 90 - elapsed;
}

// Format temps restant
export function formatTimeRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return '0j 0h 0m';
  const days = Math.floor(daysRemaining);
  const hours = Math.floor((daysRemaining - days) * 24);
  const minutes = Math.floor(((daysRemaining - days) * 24 - hours) * 60);
  return `${days}j ${hours}h ${minutes}m`;
}

// Couleur barre de progression
export function getProgressColor(daysElapsed: number): string {
  if (daysElapsed < 60) return 'bg-success';
  if (daysElapsed < 90) return 'bg-warning';
  return 'bg-destructive';
}

// Budget recommandé (règle du tiers)
export function calculateBudgetRecommande(revenuMensuel: number): number {
  return Math.round(revenuMensuel / 3);
}

// Calcul commission
export function calculateCommission(loyerBrut: number, splitAgent: number) {
  const commissionBrute = loyerBrut; // 1 mois de loyer
  const partAgent = Math.round(commissionBrute * (splitAgent / 100));
  const partAgence = commissionBrute - partAgent;
  return { commissionBrute, partAgent, partAgence };
}

// Statistiques client
export function getClientStats(clientId: string, offres: any[]) {
  const clientOffres = offres.filter(o => o.clientId === clientId);

  return {
    offresRecues: clientOffres.length,
    offresNonVues: clientOffres.filter(o => o.statut === 'envoyee').length,
    visitesAVenir: clientOffres.filter(o =>
      o.statut === 'visite_planifiee' &&
      o.visiteConfirmee &&
      new Date(o.visiteConfirmee.date) >= new Date()
    ).length,
    visitesEffectuees: clientOffres.filter(o =>
      ['visite_effectuee', 'candidature_deposee', 'acceptee', 'refusee'].includes(o.statut)
    ).length,
    candidaturesDeposees: clientOffres.filter(o => o.candidature).length,
    candidaturesEnAttente: clientOffres.filter(o =>
      o.candidature?.resultat === 'en_attente'
    ).length,
    candidaturesAcceptees: clientOffres.filter(o =>
      o.candidature?.resultat === 'acceptee'
    ).length,
    candidaturesRefusees: clientOffres.filter(o =>
      o.candidature?.resultat === 'refusee'
    ).length,
  };
}

// Prochaines visites
export function getProchainesVisites(clientId: string, offres: any[]) {
  return offres
    .filter(o =>
      o.clientId === clientId &&
      o.statut === 'visite_planifiee' &&
      o.visiteConfirmee
    )
    .map(o => ({
      offreId: o.id,
      date: o.visiteConfirmee.date,
      heure: o.visiteConfirmee.heure,
      adresse: o.localisation,
      prix: o.prix,
      surface: o.surface,
      nombrePieces: o.nombrePieces,
      codeImmeuble: o.codeImmeuble,
      concierge: o.conciergeNom,
      conciergeTel: o.conciergeTel,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Candidatures
export function getCandidatures(clientId: string, offres: any[]) {
  return offres
    .filter(o => o.clientId === clientId && o.candidature)
    .map(o => ({
      offreId: o.id,
      localisation: o.localisation,
      prix: o.prix,
      surface: o.surface,
      nombrePieces: o.nombrePieces,
      dateDepot: o.candidature.dateDepot,
      gerance: o.candidature.gerance,
      resultat: o.candidature.resultat,
      dateResultat: o.candidature.dateResultat,
      commentaire: o.candidature.commentaire,
    }))
    .sort((a, b) => new Date(b.dateDepot).getTime() - new Date(a.dateDepot).getTime());
}

// Statut pour affichage
export function getStatutLabel(statut: string): string {
  const labels: { [key: string]: string } = {
    'envoyee': 'Envoyée',
    'vue': 'Vue',
    'interesse': 'Intéressé',
    'visite_planifiee': 'Visite planifiée',
    'visite_effectuee': 'Visite effectuée',
    'candidature_deposee': 'Candidature déposée',
    'acceptee': 'Acceptée',
    'refusee': 'Refusée',
  };
  return labels[statut] || statut;
}

// Couleur badge statut
export function getStatutColor(statut: string): string {
  const colors: { [key: string]: string } = {
    'envoyee': 'bg-blue-100 text-blue-700',
    'vue': 'bg-purple-100 text-purple-700',
    'interesse': 'bg-cyan-100 text-cyan-700',
    'visite_planifiee': 'bg-yellow-100 text-yellow-700',
    'visite_effectuee': 'bg-orange-100 text-orange-700',
    'candidature_deposee': 'bg-indigo-100 text-indigo-700',
    'acceptee': 'bg-success/10 text-success',
    'refusee': 'bg-destructive/10 text-destructive',
  };
  return colors[statut] || 'bg-muted text-muted-foreground';
}
