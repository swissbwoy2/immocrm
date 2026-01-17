import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, Calendar, MapPin, User, Phone, Mail, 
  CheckCircle2, Clock, FileText, Key, Banknote
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NotaireSectionProps {
  notaireNom?: string | null;
  notaireAdresse?: string | null;
  notaireTelephone?: string | null;
  notaireEmail?: string | null;
  dateSignaturePrevue?: string | null;
  dateEntreeJouissance?: string | null;
  prixVenteFinal?: number | null;
  prixVendeur?: number | null;  // Prix net demandé par le vendeur
  commissionAgence?: number | null;
  tauxCommission?: number | null;
  statut: string;
  documentsRequis?: { nom: string; recu: boolean }[];
}

export function NotaireSection({
  notaireNom,
  notaireAdresse,
  notaireTelephone,
  notaireEmail,
  dateSignaturePrevue,
  dateEntreeJouissance,
  prixVenteFinal,
  prixVendeur,
  commissionAgence,
  tauxCommission,
  statut,
  documentsRequis = [],
}: NotaireSectionProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
  };

  const documentsRecus = documentsRequis.filter(d => d.recu).length;
  const progressDocs = documentsRequis.length > 0 ? (documentsRecus / documentsRequis.length) * 100 : 0;

  const getStatutBadge = () => {
    switch (statut) {
      case 'notaire_choisi':
        return <Badge className="bg-blue-500/10 text-blue-600">Notaire choisi</Badge>;
      case 'documents_en_cours':
        return <Badge className="bg-amber-500/10 text-amber-600">Documents en cours</Badge>;
      case 'signature_planifiee':
        return <Badge className="bg-purple-500/10 text-purple-600">Signature planifiée</Badge>;
      case 'acte_signe':
        return <Badge className="bg-green-500/10 text-green-600">Acte signé</Badge>;
      case 'entree_jouissance':
        return <Badge className="bg-emerald-500/10 text-emerald-600">Entrée en jouissance</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé financier */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Résumé de la transaction
              </CardTitle>
              <CardDescription>Détails financiers de la vente</CardDescription>
            </div>
            {getStatutBadge()}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Prix de vente final</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(prixVenteFinal)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Honoraires agence</p>
              <p className="text-2xl font-bold">{formatCurrency(commissionAgence)}</p>
              {tauxCommission && (
                <p className="text-xs text-muted-foreground">({tauxCommission}%)</p>
              )}
              {!tauxCommission && prixVendeur && prixVenteFinal && (
                <p className="text-xs text-muted-foreground">
                  (inclus dans le prix)
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700 mb-1 font-medium">Net vendeur garanti</p>
              <p className="text-2xl font-bold text-emerald-600">
                {prixVendeur ? formatCurrency(prixVendeur) : formatCurrency((prixVenteFinal || 0) - (commissionAgence || 0))}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Montant que vous recevrez
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations notaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Notaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notaireNom ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{notaireNom}</p>
                  <p className="text-sm text-muted-foreground">Notaire</p>
                </div>
              </div>
              
              {notaireAdresse && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{notaireAdresse}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                {notaireTelephone && (
                  <a 
                    href={`tel:${notaireTelephone}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {notaireTelephone}
                  </a>
                )}
                {notaireEmail && (
                  <a 
                    href={`mailto:${notaireEmail}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {notaireEmail}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Le notaire sera désigné prochainement
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dates importantes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cn(
          dateSignaturePrevue && "border-purple-200"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                dateSignaturePrevue ? "bg-purple-100" : "bg-muted"
              )}>
                <FileText className={cn(
                  "h-6 w-6",
                  dateSignaturePrevue ? "text-purple-600" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de signature prévue</p>
                <p className="text-xl font-bold">
                  {dateSignaturePrevue 
                    ? format(new Date(dateSignaturePrevue), 'dd MMMM yyyy', { locale: fr })
                    : 'À définir'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          dateEntreeJouissance && "border-emerald-200"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                dateEntreeJouissance ? "bg-emerald-100" : "bg-muted"
              )}>
                <Key className={cn(
                  "h-6 w-6",
                  dateEntreeJouissance ? "text-emerald-600" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entrée en jouissance</p>
                <p className="text-xl font-bold">
                  {dateEntreeJouissance 
                    ? format(new Date(dateEntreeJouissance), 'dd MMMM yyyy', { locale: fr })
                    : 'À définir'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist documents */}
      {documentsRequis.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents pour la signature
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {documentsRecus}/{documentsRequis.length} reçus
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressDocs} className="h-2" />
            
            <div className="space-y-2">
              {documentsRequis.map((doc, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    doc.recu ? "bg-green-50" : "bg-muted/50"
                  )}
                >
                  {doc.recu ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-sm",
                    doc.recu && "text-green-700"
                  )}>
                    {doc.nom}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
