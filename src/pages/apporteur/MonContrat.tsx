import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SignaturePad from '@/components/mandat/SignaturePad';

interface ContratData {
  contrat_signe: boolean;
  signature_data: string | null;
  date_signature: string | null;
  date_expiration: string | null;
  contrat_pdf_url: string | null;
  taux_commission: number;
  minimum_vente: number;
  minimum_location: number;
  dispositions_particulieres: string | null;
}

interface ProfileData {
  nom: string;
  prenom: string;
  email: string;
}

interface FormData {
  civilite: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone: string;
  iban: string;
  nom_banque: string;
  titulaire_compte: string;
}

export default function MonContrat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contrat, setContrat] = useState<ContratData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  
  // États pour le formulaire de signature
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  
  // État pour les champs éditables du formulaire
  const [formData, setFormData] = useState<FormData>({
    civilite: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    iban: '',
    nom_banque: '',
    titulaire_compte: '',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, prenom, email')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: apporteur } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (apporteur) {
        // Pré-remplir le formulaire avec les données existantes
        setFormData({
          civilite: apporteur.civilite || '',
          adresse: apporteur.adresse || '',
          code_postal: apporteur.code_postal || '',
          ville: apporteur.ville || '',
          telephone: apporteur.telephone || '',
          iban: apporteur.iban || '',
          nom_banque: apporteur.nom_banque || '',
          titulaire_compte: apporteur.titulaire_compte || '',
        });
        setContrat({
          contrat_signe: apporteur.contrat_signe,
          signature_data: apporteur.signature_data,
          date_signature: apporteur.date_signature,
          date_expiration: apporteur.date_expiration,
          contrat_pdf_url: apporteur.contrat_pdf_url,
          taux_commission: apporteur.taux_commission,
          minimum_vente: apporteur.minimum_vente,
          minimum_location: apporteur.minimum_location,
          dispositions_particulieres: apporteur.dispositions_particulieres,
        });
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si les informations du formulaire sont complètes
  const isFormComplete = formData.civilite && 
    formData.adresse && 
    formData.code_postal && 
    formData.ville && 
    formData.iban;

  const canSign = isFormComplete && acceptConditions && signatureData;
  
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignContract = async () => {
    if (!canSign || !user) return;

    setSigning(true);
    try {
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      const { error } = await supabase
        .from('apporteurs')
        .update({
          // Données du contrat
          contrat_signe: true,
          signature_data: signatureData,
          date_signature: now.toISOString(),
          date_expiration: expirationDate.toISOString(),
          statut: 'actif',
          // Informations personnelles du formulaire
          civilite: formData.civilite,
          adresse: formData.adresse,
          code_postal: formData.code_postal,
          ville: formData.ville,
          telephone: formData.telephone || null,
          iban: formData.iban,
          nom_banque: formData.nom_banque || null,
          titulaire_compte: formData.titulaire_compte || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Contrat signé avec succès !', {
        description: 'Votre contrat est maintenant actif pour une durée d\'un an.',
      });

      // Recharger les données
      await loadData();
      
      // Rediriger vers le dashboard après un court délai
      setTimeout(() => {
        navigate('/apporteur');
      }, 2000);

    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Erreur lors de la signature', {
        description: 'Veuillez réessayer.',
      });
    } finally {
      setSigning(false);
    }
  };

  const isExpired = contrat?.date_expiration 
    ? new Date(contrat.date_expiration) < new Date() 
    : false;

  const daysUntilExpiration = contrat?.date_expiration
    ? Math.ceil((new Date(contrat.date_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Formulaire de signature si le contrat n'est pas signé
  if (!contrat?.contrat_signe) {
    return (
      <div className="space-y-6 animate-fade-in relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
        <div>
          <h1 className="text-3xl font-bold">Signer mon contrat</h1>
          <p className="text-muted-foreground">
            Remplissez vos informations puis signez votre contrat d'apporteur d'affaires
          </p>
        </div>

        {/* Formulaire d'informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Vos informations personnelles</CardTitle>
            <CardDescription>Ces informations apparaîtront dans le contrat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Civilité */}
              <div className="space-y-2">
                <Label htmlFor="civilite">Civilité *</Label>
                <Select
                  value={formData.civilite}
                  onValueChange={(value) => handleFormChange('civilite', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => handleFormChange('telephone', e.target.value)}
                  placeholder="+41 XX XXX XX XX"
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse *</Label>
              <Input
                id="adresse"
                value={formData.adresse}
                onChange={(e) => handleFormChange('adresse', e.target.value)}
                placeholder="Rue et numéro"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Code postal */}
              <div className="space-y-2">
                <Label htmlFor="code_postal">Code postal *</Label>
                <Input
                  id="code_postal"
                  value={formData.code_postal}
                  onChange={(e) => handleFormChange('code_postal', e.target.value)}
                  placeholder="1000"
                />
              </div>
              
              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="ville">Ville *</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => handleFormChange('ville', e.target.value)}
                  placeholder="Lausanne"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-4">Coordonnées bancaires</h4>
              
              {/* IBAN */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="iban">IBAN *</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => handleFormChange('iban', e.target.value)}
                  placeholder="CH93 0076 2011 6238 5295 7"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Nom de la banque */}
                <div className="space-y-2">
                  <Label htmlFor="nom_banque">Nom de la banque</Label>
                  <Input
                    id="nom_banque"
                    value={formData.nom_banque}
                    onChange={(e) => handleFormChange('nom_banque', e.target.value)}
                    placeholder="UBS, Credit Suisse, etc."
                  />
                </div>
                
                {/* Titulaire du compte */}
                <div className="space-y-2">
                  <Label htmlFor="titulaire_compte">Titulaire du compte</Label>
                  <Input
                    id="titulaire_compte"
                    value={formData.titulaire_compte}
                    onChange={(e) => handleFormChange('titulaire_compte', e.target.value)}
                    placeholder="Nom du titulaire"
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">* Champs obligatoires</p>
          </CardContent>
        </Card>

        {/* Conditions de rémunération */}
        <Card>
          <CardHeader>
            <CardTitle>Conditions de rémunération</CardTitle>
            <CardDescription>Article 2 de votre contrat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold text-primary">{contrat?.taux_commission ?? 10}%</div>
                <div className="text-sm text-muted-foreground">Commission</div>
                <div className="text-xs text-muted-foreground mt-1">des frais d'agence</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_vente ?? 0}</div>
                <div className="text-sm text-muted-foreground">Minimum vente</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_location ?? 0}</div>
                <div className="text-sm text-muted-foreground">Minimum location</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Texte du contrat */}
        <Card>
          <CardHeader>
            <CardTitle>Contrat d'apporteur d'affaires</CardTitle>
            <CardDescription>Veuillez lire attentivement avant de signer</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <div className="space-y-4 text-sm">
              <div className="text-center font-bold text-lg mb-6">CONTRAT D'APPORTEUR D'AFFAIRES</div>
              
              <p>Entre les soussignés,</p>
              <p><strong>{formData.civilite || '[Civilité]'} {profile?.prenom || '[Prénom]'} {profile?.nom || '[Nom]'}</strong></p>
              <p>Demeurant à : {formData.adresse || '[Adresse]'}, {formData.code_postal || '[CP]'} {formData.ville || '[Ville]'}</p>
              <p>Désigné ci-après « l'apporteur d'affaires », d'une part et</p>
              
              <p className="mt-4"><strong>Immo-rama.ch</strong></p>
              <p>Chemin de l'Esparcette 5, 1023 Crissier</p>
              <p>Désigné ci-après « la société », d'autre part.</p>

              <div className="mt-6">
                <h4 className="font-bold">PRÉAMBULE :</h4>
                <p>
                  L'apporteur d'affaires, du fait de son travail et ses relations, est à même d'identifier des clients 
                  qui souhaitent vendre, acheter, louer ou mettre en location un bien immobilier et de communiquer 
                  les coordonnées à la société. La société est une agence immobilière spécialiste dans la vente, 
                  la location et la gestion. Les deux Parties conscientes de leur complémentarité ont décidé de 
                  mettre en place la présente convention pour régir leurs relations.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 1 – Objet du contrat</h4>
                <p>
                  L'apporteur d'affaires s'engage à présenter à la société des clients potentiels intéressés par 
                  l'achat, la vente, la location ou la mise en location de biens immobiliers.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 2 – Rémunération de l'apporteur d'affaires</h4>
                <p>
                  Les commissions dues à l'Apporteur d'affaires lui seront acquises dès la signature de l'acte 
                  de vente ou du bail à loyer par les clients qu'il aura présenté à la société. La société versera 
                  à l'apporteur d'affaires une commission d'apport s'élevant à {contrat?.taux_commission ?? 10}% des frais d'agence 
                  {(contrat?.minimum_vente ?? 0) > 0 && ` avec un minimum de CHF ${contrat?.minimum_vente ?? 0},- pour un bien vendu`}
                  {(contrat?.minimum_location ?? 0) > 0 && ` et un minimum de CHF ${contrat?.minimum_location ?? 0},- pour un bien loué`}.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 3 - Exigibilité de la rémunération</h4>
                <p>
                  La rémunération est payable dès la conclusion de la vente ou du bail à loyer. L'apporteur 
                  d'affaire ne perd pas son droit à rémunération si la vente ou la location intervient après 
                  l'échéance du contrat, avec un client qui avait été indiqué par l'apporteur d'affaires pendant 
                  la durée du contrat.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 4 – Durée du contrat</h4>
                <p>
                  Le présent contrat est conclu pour une durée de 1 an, à compter de sa signature, et se 
                  renouvellera tacitement pour la même durée, sauf dénonciation par l'une ou l'autre des parties, 
                  par écrit reçu quinze jours avant l'échéance.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 5 – Indépendance des parties</h4>
                <p>
                  L'apporteur d'affaires exerce son activité de manière totalement indépendante. Il n'existe 
                  aucun lien de subordination entre les parties. L'apporteur d'affaires est libre d'organiser 
                  son temps et ses méthodes de travail.
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-bold">Article 6 – Confidentialité</h4>
                <p>
                  L'apporteur d'affaires s'engage à garder confidentielles toutes les informations relatives 
                  à la société, ses clients et ses partenaires dont il aurait connaissance dans le cadre 
                  de l'exécution du présent contrat.
                </p>
              </div>

              {contrat?.dispositions_particulieres && (
                <div className="mt-4">
                  <h4 className="font-bold">Dispositions particulières :</h4>
                  <p>{contrat.dispositions_particulieres}</p>
                </div>
              )}

              <div className="mt-4">
                <h4 className="font-bold">Article 10 - Élection de for et élection de droit</h4>
                <p>a) Pour tout litige qui pourrait résulter du présent contrat, le mandant déclare accepter 
                expressément la compétence des Tribunaux du lieu du siège de l'entreprise du courtier.</p>
                <p>b) Le droit suisse est applicable.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section signature */}
        <Card>
          <CardHeader>
            <CardTitle>Signature du contrat</CardTitle>
            <CardDescription>
              Acceptez les conditions et signez ci-dessous
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Checkbox acceptation */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acceptConditions"
                checked={acceptConditions}
                onCheckedChange={(checked) => setAcceptConditions(checked === true)}
              />
              <label
                htmlFor="acceptConditions"
                className="text-sm leading-relaxed cursor-pointer"
              >
                J'ai lu et j'accepte les conditions du contrat d'apporteur d'affaires. 
                Je m'engage à respecter les termes de ce contrat.
              </label>
            </div>

            {/* Signature pad */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Votre signature :</label>
              <SignaturePad
                value={signatureData}
                onChange={setSignatureData}
              />
            </div>

            {/* Bouton de signature */}
            <Button
              onClick={handleSignContract}
              disabled={!canSign || signing}
              className="w-full"
              size="lg"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Signer le contrat
                </>
              )}
            </Button>

            {!isFormComplete && (
              <p className="text-sm text-muted-foreground text-center">
                Veuillez remplir tous les champs obligatoires (*) pour pouvoir signer.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Affichage du contrat signé
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Mon Contrat</h1>
        <p className="text-muted-foreground">
          Votre contrat d'apporteur d'affaires avec Immo-Rama
        </p>
      </div>

      {/* Statut du contrat */}
      <Card className={isExpired ? 'border-destructive' : daysUntilExpiration && daysUntilExpiration <= 30 ? 'border-orange-500' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statut du contrat
              </CardTitle>
              <CardDescription>
                Contrat d'apporteur d'affaires
              </CardDescription>
            </div>
            {isExpired ? (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expiré
              </Badge>
            ) : (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actif
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {contrat?.date_signature && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Signé le {format(new Date(contrat.date_signature), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
            {contrat?.date_expiration && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {isExpired ? 'Expiré' : 'Expire'} le {format(new Date(contrat.date_expiration), 'dd MMMM yyyy', { locale: fr })}
                  {!isExpired && daysUntilExpiration && daysUntilExpiration <= 30 && (
                    <span className="text-orange-500 ml-2">
                      ({daysUntilExpiration} jours restants)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {contrat?.contrat_pdf_url && (
            <Button variant="outline" asChild>
              <a href={contrat.contrat_pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le contrat signé (PDF)
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Conditions du contrat */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions de rémunération</CardTitle>
          <CardDescription>Article 2 de votre contrat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold text-primary">{contrat?.taux_commission ?? 10}%</div>
                <div className="text-sm text-muted-foreground">Commission</div>
                <div className="text-xs text-muted-foreground mt-1">des frais d'agence</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_vente ?? 0}</div>
                <div className="text-sm text-muted-foreground">Minimum vente</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_location ?? 0}</div>
                <div className="text-sm text-muted-foreground">Minimum location</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Texte du contrat */}
      <Card>
        <CardHeader>
          <CardTitle>Texte du contrat</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-4 text-sm">
            <div className="text-center font-bold text-lg mb-6">CONTRAT D'APPORTEUR D'AFFAIRES</div>
            
            <p>Entre les soussignés,</p>
            <p><strong>{formData.civilite} {profile?.prenom} {profile?.nom}</strong></p>
            <p>Demeurant à : {formData.adresse}, {formData.code_postal} {formData.ville}</p>
            <p>Désigné ci-après « l'apporteur d'affaires », d'une part et</p>
            
            <p className="mt-4"><strong>Immo-rama.ch</strong></p>
            <p>Chemin de l'Esparcette 5, 1023 Crissier</p>
            <p>Désigné ci-après « la société », d'autre part.</p>

            <div className="mt-6">
              <h4 className="font-bold">PRÉAMBULE :</h4>
              <p>
                L'apporteur d'affaires, du fait de son travail et ses relations, est à même d'identifier des clients 
                qui souhaitent vendre, acheter, louer ou mettre en location un bien immobilier et de communiquer 
                les coordonnées à la société. La société est une agence immobilière spécialiste dans la vente, 
                la location et la gestion. Les deux Parties conscientes de leur complémentarité ont décidé de 
                mettre en place la présente convention pour régir leurs relations.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 2 – Rémunération de l'apporteur d'affaires</h4>
              <p>
                Les commissions dues à l'Apporteur d'affaires lui seront acquises dès la signature de l'acte 
                de vente ou du bail à loyer par les clients qu'il aura présenté à la société. La société versera 
                à l'apporteur d'affaires une commission d'apport s'élevant à {contrat?.taux_commission ?? 10}% des frais d'agence 
                {(contrat?.minimum_vente ?? 0) > 0 && ` avec un minimum de CHF ${contrat?.minimum_vente ?? 0},- pour un bien vendu`}
                {(contrat?.minimum_location ?? 0) > 0 && ` et un minimum de CHF ${contrat?.minimum_location ?? 0},- pour un bien loué`}.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 3 - Exigibilité de la rémunération</h4>
              <p>
                La rémunération est payable dès la conclusion de la vente ou du bail à loyer. L'apporteur 
                d'affaire ne perd pas son droit à rémunération si la vente ou la location intervient après 
                l'échéance du contrat, avec un client qui avait été indiqué par l'apporteur d'affaires pendant 
                la durée du contrat.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 4 – Durée du contrat</h4>
              <p>
                Le présent contrat est conclu pour une durée de 1 an, à compter de sa signature, et se 
                renouvellera tacitement pour la même durée, sauf dénonciation par l'une ou l'autre des parties, 
                par écrit reçu quinze jours avant l'échéance.
              </p>
            </div>

            {contrat?.dispositions_particulieres && (
              <div className="mt-4">
                <h4 className="font-bold">Dispositions particulières :</h4>
                <p>{contrat.dispositions_particulieres}</p>
              </div>
            )}

            <div className="mt-4">
              <h4 className="font-bold">Article 10 - Élection de for et élection de droit</h4>
              <p>a) Pour tout litige qui pourrait résulter du présent contrat, le mandant déclare accepter 
              expressément la compétence des Tribunaux du lieu du siège de l'entreprise du courtier.</p>
              <p>b) Le droit suisse est applicable.</p>
            </div>

            {/* Signature */}
            {contrat?.signature_data && (
              <div className="mt-8 pt-4 border-t">
                <p className="text-muted-foreground mb-2">Signature de l'apporteur d'affaires :</p>
                <img 
                  src={contrat.signature_data} 
                  alt="Signature" 
                  className="max-w-[200px] border rounded"
                />
                {contrat.date_signature && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Signé le {format(new Date(contrat.date_signature), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
