import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Check, X } from 'lucide-react';

interface AchatDocumentsSectionProps {
  documents: any[];
}

// Catégories du parcours achat — clés alignées sur purchase_category en DB
export const ACHAT_DOC_CATEGORIES: { key: string; label: string; items: string[] }[] = [
  {
    key: 'identite',
    label: 'Identité',
    items: [
      'Pièce d\'identité (passeport ou carte nationale)',
      'Permis de séjour si non-suisse',
    ],
  },
  {
    key: 'revenus',
    label: 'Revenus',
    items: [
      'Certificat de salaire de l\'année précédente',
      'Fiches de salaire (3 derniers mois)',
      'Contrat de travail (si nouvel emploi)',
      'Bonus, commissions et primes (3 ans)',
      'Allocations familiales',
      'Pensions alimentaires reçues',
      'Revenus locatifs',
      'Rentes AVS / AI / LPP',
    ],
  },
  {
    key: 'fonds_propres',
    label: 'Fonds propres',
    items: [
      'Relevés bancaires fonds propres',
      'Comptes épargne',
      'Attestation 3e pilier (3a)',
      'Attestation LPP (caisse de pension)',
      'Attestation EPL (épargne-logement)',
      'Certificat de libre passage LPP',
      'Justificatif placements',
      'Justificatif donation / avance d\'hoirie',
    ],
  },
  {
    key: 'charges',
    label: 'Charges & engagements',
    items: [
      'Justificatif leasing',
      'Justificatif crédit privé',
      'Justificatif cartes de crédit',
      'Justificatif pensions alimentaires versées',
      'Extrait des poursuites',
    ],
  },
  {
    key: 'fiscalite',
    label: 'Fiscalité',
    items: [
      'Dernière déclaration fiscale',
      'Dernière décision de taxation',
    ],
  },
  {
    key: 'autorisation',
    label: 'Autorisations',
    items: [
      'Accord de transmission des données bancaires',
      'Consentement traitement données financières',
    ],
  },
  {
    key: 'autre',
    label: 'Autres documents',
    items: [],
  },
];

export function AchatDocumentsSection({ documents }: AchatDocumentsSectionProps) {
  const ALLOWED = new Set(['identite', 'revenus', 'fonds_propres', 'charges', 'fiscalite', 'autorisation', 'autre']);
  const byCategory = new Map<string, any[]>();
  documents.forEach((d) => {
    const raw = d.purchase_category || 'autre';
    const cat = ALLOWED.has(raw) ? raw : 'autre';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(d);
  });

  return (
    <Card className="p-6 border-primary/20">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        Documents pour la tenue des charges
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Pour calculer correctement votre capacité d'achat selon les règles bancaires suisses, nous avons besoin
        des pièces suivantes. Plus le dossier est complet, plus la validation bancaire est rapide (24 à 48 h).
      </p>

      <div className="space-y-4">
        {ACHAT_DOC_CATEGORIES.filter((cat) => cat.key !== 'autre' || (byCategory.get('autre') || []).length > 0).map((cat) => {
          const docs = byCategory.get(cat.key) || [];
          return (
            <div key={cat.key} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  <Badge
                    variant="outline"
                    className={`text-xs ${docs.length > 0 ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    {docs.length > 0 ? <Check className="h-3 w-3 mr-1 inline" /> : null}
                    {docs.length} document{docs.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              {docs.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-xs text-emerald-800">
                      <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{d.nom}</span>
                      {d.statut && d.statut !== 'en_attente' && (
                        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{d.statut}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {cat.items.length > 0 && (
                <ul className="space-y-1 mt-1">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <X className="h-3 w-3 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
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
