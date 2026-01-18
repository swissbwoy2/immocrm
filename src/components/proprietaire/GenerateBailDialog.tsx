import { useState } from 'react';
import { FileText, Download, Loader2, FileCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GenerateBailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bail: any;
  onSuccess?: () => void;
}

const CANTONS = [
  { value: 'VD', label: 'Vaud' },
  { value: 'GE', label: 'Genève' },
  { value: 'VS', label: 'Valais' },
  { value: 'FR', label: 'Fribourg' },
  { value: 'NE', label: 'Neuchâtel' },
  { value: 'JU', label: 'Jura' },
];

const formatCurrency = (value: number | null) => {
  if (!value) return 'CHF 0';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

export function GenerateBailDialog({ open, onOpenChange, bail, onSuccess }: GenerateBailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [includeNotification, setIncludeNotification] = useState(true);
  const [includeRulv, setIncludeRulv] = useState(false);
  const [canton, setCanton] = useState('VD');
  
  // Ancien locataire fields
  const [ancienLocataireNom, setAncienLocataireNom] = useState(bail?.ancien_locataire_nom || '');
  const [ancienLocataireLoyerNet, setAncienLocataireLoyerNet] = useState(bail?.ancien_locataire_loyer_net || '');
  const [ancienLocataireCharges, setAncienLocataireCharges] = useState(bail?.ancien_locataire_charges || '');
  const [ancienLocataireDepuis, setAncienLocataireDepuis] = useState(bail?.ancien_locataire_depuis || '');
  const [motifHausse, setMotifHausse] = useState(bail?.motif_hausse || '');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // First update the bail with ancien locataire info
      if (ancienLocataireNom || ancienLocataireLoyerNet || ancienLocataireCharges) {
        const { error: updateError } = await supabase
          .from('baux')
          .update({
            ancien_locataire_nom: ancienLocataireNom || null,
            ancien_locataire_loyer_net: ancienLocataireLoyerNet ? parseFloat(ancienLocataireLoyerNet) : null,
            ancien_locataire_charges: ancienLocataireCharges ? parseFloat(ancienLocataireCharges) : null,
            ancien_locataire_depuis: ancienLocataireDepuis || null,
            motif_hausse: motifHausse || null,
          })
          .eq('id', bail.id);

        if (updateError) {
          console.error('Error updating bail:', updateError);
        }
      }

      // Generate PDF
      const { data, error } = await supabase.functions.invoke('generate-bail-pdf', {
        body: {
          bail_id: bail.id,
          include_notification: includeNotification,
          include_rulv: includeRulv,
          canton,
        },
      });

      if (error) throw error;

      if (data.pdf_base64) {
        // Decode base64 and download
        const binaryString = atob(data.pdf_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `Bail_${bail.lot?.reference || bail.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Contrat de bail généré avec succès');
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error('No PDF data received');
      }
    } catch (error: any) {
      console.error('Error generating bail PDF:', error);
      toast.error(error.message || 'Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  };

  if (!bail) return null;

  const chargesTotal = (bail.provisions_chauffage || 0) + (bail.provisions_eau || 0) + (bail.autres_charges || 0);
  const totalBrut = (bail.loyer_actuel || 0) + chargesTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Générer le contrat de bail
          </DialogTitle>
          <DialogDescription>
            Générez un contrat de bail à loyer conforme aux exigences suisses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé du bail */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot</span>
                <span className="font-medium">{bail.lot?.reference || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locataire</span>
                <span className="font-medium">
                  {bail.locataire ? `${bail.locataire.prenom} ${bail.locataire.nom}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loyer net</span>
                <span className="font-medium">{formatCurrency(bail.loyer_actuel)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Charges</span>
                <span className="font-medium">{formatCurrency(chargesTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total mensuel</span>
                <span className="font-bold text-primary">{formatCurrency(totalBrut)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Début du bail</span>
                <span>{bail.date_debut ? format(new Date(bail.date_debut), 'dd MMMM yyyy', { locale: fr }) : '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Options de génération */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Options du document</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notification"
                  checked={includeNotification}
                  onCheckedChange={(checked) => setIncludeNotification(checked as boolean)}
                />
                <Label htmlFor="notification" className="font-normal cursor-pointer">
                  Inclure la notification de loyer (Art. 270 CO)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rulv"
                  checked={includeRulv}
                  onCheckedChange={(checked) => setIncludeRulv(checked as boolean)}
                />
                <Label htmlFor="rulv" className="font-normal cursor-pointer">
                  Inclure les Règles et Usages Locatifs (RULV)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canton</Label>
              <Select value={canton} onValueChange={setCanton}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANTONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ancien locataire (pour notification) */}
          {includeNotification && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Informations de l'ancien locataire</Label>
              <p className="text-sm text-muted-foreground">
                Requis pour la notification de loyer conforme à l'Art. 270 CO
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ancien_nom">Nom de l'ancien locataire</Label>
                  <Input
                    id="ancien_nom"
                    value={ancienLocataireNom}
                    onChange={(e) => setAncienLocataireNom(e.target.value)}
                    placeholder="Nom et prénom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ancien_loyer">Loyer net mensuel (CHF)</Label>
                  <Input
                    id="ancien_loyer"
                    type="number"
                    value={ancienLocataireLoyerNet}
                    onChange={(e) => setAncienLocataireLoyerNet(e.target.value)}
                    placeholder="1200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ancien_charges">Charges mensuelles (CHF)</Label>
                  <Input
                    id="ancien_charges"
                    type="number"
                    value={ancienLocataireCharges}
                    onChange={(e) => setAncienLocataireCharges(e.target.value)}
                    placeholder="150"
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ancien_depuis">Locataire depuis le</Label>
                  <Input
                    id="ancien_depuis"
                    type="date"
                    value={ancienLocataireDepuis}
                    onChange={(e) => setAncienLocataireDepuis(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motif_hausse">Motifs de la hausse éventuelle</Label>
                <Textarea
                  id="motif_hausse"
                  value={motifHausse}
                  onChange={(e) => setMotifHausse(e.target.value)}
                  placeholder="Ex: Adaptation aux loyers usuels dans la localité..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Générer le PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
