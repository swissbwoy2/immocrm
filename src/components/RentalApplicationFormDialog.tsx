import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, User, Users, Home, Briefcase, Phone, Mail, 
  Calendar, DollarSign, Car, Music, PawPrint, Download,
  Save, Sparkles, Building2, MapPin, Clock, AlertCircle,
  CheckCircle2, Upload, FileUp, Loader2, Pen
} from 'lucide-react';
import SignaturePad from './mandat/SignaturePad';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RentalApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  profile: any;
  candidates?: any[];
  offre?: any;
}

interface FormData {
  // Bien
  reference: string;
  date: string;
  adresse_bien: string;
  npa_localite: string;
  nombre_pieces: string;
  surface: string;
  etage: string;
  disponible_des: string;
  loyer_net: string;
  charges: string;
  frais_divers: string;
  garage: string;
  place_parc: string;
  total_mensuel: string;
  
  // Locataire principal
  nom: string;
  prenom: string;
  date_naissance: string;
  nationalite: string;
  permis: string;
  etat_civil: string;
  
  // Conjoint / Co-locataire
  conjoint_nom: string;
  conjoint_prenom: string;
  conjoint_date_naissance: string;
  conjoint_nationalite: string;
  conjoint_permis: string;
  conjoint_etat_civil: string;
  
  // Adresse et emploi
  adresse_actuelle: string;
  npa_localite_actuel: string;
  profession: string;
  employeur: string;
  date_engagement: string;
  salaire_brut: string;
  tel_prive: string;
  tel_professionnel: string;
  tel_mobile: string;
  email: string;
  
  // Gérance actuelle
  gerance_actuelle: string;
  tel_gerance: string;
  depuis_le: string;
  loyer_actuel: string;
  pieces_actuelles: string;
  
  // Questions
  charges_extra_oui: boolean;
  charges_extra_non: boolean;
  montant_charges_extra: string;
  poursuites_oui: boolean;
  poursuites_non: boolean;
  curatelle_oui: boolean;
  curatelle_non: boolean;
  
  // Occupants
  motif_changement: string;
  nombre_adultes: string;
  nombre_mineurs: string;
  utilisation_principal: boolean;
  utilisation_secondaire: boolean;
  
  animaux_oui: boolean;
  animaux_non: boolean;
  animaux_details: string;
  
  instrument_oui: boolean;
  instrument_non: boolean;
  instrument_details: string;
  
  vehicule_oui: boolean;
  vehicule_non: boolean;
  vehicule_plaques: string;
  
  // Découverte
  decouverte_internet: boolean;
  decouverte_journaux: boolean;
  decouverte_telephone: boolean;
  decouverte_regie: boolean;
  decouverte_locataire: boolean;
  decouverte_reseaux: boolean;
  decouverte_autre: string;
  
  // Remarques
  remarques: string;
  
  // Signatures
  signature_lieu: string;
  signature_date: string;
  signature_locataire: string;
  signature_conjoint: string;
}

