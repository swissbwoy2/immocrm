/**
 * Calcule le pourcentage de chances d'obtenir un appartement
 * et génère des conseils personnalisés
 */

export interface ChanceResult {
  percentage: number;
  color: string;
  label: string;
  conseils: string[];
  criteres: {
    visiteDone: boolean;
    candidatureDeposee: boolean;
    revenusOk: boolean;
    documentsComplets: boolean;
    permisOk: boolean;
  };
}

export interface ClientData {
  revenus_mensuels: number | null;
  residence: string | null;
  type_permis: string | null;
}

export interface DocumentsData {
  fiche_salaire: number;
  extrait_poursuites: number;
  piece_identite: number;
  permis_sejour: number;
}

export const calculateChances = (
  offre: any,
  clientData: ClientData | null,
  documents: DocumentsData,
  visites: any[]
): ChanceResult => {
  let percentage = 0;
  const conseils: string[] = [];

  // Vérifier si visite effectuée
  const visiteDone = visites.some(
    v => v.offre_id === offre.id && v.statut === 'effectuee'
  );
  const visitePlanifiee = visites.some(
    v => v.offre_id === offre.id && v.statut === 'planifiee'
  );

  // Vérifier si candidature déposée
  const candidatureDeposee = offre.statut === 'candidature_deposee';

  // Critères de base (max 100%)
  if (visiteDone) {
    percentage += 25;
  } else if (visitePlanifiee) {
    percentage += 10;
    conseils.push("📅 Effectuez la visite pour augmenter vos chances de 15%");
  } else {
    conseils.push("⚠️ Planifiez une visite - essentiel pour obtenir l'appartement");
  }

  if (candidatureDeposee) {
    percentage += 30;
  } else if (visiteDone) {
    conseils.push("📝 Déposez votre candidature pour augmenter vos chances de 30%");
  }

  // Vérification des revenus (30%)
  const loyer = offre.prix || 0;
  const revenus = clientData?.revenus_mensuels || 0;
  const revenusOk = revenus >= loyer * 3;

  if (revenusOk) {
    percentage += 30;
  } else if (revenus > 0) {
    const ratio = (revenus / loyer).toFixed(1);
    const required = (loyer * 3).toLocaleString();
    conseils.push(
      `💰 Vos revenus (${ratio}x le loyer) sont insuffisants. Solution: trouvez un garant avec des revenus ≥ ${required} CHF/mois (3x le loyer)`
    );
    // Bonus partiel si proche de 3x
    if (revenus >= loyer * 2.5) {
      percentage += 15;
      conseils.push("✅ Avec un bon garant, vos chances augmentent considérablement");
    } else if (revenus >= loyer * 2) {
      percentage += 10;
    }
  } else {
    conseils.push(
      `💰 Revenus non renseignés. Pour ce loyer de ${loyer.toLocaleString()} CHF, vous devez gagner au moins ${(loyer * 3).toLocaleString()} CHF/mois`
    );
  }

  // Vérification du permis de séjour (10%)
  const permisValides = ['Permis C', 'Permis B', 'Permis L', 'Citoyen Suisse'];
  const permisOk = clientData?.residence && permisValides.includes(clientData.residence);

  if (permisOk) {
    percentage += 10;
  } else {
    conseils.push("📄 Assurez-vous d'avoir un permis de séjour valide en Suisse");
    if (clientData?.residence === 'Permis frontalier G') {
      percentage += 5;
      conseils.push("ℹ️ Avec un permis G, certains bailleurs peuvent demander des garanties supplémentaires");
    }
  }

  // Vérification des documents (5%)
  const documentsRequis = ['fiche_salaire', 'extrait_poursuites', 'piece_identite'];
  const documentsManquants: string[] = [];

  if (!documents.fiche_salaire || documents.fiche_salaire === 0) {
    documentsManquants.push("Fiches de salaire (3 derniers mois)");
  }
  if (!documents.extrait_poursuites || documents.extrait_poursuites === 0) {
    documentsManquants.push("Extrait des poursuites");
  }
  if (!documents.piece_identite || documents.piece_identite === 0) {
    documentsManquants.push("Pièce d'identité");
  }
  if (clientData?.residence !== 'Citoyen Suisse' && (!documents.permis_sejour || documents.permis_sejour === 0)) {
    documentsManquants.push("Permis de séjour");
  }

  const documentsComplets = documentsManquants.length === 0;

  if (documentsComplets) {
    percentage += 5;
  } else {
    conseils.push(
      `📂 Documents manquants: ${documentsManquants.join(', ')}. Complétez votre dossier pour augmenter vos chances.`
    );
  }

  // Message de motivation si non présent
  if (candidatureDeposee && !conseils.some(c => c.includes('motivation'))) {
    conseils.push("💡 Astuce: Ajoutez une lettre de motivation personnalisée pour vous démarquer");
  }

  // Déterminer la couleur et le label
  let color = "text-destructive";
  let label = "Très faible";

  if (percentage >= 80) {
    color = "text-success";
    label = "Excellentes";
  } else if (percentage >= 60) {
    color = "text-primary";
    label = "Bonnes";
  } else if (percentage >= 40) {
    color = "text-warning";
    label = "Moyennes";
  } else if (percentage >= 20) {
    color = "text-orange-500";
    label = "Faibles";
  }

  return {
    percentage: Math.min(percentage, 100),
    color,
    label,
    conseils,
    criteres: {
      visiteDone,
      candidatureDeposee,
      revenusOk,
      documentsComplets,
      permisOk
    }
  };
};
