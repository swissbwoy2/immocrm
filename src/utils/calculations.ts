// Fonctions de calcul pour ImmoCRM

// Jours écoulés depuis inscription (retourne le nombre exact avec décimales)
// Si endDate est fourni, calcule jusqu'à cette date au lieu de maintenant (pour figer le compteur)
export function calculateDaysElapsed(dateInscription: string, endDate?: string | null): number {
  const start = new Date(dateInscription);
  const end = endDate ? new Date(endDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return diffTime / (1000 * 60 * 60 * 24); // Retourne le nombre exact, pas arrondi
}

// Jours restants sur le mandat (90 jours)
// Si endDate est fourni, utilise cette date pour calculer les jours restants (figé)
export function calculateDaysRemaining(dateInscription: string, endDate?: string | null): number {
  const elapsed = calculateDaysElapsed(dateInscription, endDate);
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

// Calcul durée mandat avec détails
export function calculateMandateDuration(dateInscription: string): {
  daysElapsed: number;
  daysRemaining: number;
  progressPercentage: number;
} {
  const daysElapsed = calculateDaysElapsed(dateInscription);
  const daysRemaining = Math.max(0, 90 - daysElapsed);
  const progressPercentage = Math.min(100, Math.round((daysElapsed / 90) * 100));
  
  return {
    daysElapsed,
    daysRemaining,
    progressPercentage,
  };
}

// Format statut offre pour badge
export function formatStatutOffre(statut: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
    'envoyee': { label: 'Envoyée', variant: 'secondary' },
    'vue': { label: 'Vue', variant: 'secondary' },
    'interesse': { label: 'Intéressé', variant: 'default' },
    'visite_planifiee': { label: 'Visite planifiée', variant: 'default' },
    'visite_effectuee': { label: 'Visite effectuée', variant: 'default' },
    'candidature_deposee': { label: 'Candidature déposée', variant: 'default' },
    'acceptee': { label: 'Acceptée', variant: 'default' },
    'refusee': { label: 'Refusée', variant: 'destructive' },
  };
  return statusMap[statut] || { label: statut, variant: 'secondary' };
}