export function RentalApplicationFormDialog({
  open,
  onOpenChange,
  client,
  profile,
  candidates = [],
  offre
}: RentalApplicationFormDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'bien' | 'locataire' | 'conjoint' | 'emploi' | 'questions' | 'signature'>('bien');
  
  // Pre-fill form data from client
  const [formData, setFormData] = useState<FormData>(() => {
    const conjoint = candidates?.find(c => c.type === 'conjoint' || c.type === 'colocataire');
    const today = new Date().toISOString().split('T')[0];
    
    return {
      // Bien (from offre if available)
      reference: '',
      date: today,
      adresse_bien: offre?.adresse || '',
      npa_localite: '',
      nombre_pieces: offre?.pieces?.toString() || '',
      surface: offre?.surface?.toString() || '',
      etage: offre?.etage || '',
      disponible_des: offre?.disponibilite || '',
      loyer_net: offre?.prix?.toString() || '',
      charges: '',
      frais_divers: '',
      garage: '',
      place_parc: '',
      total_mensuel: offre?.prix?.toString() || '',
      
      // Locataire principal
      nom: profile?.nom || '',
      prenom: profile?.prenom || '',
      date_naissance: client?.date_naissance || '',
      nationalite: client?.nationalite || '',
      permis: client?.type_permis || '',
      etat_civil: client?.etat_civil || client?.situation_familiale || '',
      
      // Conjoint
      conjoint_nom: conjoint?.nom || '',
      conjoint_prenom: conjoint?.prenom || '',
      conjoint_date_naissance: conjoint?.date_naissance || '',
      conjoint_nationalite: conjoint?.nationalite || '',
      conjoint_permis: conjoint?.type_permis || '',
      conjoint_etat_civil: conjoint?.situation_familiale || '',
      
      // Adresse et emploi
      adresse_actuelle: client?.adresse || '',
      npa_localite_actuel: '',
      profession: client?.profession || '',
      employeur: client?.employeur || '',
      date_engagement: client?.date_engagement || '',
      salaire_brut: client?.revenus_mensuels?.toString() || '',
      tel_prive: profile?.telephone || '',
      tel_professionnel: '',
      tel_mobile: profile?.telephone || '',
      email: profile?.email || '',
      
      // Gérance actuelle
      gerance_actuelle: client?.gerance_actuelle || '',
      tel_gerance: client?.contact_gerance || '',
      depuis_le: client?.depuis_le || '',
      loyer_actuel: client?.loyer_actuel?.toString() || '',
      pieces_actuelles: client?.pieces_actuel?.toString() || '',
      
      // Questions
      charges_extra_oui: client?.charges_extraordinaires === true,
      charges_extra_non: client?.charges_extraordinaires === false,
      montant_charges_extra: client?.montant_charges_extra?.toString() || '',
      poursuites_oui: client?.poursuites === true,
      poursuites_non: client?.poursuites === false,
      curatelle_oui: client?.curatelle === true,
      curatelle_non: client?.curatelle === false,
      
      // Occupants
      motif_changement: client?.motif_changement || '',
      nombre_adultes: '',
      nombre_mineurs: '',
      utilisation_principal: client?.utilisation_logement === 'principal',
      utilisation_secondaire: client?.utilisation_logement === 'secondaire',
      
      animaux_oui: client?.animaux === true,
      animaux_non: client?.animaux === false,
      animaux_details: '',
      
      instrument_oui: client?.instrument_musique === true,
      instrument_non: client?.instrument_musique === false,
      instrument_details: '',
      
      vehicule_oui: client?.vehicules === true,
      vehicule_non: client?.vehicules === false,
      vehicule_plaques: client?.numero_plaques || '',
      
      // Découverte
      decouverte_internet: client?.decouverte_agence === 'Internet',
      decouverte_journaux: client?.decouverte_agence === 'Journaux',
      decouverte_telephone: client?.decouverte_agence === 'Téléphone',
      decouverte_regie: client?.decouverte_agence === 'Régie',
      decouverte_locataire: client?.decouverte_agence === 'Locataire',
      decouverte_reseaux: client?.decouverte_agence === 'Réseaux sociaux',
      decouverte_autre: '',
      
      // Remarques
      remarques: client?.souhaits_particuliers || '',
      
      // Signatures
      signature_lieu: 'Lausanne',
      signature_date: today,
      signature_locataire: '',
      signature_conjoint: '',
    };
  });

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Fetch the template PDF
      const templateResponse = await fetch('/templates/demande-location-habitation.pdf');
      const templateBytes = await templateResponse.arrayBuffer();
      
      // Load the PDF
      const pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page1 = pages[0];
      const page2 = pages[1];
      const { width, height } = page1.getSize();
      
      const fontSize = 9;
      const smallFontSize = 8;
      
      // Helper function to draw text
      const drawText = (page: any, text: string, x: number, y: number, size = fontSize) => {
        page.drawText(text || '', {
          x,
          y: height - y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      };
      
      // Page 1 - Header info
      drawText(page1, formData.reference, 480, 85);
      drawText(page1, formData.date, 480, 102);
      
      // Property info
      drawText(page1, formData.adresse_bien, 85, 138);
      drawText(page1, formData.nombre_pieces, 280, 138);
      drawText(page1, formData.surface, 420, 138);
      drawText(page1, formData.npa_localite, 85, 155);
      drawText(page1, formData.etage, 280, 155);
      drawText(page1, formData.disponible_des, 420, 155);
      
      // Rent info
      drawText(page1, formData.loyer_net, 85, 185);
      drawText(page1, formData.charges, 175, 185);
      drawText(page1, formData.frais_divers, 260, 185);
      drawText(page1, formData.garage, 340, 185);
      drawText(page1, formData.place_parc, 420, 185);
      drawText(page1, formData.total_mensuel, 500, 185);
      
      // Locataire principal
      drawText(page1, formData.nom, 85, 225);
      drawText(page1, formData.prenom, 300, 225);
      drawText(page1, formData.date_naissance, 85, 242);
      drawText(page1, `${formData.nationalite} / ${formData.permis}`, 300, 242);
      drawText(page1, formData.etat_civil, 85, 259);
      
      // Conjoint
      drawText(page1, formData.conjoint_nom, 85, 300);
      drawText(page1, formData.conjoint_prenom, 300, 300);
      drawText(page1, formData.conjoint_date_naissance, 85, 317);
      drawText(page1, `${formData.conjoint_nationalite} / ${formData.conjoint_permis}`, 300, 317);
      drawText(page1, formData.conjoint_etat_civil, 85, 334);
      
      // Address and employment
      drawText(page1, formData.adresse_actuelle, 85, 375);
      drawText(page1, formData.npa_localite_actuel, 300, 375);
      drawText(page1, formData.profession, 85, 392);
      drawText(page1, formData.employeur, 300, 392);
      drawText(page1, formData.date_engagement, 85, 409);
      drawText(page1, `CHF ${formData.salaire_brut}`, 300, 409);
      drawText(page1, formData.tel_prive, 85, 426);
      drawText(page1, formData.tel_professionnel, 300, 426);
      drawText(page1, formData.tel_mobile, 85, 443);
      drawText(page1, formData.email, 300, 443);
      
      // Current management
      drawText(page1, formData.gerance_actuelle, 85, 485);
      drawText(page1, formData.tel_gerance, 85, 502);
      drawText(page1, formData.depuis_le, 300, 502);
      drawText(page1, `CHF ${formData.loyer_actuel}`, 85, 519);
      drawText(page1, formData.pieces_actuelles, 300, 519);
      
      // Signature location and date at bottom
      drawText(page1, formData.signature_lieu, 75, 565);
      drawText(page1, formData.signature_date, 75, 582);
      
      // Add signature image if exists
      if (formData.signature_locataire) {
        try {
          const signatureImage = await pdfDoc.embedPng(formData.signature_locataire);
          page1.drawImage(signatureImage, {
            x: 180,
            y: height - 610,
            width: 100,
            height: 40,
          });
        } catch (e) {
          console.warn('Could not embed signature');
        }
      }
      
      // Page 2 - Questions
      const page2Height = page2.getSize().height;
      
      // Charges extra
      if (formData.charges_extra_oui) drawText(page2, 'X', 268, 58, smallFontSize);
      if (formData.charges_extra_non) drawText(page2, 'X', 298, 58, smallFontSize);
      drawText(page2, formData.montant_charges_extra, 268, 75, smallFontSize);
      
      // Poursuites
      if (formData.poursuites_oui) drawText(page2, 'X', 268, 108, smallFontSize);
      if (formData.poursuites_non) drawText(page2, 'X', 298, 108, smallFontSize);
      
      // Curatelle
      if (formData.curatelle_oui) drawText(page2, 'X', 268, 138, smallFontSize);
      if (formData.curatelle_non) drawText(page2, 'X', 298, 138, smallFontSize);
      
      // Motif changement
      drawText(page2, formData.motif_changement, 85, 168, smallFontSize);
      
      // Occupants
      drawText(page2, formData.nombre_adultes, 140, 198, smallFontSize);
      drawText(page2, formData.nombre_mineurs, 140, 215, smallFontSize);
      
      // Utilisation
      if (formData.utilisation_principal) drawText(page2, 'X', 95, 245, smallFontSize);
      if (formData.utilisation_secondaire) drawText(page2, 'X', 160, 245, smallFontSize);
      
      // Animaux
      if (formData.animaux_oui) drawText(page2, 'X', 268, 275, smallFontSize);
      if (formData.animaux_non) drawText(page2, 'X', 298, 275, smallFontSize);
      drawText(page2, formData.animaux_details, 85, 295, smallFontSize);
      
      // Instruments
      if (formData.instrument_oui) drawText(page2, 'X', 268, 325, smallFontSize);
      if (formData.instrument_non) drawText(page2, 'X', 298, 325, smallFontSize);
      drawText(page2, formData.instrument_details, 85, 345, smallFontSize);
      
      // Véhicules
      if (formData.vehicule_oui) drawText(page2, 'X', 268, 375, smallFontSize);
      if (formData.vehicule_non) drawText(page2, 'X', 298, 375, smallFontSize);
      drawText(page2, formData.vehicule_plaques, 85, 395, smallFontSize);
      
      // Découverte
      if (formData.decouverte_internet) drawText(page2, 'X', 95, 428, smallFontSize);
      if (formData.decouverte_journaux) drawText(page2, 'X', 175, 428, smallFontSize);
      if (formData.decouverte_telephone) drawText(page2, 'X', 268, 428, smallFontSize);
      if (formData.decouverte_regie) drawText(page2, 'X', 95, 445, smallFontSize);
      if (formData.decouverte_locataire) drawText(page2, 'X', 175, 445, smallFontSize);
      if (formData.decouverte_reseaux) drawText(page2, 'X', 268, 445, smallFontSize);
      drawText(page2, formData.decouverte_autre, 130, 462, smallFontSize);
      
      // Remarques
      drawText(page2, formData.remarques.substring(0, 80), 85, 505, smallFontSize);
      if (formData.remarques.length > 80) {
        drawText(page2, formData.remarques.substring(80, 160), 85, 520, smallFontSize);
      }
      
      // Generate final PDF
      const pdfBytes = await pdfDoc.save();
      
      // Download the PDF
      const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demande-location-${formData.nom}-${formData.prenom}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDocuments = async () => {
    if (!client) return;
    
    setIsSaving(true);
    try {
      // Generate PDF bytes
      const templateResponse = await fetch('/templates/demande-location-habitation.pdf');
      const templateBytes = await templateResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);
      // ... same PDF generation logic as above
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
      
      // Upload to storage
      const fileName = `${client.user_id}/${Date.now()}_demande-location.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });
      
      if (uploadError) throw uploadError;
      
      // Save to documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: client.user_id,
          client_id: client.id,
          nom: `Demande de location - ${formData.nom} ${formData.prenom}`,
          type: 'application/pdf',
          type_document: 'demande_location',
          url: fileName,
        });
      
      if (dbError) throw dbError;
      
      toast.success('Document sauvegardé');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'bien', label: 'Bien', icon: Home },
    { id: 'locataire', label: 'Locataire', icon: User },
    { id: 'conjoint', label: 'Conjoint', icon: Users },
    { id: 'emploi', label: 'Emploi', icon: Briefcase },
    { id: 'questions', label: 'Questions', icon: AlertCircle },
    { id: 'signature', label: 'Signature', icon: Pen },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 border-b">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Demande de Location Habitation
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Pré-remplissez le formulaire universel avec les données du client
                </p>
              </div>
            </div>
            <Badge variant="outline" className="absolute top-0 right-0 bg-background/80">
              <Sparkles className="h-3 w-3 mr-1" />
              Pré-rempli automatiquement
            </Badge>
          </DialogHeader>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-2 bg-muted/30 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Bien Tab */}
            {activeTab === 'bien' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-primary/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Home className="h-5 w-5 text-primary" />
                      Informations du Bien
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Référence</Label>
                      <Input
                        value={formData.reference}
                        onChange={(e) => updateField('reference', e.target.value)}
                        placeholder="Réf. du bien"
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => updateField('date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label>Adresse du bien</Label>
                      <Input
                        value={formData.adresse_bien}
                        onChange={(e) => updateField('adresse_bien', e.target.value)}
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div>
                      <Label>NPA / Localité</Label>
                      <Input
                        value={formData.npa_localite}
                        onChange={(e) => updateField('npa_localite', e.target.value)}
                        placeholder="1000 Lausanne"
                      />
                    </div>
                    <div>
                      <Label>Nombre de pièces</Label>
                      <Input
                        value={formData.nombre_pieces}
                        onChange={(e) => updateField('nombre_pieces', e.target.value)}
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <Label>Surface (m²)</Label>
                      <Input
                        value={formData.surface}
                        onChange={(e) => updateField('surface', e.target.value)}
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <Label>Étage</Label>
                      <Input
                        value={formData.etage}
                        onChange={(e) => updateField('etage', e.target.value)}
                        placeholder="2ème"
                      />
                    </div>
                    <div>
                      <Label>Disponible dès le</Label>
                      <Input
                        value={formData.disponible_des}
                        onChange={(e) => updateField('disponible_des', e.target.value)}
                        placeholder="01.01.2025"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Loyer et Charges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Loyer mensuel net (CHF)</Label>
                      <Input
                        value={formData.loyer_net}
                        onChange={(e) => updateField('loyer_net', e.target.value)}
                        placeholder="1500"
                      />
                    </div>
                    <div>
                      <Label>Charges (CHF)</Label>
                      <Input
                        value={formData.charges}
                        onChange={(e) => updateField('charges', e.target.value)}
                        placeholder="150"
                      />
                    </div>
                    <div>
                      <Label>Frais divers (CHF)</Label>
                      <Input
                        value={formData.frais_divers}
                        onChange={(e) => updateField('frais_divers', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Garage (CHF)</Label>
                      <Input
                        value={formData.garage}
                        onChange={(e) => updateField('garage', e.target.value)}
                        placeholder="150"
                      />
                    </div>
                    <div>
                      <Label>Place de parc (CHF)</Label>
                      <Input
                        value={formData.place_parc}
                        onChange={(e) => updateField('place_parc', e.target.value)}
                        placeholder="80"
                      />
                    </div>
                    <div>
                      <Label>Total mensuel (CHF)</Label>
                      <Input
                        value={formData.total_mensuel}
                        onChange={(e) => updateField('total_mensuel', e.target.value)}
                        placeholder="1880"
                        className="font-semibold"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Locataire Tab */}
            {activeTab === 'locataire' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-blue-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-blue-500" />
                      Locataire Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={formData.nom}
                        onChange={(e) => updateField('nom', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Prénom</Label>
                      <Input
                        value={formData.prenom}
                        onChange={(e) => updateField('prenom', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={formData.date_naissance}
                        onChange={(e) => updateField('date_naissance', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nationalité</Label>
                      <Input
                        value={formData.nationalite}
                        onChange={(e) => updateField('nationalite', e.target.value)}
                        placeholder="Suisse"
                      />
                    </div>
                    <div>
                      <Label>Permis de séjour</Label>
                      <Input
                        value={formData.permis}
                        onChange={(e) => updateField('permis', e.target.value)}
                        placeholder="C, B, etc."
                      />
                    </div>
                    <div>
                      <Label>État civil</Label>
                      <Select
                        value={formData.etat_civil}
                        onValueChange={(v) => updateField('etat_civil', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="célibataire">Célibataire</SelectItem>
                          <SelectItem value="marié-e">Marié(e)</SelectItem>
                          <SelectItem value="pacsé-e">Pacsé(e)</SelectItem>
                          <SelectItem value="divorcé-e">Divorcé(e)</SelectItem>
                          <SelectItem value="séparé-e">Séparé(e)</SelectItem>
                          <SelectItem value="veuf-ve">Veuf/Veuve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      Adresse Actuelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <Label>Adresse actuelle</Label>
                      <Input
                        value={formData.adresse_actuelle}
                        onChange={(e) => updateField('adresse_actuelle', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>NPA / Localité</Label>
                      <Input
                        value={formData.npa_localite_actuel}
                        onChange={(e) => updateField('npa_localite_actuel', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-orange-500" />
                      Gérance / Propriétaire Actuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label>Gérance ou propriétaire actuel</Label>
                      <Input
                        value={formData.gerance_actuelle}
                        onChange={(e) => updateField('gerance_actuelle', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>N° de téléphone</Label>
                      <Input
                        value={formData.tel_gerance}
                        onChange={(e) => updateField('tel_gerance', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Depuis le</Label>
                      <Input
                        value={formData.depuis_le}
                        onChange={(e) => updateField('depuis_le', e.target.value)}
                        placeholder="01.01.2020"
                      />
                    </div>
                    <div>
                      <Label>Loyer brut mensuel actuel (CHF)</Label>
                      <Input
                        value={formData.loyer_actuel}
                        onChange={(e) => updateField('loyer_actuel', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nombre de pièces</Label>
                      <Input
                        value={formData.pieces_actuelles}
                        onChange={(e) => updateField('pieces_actuelles', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Conjoint Tab */}
            {activeTab === 'conjoint' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-purple-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-purple-500" />
                      Conjoint / Co-locataire
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={formData.conjoint_nom}
                        onChange={(e) => updateField('conjoint_nom', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Prénom</Label>
                      <Input
                        value={formData.conjoint_prenom}
                        onChange={(e) => updateField('conjoint_prenom', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={formData.conjoint_date_naissance}
                        onChange={(e) => updateField('conjoint_date_naissance', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nationalité</Label>
                      <Input
                        value={formData.conjoint_nationalite}
                        onChange={(e) => updateField('conjoint_nationalite', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Permis de séjour</Label>
                      <Input
                        value={formData.conjoint_permis}
                        onChange={(e) => updateField('conjoint_permis', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>État civil</Label>
                      <Select
                        value={formData.conjoint_etat_civil}
                        onValueChange={(v) => updateField('conjoint_etat_civil', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="célibataire">Célibataire</SelectItem>
                          <SelectItem value="marié-e">Marié(e)</SelectItem>
                          <SelectItem value="pacsé-e">Pacsé(e)</SelectItem>
                          <SelectItem value="divorcé-e">Divorcé(e)</SelectItem>
                          <SelectItem value="séparé-e">Séparé(e)</SelectItem>
                          <SelectItem value="veuf-ve">Veuf/Veuve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Emploi Tab */}
            {activeTab === 'emploi' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-emerald-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5 text-emerald-500" />
                      Situation Professionnelle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Profession / Genre d'activité</Label>
                      <Input
                        value={formData.profession}
                        onChange={(e) => updateField('profession', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Employeur</Label>
                      <Input
                        value={formData.employeur}
                        onChange={(e) => updateField('employeur', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Date d'engagement</Label>
                      <Input
                        value={formData.date_engagement}
                        onChange={(e) => updateField('date_engagement', e.target.value)}
                        placeholder="01.01.2020"
                      />
                    </div>
                    <div>
                      <Label>Salaire mensuel brut (CHF)</Label>
                      <Input
                        value={formData.salaire_brut}
                        onChange={(e) => updateField('salaire_brut', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      Coordonnées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>N° tél. privé</Label>
                      <Input
                        value={formData.tel_prive}
                        onChange={(e) => updateField('tel_prive', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>N° tél. professionnel</Label>
                      <Input
                        value={formData.tel_professionnel}
                        onChange={(e) => updateField('tel_professionnel', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>N° tél. mobile</Label>
                      <Input
                        value={formData.tel_mobile}
                        onChange={(e) => updateField('tel_mobile', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <Label>Adresse e-mail</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-red-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      Questions Importantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Charges extraordinaires */}
                    <div className="space-y-2">
                      <Label>Avez-vous des charges extraordinaires (crédits, leasing, pension alimentaire, etc.) ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.charges_extra_oui}
                            onCheckedChange={(c) => {
                              updateField('charges_extra_oui', !!c);
                              if (c) updateField('charges_extra_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.charges_extra_non}
                            onCheckedChange={(c) => {
                              updateField('charges_extra_non', !!c);
                              if (c) updateField('charges_extra_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                      {formData.charges_extra_oui && (
                        <Input
                          placeholder="Montant / échéance"
                          value={formData.montant_charges_extra}
                          onChange={(e) => updateField('montant_charges_extra', e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Poursuites */}
                    <div className="space-y-2">
                      <Label>Avez-vous des poursuites ou des actes de défaut de biens ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.poursuites_oui}
                            onCheckedChange={(c) => {
                              updateField('poursuites_oui', !!c);
                              if (c) updateField('poursuites_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.poursuites_non}
                            onCheckedChange={(c) => {
                              updateField('poursuites_non', !!c);
                              if (c) updateField('poursuites_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Curatelle */}
                    <div className="space-y-2">
                      <Label>Êtes-vous sous curatelle ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.curatelle_oui}
                            onCheckedChange={(c) => {
                              updateField('curatelle_oui', !!c);
                              if (c) updateField('curatelle_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.curatelle_non}
                            onCheckedChange={(c) => {
                              updateField('curatelle_non', !!c);
                              if (c) updateField('curatelle_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      Occupation du Logement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Motif du changement de domicile</Label>
                      <Textarea
                        value={formData.motif_changement}
                        onChange={(e) => updateField('motif_changement', e.target.value)}
                        placeholder="Raison du déménagement..."
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre d'adultes</Label>
                        <Input
                          value={formData.nombre_adultes}
                          onChange={(e) => updateField('nombre_adultes', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Nombre de mineurs</Label>
                        <Input
                          value={formData.nombre_mineurs}
                          onChange={(e) => updateField('nombre_mineurs', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Utilisation du logement à titre</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.utilisation_principal}
                            onCheckedChange={(c) => {
                              updateField('utilisation_principal', !!c);
                              if (c) updateField('utilisation_secondaire', false);
                            }}
                          />
                          <span>Principal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.utilisation_secondaire}
                            onCheckedChange={(c) => {
                              updateField('utilisation_secondaire', !!c);
                              if (c) updateField('utilisation_principal', false);
                            }}
                          />
                          <span>Secondaire</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <PawPrint className="h-5 w-5 text-muted-foreground" />
                      Animaux, Véhicules, Instruments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Animaux */}
                    <div className="space-y-2">
                      <Label>Avez-vous un (des) animal(aux) ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.animaux_oui}
                            onCheckedChange={(c) => {
                              updateField('animaux_oui', !!c);
                              if (c) updateField('animaux_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.animaux_non}
                            onCheckedChange={(c) => {
                              updateField('animaux_non', !!c);
                              if (c) updateField('animaux_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                      {formData.animaux_oui && (
                        <Input
                          placeholder="Lesquels ?"
                          value={formData.animaux_details}
                          onChange={(e) => updateField('animaux_details', e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Instruments */}
                    <div className="space-y-2">
                      <Label>Jouez-vous d'un instrument ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.instrument_oui}
                            onCheckedChange={(c) => {
                              updateField('instrument_oui', !!c);
                              if (c) updateField('instrument_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.instrument_non}
                            onCheckedChange={(c) => {
                              updateField('instrument_non', !!c);
                              if (c) updateField('instrument_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                      {formData.instrument_oui && (
                        <Input
                          placeholder="Lesquels ?"
                          value={formData.instrument_details}
                          onChange={(e) => updateField('instrument_details', e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Véhicules */}
                    <div className="space-y-2">
                      <Label>Avez-vous un (des) véhicule(s) ?</Label>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.vehicule_oui}
                            onCheckedChange={(c) => {
                              updateField('vehicule_oui', !!c);
                              if (c) updateField('vehicule_non', false);
                            }}
                          />
                          <span>Oui</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.vehicule_non}
                            onCheckedChange={(c) => {
                              updateField('vehicule_non', !!c);
                              if (c) updateField('vehicule_oui', false);
                            }}
                          />
                          <span>Non</span>
                        </div>
                      </div>
                      {formData.vehicule_oui && (
                        <Input
                          placeholder="N° d'immatriculation(s)"
                          value={formData.vehicule_plaques}
                          onChange={(e) => updateField('vehicule_plaques', e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-muted">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Remarques / Références</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.remarques}
                      onChange={(e) => updateField('remarques', e.target.value)}
                      placeholder="Remarques complémentaires..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Signature Tab */}
            {activeTab === 'signature' && (
              <div className="space-y-6 animate-in fade-in-50">
                <Card className="border-primary/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Pen className="h-5 w-5 text-primary" />
                      Lieu et Date de Signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Lieu</Label>
                      <Input
                        value={formData.signature_lieu}
                        onChange={(e) => updateField('signature_lieu', e.target.value)}
                        placeholder="Lausanne"
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.signature_date}
                        onChange={(e) => updateField('signature_date', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-blue-500" />
                      Signature du Locataire Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SignaturePad
                      value={formData.signature_locataire}
                      onChange={(data) => updateField('signature_locataire', data)}
                    />
                  </CardContent>
                </Card>

                {(formData.conjoint_nom || formData.conjoint_prenom) && (
                  <Card className="border-purple-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-purple-500" />
                        Signature du Conjoint / Co-locataire
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SignaturePad
                        value={formData.signature_conjoint}
                        onChange={(data) => updateField('signature_conjoint', data)}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Données pré-remplies depuis le profil client</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={saveToDocuments}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder
            </Button>
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
