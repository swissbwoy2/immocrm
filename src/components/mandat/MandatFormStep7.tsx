import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MandatFormData } from './types';
import SignaturePad from './SignaturePad';
import CGVContent from './CGVContent';
import { User, Home, Briefcase, Search, Users, FileText, CreditCard } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep7({ data, onChange }: Props) {
  const acompte = data.type_recherche === 'Acheter' ? 2500 : 300;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Récapitulatif et Signature</h2>
        <p className="text-sm text-muted-foreground">Vérifiez vos informations et signez le mandat</p>
      </div>

      {/* Récapitulatif */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Informations personnelles</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Nom:</span> {data.prenom} {data.nom}</p>
            <p><span className="text-muted-foreground">Email:</span> {data.email}</p>
            <p><span className="text-muted-foreground">Tél:</span> {data.telephone}</p>
            <p><span className="text-muted-foreground">Permis:</span> {data.type_permis}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Situation actuelle</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Loyer:</span> {data.loyer_actuel?.toLocaleString('fr-CH')} CHF</p>
            <p><span className="text-muted-foreground">Pièces:</span> {data.pieces_actuel}</p>
            <p><span className="text-muted-foreground">Gérance:</span> {data.gerance_actuelle}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Situation financière</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Profession:</span> {data.profession}</p>
            <p><span className="text-muted-foreground">Revenus:</span> {data.revenus_mensuels?.toLocaleString('fr-CH')} CHF/mois</p>
            <p><span className="text-muted-foreground">Poursuites:</span> {data.poursuites ? 'Oui' : 'Non'}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Critères de recherche</h3>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Type:</span> {data.type_recherche}</p>
            <p><span className="text-muted-foreground">Bien:</span> {data.type_bien}</p>
            <p><span className="text-muted-foreground">Région:</span> {data.region_recherche}</p>
            <p><span className="text-muted-foreground">Budget:</span> {data.budget_max?.toLocaleString('fr-CH')} CHF</p>
          </div>
        </Card>

        {data.candidats.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Candidats ({data.candidats.length})</h3>
            </div>
            <div className="space-y-1 text-sm">
              {data.candidats.map(c => (
                <p key={c.id}>{c.prenom} {c.nom} ({c.lien_avec_client})</p>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Documents</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.documents_uploades.length === 0 ? (
              <Badge variant="destructive">Aucun document</Badge>
            ) : (
              data.documents_uploades.map(d => (
                <Badge key={d.type} variant="secondary">{d.type}</Badge>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Acompte */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Acompte à payer</p>
              <p className="text-sm text-muted-foreground">
                Pour l'activation de vos recherches de logement à {data.type_recherche.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">{acompte} CHF</div>
        </div>
      </Card>

      {/* Code promo */}
      <div className="space-y-2">
        <Label htmlFor="code_promo">Code promo (optionnel)</Label>
        <Input
          id="code_promo"
          value={data.code_promo}
          onChange={(e) => onChange({ code_promo: e.target.value })}
          placeholder="Entrez votre code promo"
        />
      </div>

      {/* CGV */}
      <div className="space-y-4">
        <h3 className="font-semibold">Dispositions du mandat</h3>
        <p className="text-sm text-muted-foreground">*À lire et approuver</p>
        <CGVContent />
      </div>

      {/* Signature */}
      <div className="space-y-4">
        <Label>Signature *</Label>
        <SignaturePad
          value={data.signature_data}
          onChange={(value) => onChange({ signature_data: value })}
        />
      </div>

      {/* Checkbox CGV */}
      <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
        <Checkbox
          id="cgv"
          checked={data.cgv_acceptees}
          onCheckedChange={(checked) => onChange({ cgv_acceptees: checked as boolean })}
        />
        <Label htmlFor="cgv" className="text-sm leading-relaxed cursor-pointer">
          En cochant cette case, je confirme avoir répondu aux questions en bonne conscience et que j'ai pris connaissance qu'en cas de réponses non conforme à la vérité, les offreurs de logement ont le droit de résilier le contrat de (sous-)location avec effet immédiat - et sous réserve d'autres revendications. En outre, je confirme accepter sans condition les dispositions de contrat pour chercheurs de logement. <span className="text-destructive">*</span>
        </Label>
      </div>
    </div>
  );
}
