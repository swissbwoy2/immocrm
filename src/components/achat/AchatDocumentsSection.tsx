import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Check, X } from 'lucide-react';

interface AchatDocumentsSectionProps {
  documents: any[];
}

// 6 catégories du parcours achat
export const ACHAT_DOC_CATEGORIES: { key: string; label: string; items: string[] }[] = [
  {
    key: 'revenus',
    label: 'Revenus',
    items: [
      'Fiches de salaire (si revenu différent de l\'année précédente)',
      'Certificat de salaire de l\'année précédente',
      'Contrat de travail (si nouvel emploi)',
      'Bonus, commissions et primes (idéalement sur 3 ans)',
      'Allocations familiales',
      'Pensions alimentaires reçues',
      'Revenus locatifs',
      'Rentes AVS / AI / LPP',
      'Autres revenus réguliers',
    ],
  },
  {
    key: 'fonds_propres',
    label: 'Fonds propres',
    items: [
      'Relevés bancaires',
      'Comptes épargne',
      'Comptes 3a',
      'Certificat de libre passage LPP',
      'Attestation de caisse de pension (avoir disponible + montant EPL retirable)',
      'Placements',
      'Donation ou avance d\'hoirie',
    ],
  },
  {
    key: 'situation_financiere',
    label: 'Situation financière',
    items: [
      'Leasing',
      'Crédit privé',
      'Cartes de crédit avec mensualités',
      'Pensions alimentaires versées',
      'Autres engagements financiers',
      'Extrait des poursuites',
    ],
  },
  {
    key: 'situation_familiale',
    label: 'Situation familiale',
    items: [
      'État civil',
      'Nombre d\'enfants',
      'Date de naissance des acheteurs',
    ],
  },
  {
    key: 'autorisations',
    label: 'Autorisations',
    items: [
      'Nationalité',
      'Type de permis de séjour',
      'Pièce d\'identité (passeport)',
    ],
  },
  {
    key: 'bien_immobilier',
    label: 'Bien immobilier',
    items: [
      'Extrait du registre foncier',
      'Plans et descriptif du bien',
      'PPE / règlement de copropriété',
      'Décompte de charges',
      'Diagnostic CECB éventuel',
    ],
  },
];

export function AchatDocumentsSection({ documents }: AchatDocumentsSectionProps) {
  const byCategory = new Map<string, any[]>();
  documents.forEach((d) => {
    const cat = d.purchase_category || 'autres';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(d);
  });

  return (
    <Card className="p-6 border-sky-100">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-sky-600" />
        Documents pour la tenue des charges
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Pour calculer correctement votre capacité d'achat selon les règles bancaires suisses, nous avons besoin
        des pièces suivantes. Plus le dossier est complet, plus la validation bancaire est rapide (24 à 48 h).
      </p>

      <div className="space-y-4">
        {ACHAT_DOC_CATEGORIES.map((cat) => {
          const docs = byCategory.get(cat.key) || [];
          return (
            <div key={cat.key} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {docs.length} document{docs.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              <ul className="space-y-1">
                {cat.items.map((item) => {
                  const present = docs.some((d) =>
                    (d.nom || '').toLowerCase().includes(item.toLowerCase().split(' ')[0]),
                  );
                  return (
                    <li key={item} className="flex items-start gap-2 text-xs">
                      {present
                        ? <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        : <X className="h-3.5 w-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />}
                      <span className={present ? 'text-emerald-900' : 'text-muted-foreground'}>{item}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs text-muted-foreground mb-3">
          L'upload s'effectue depuis "Mon dossier" — même interface que vos autres documents.
        </p>
        <Badge variant="outline" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          Interface d'upload unifiée
        </Badge>
      </div>
    </Card>
  );
}
