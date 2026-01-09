import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Building2, HardHat, ArrowRight, ArrowLeft, Check, 
  Mail, Lock, Phone, MapPin, FileText, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

type AnnonceurType = 'particulier' | 'agence' | 'promoteur';

interface FormData {
  type_annonceur: AnnonceurType;
  civilite: string;
  nom: string;
  prenom: string;
  nom_entreprise: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  password: string;
  confirmPassword: string;
  acceptCGU: boolean;
}

export default function InscriptionAnnonceur() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    type_annonceur: 'particulier',
    civilite: '',
    nom: '',
    prenom: '',
    nom_entreprise: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    password: '',
    confirmPassword: '',
    acceptCGU: false,
  });

  const typeOptions: { value: AnnonceurType; label: string; description: string; icon: any }[] = [
    { 
      value: 'particulier', 
      label: 'Particulier', 
      description: 'Je vends ou loue mon bien personnel',
      icon: User 
    },
    { 
      value: 'agence', 
      label: 'Agence immobilière', 
      description: 'Je suis un professionnel de l\'immobilier',
      icon: Building2 
    },
    { 
      value: 'promoteur', 
      label: 'Promoteur / Constructeur', 
      description: 'Je commercialise des programmes neufs',
      icon: HardHat 
    },
  ];

  const registerMutation = useMutation({
    mutationFn: async () => {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/espace-annonceur`,
          data: {
            nom: formData.nom,
            prenom: formData.prenom,
            type: 'annonceur'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      // 2. Create annonceur profile
      const { error: annonceurError } = await supabase
        .from('annonceurs')
        .insert({
          user_id: authData.user.id,
          type_annonceur: formData.type_annonceur,
          civilite: formData.civilite || null,
          nom: formData.nom,
          prenom: formData.prenom || null,
          nom_entreprise: formData.type_annonceur !== 'particulier' ? formData.nom_entreprise : null,
          email: formData.email,
          telephone: formData.telephone || null,
          adresse: formData.adresse || null,
          code_postal: formData.code_postal || null,
          ville: formData.ville || null,
          statut: 'actif',
        });

      if (annonceurError) throw annonceurError;

      // 3. Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'annonceur' as any // Cast needed as annonceur might not be in the enum yet
        });

      // Role error is not critical for now
      if (roleError) {
        console.warn('Role creation warning:', roleError);
      }

      return authData;
    },
    onSuccess: () => {
      toast.success('Compte créé avec succès ! Vérifiez votre email.');
      navigate('/connexion-annonceur');
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error(error.message || 'Erreur lors de l\'inscription');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.nom || !formData.email) {
        toast.error('Veuillez remplir les champs obligatoires');
        return;
      }
      if (formData.type_annonceur !== 'particulier' && !formData.nom_entreprise) {
        toast.error('Veuillez renseigner le nom de votre entreprise');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.password || formData.password.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }
      if (!formData.acceptCGU) {
        toast.error('Veuillez accepter les conditions générales');
        return;
      }
      registerMutation.mutate();
    }
  };

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <PublicHeader />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    s < step ? 'bg-success text-success-foreground' :
                    s === step ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {s < step ? <Check className="h-5 w-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded ${s < step ? 'bg-success' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>

            <Card className="p-6 md:p-8">
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {/* Step 1: Choose Type */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold mb-2">Créer un compte annonceur</h1>
                        <p className="text-muted-foreground">Quel type d'annonceur êtes-vous ?</p>
                      </div>

                      <div className="space-y-3">
                        {typeOptions.map((option) => {
                          const IconComponent = option.icon;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateField('type_annonceur', option.value)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                                formData.type_annonceur === option.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                formData.type_annonceur === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}>
                                <IconComponent className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-semibold">{option.label}</p>
                                <p className="text-sm text-muted-foreground">{option.description}</p>
                              </div>
                              {formData.type_annonceur === option.value && (
                                <Check className="h-5 w-5 text-primary ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <Button type="submit" className="w-full" size="lg">
                        Continuer
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2: Personal Info */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold mb-2">Vos informations</h1>
                        <p className="text-muted-foreground">
                          {formData.type_annonceur === 'particulier' 
                            ? 'Informations personnelles' 
                            : 'Informations de votre entreprise'}
                        </p>
                      </div>

                      {formData.type_annonceur !== 'particulier' && (
                        <div className="space-y-2">
                          <Label htmlFor="nom_entreprise">Nom de l'entreprise *</Label>
                          <Input
                            id="nom_entreprise"
                            value={formData.nom_entreprise}
                            onChange={(e) => updateField('nom_entreprise', e.target.value)}
                            placeholder="Ma Société SA"
                            required
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="prenom">Prénom</Label>
                          <Input
                            id="prenom"
                            value={formData.prenom}
                            onChange={(e) => updateField('prenom', e.target.value)}
                            placeholder="Jean"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom *</Label>
                          <Input
                            id="nom"
                            value={formData.nom}
                            onChange={(e) => updateField('nom', e.target.value)}
                            placeholder="Dupont"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="jean@example.com"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="telephone"
                            type="tel"
                            value={formData.telephone}
                            onChange={(e) => updateField('telephone', e.target.value)}
                            placeholder="+41 XX XXX XX XX"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="ville">Ville</Label>
                          <Input
                            id="ville"
                            value={formData.ville}
                            onChange={(e) => updateField('ville', e.target.value)}
                            placeholder="Genève"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code_postal">NPA</Label>
                          <Input
                            id="code_postal"
                            value={formData.code_postal}
                            onChange={(e) => updateField('code_postal', e.target.value)}
                            placeholder="1200"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Retour
                        </Button>
                        <Button type="submit" className="flex-1">
                          Continuer
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Password & Confirm */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold mb-2">Créer votre mot de passe</h1>
                        <p className="text-muted-foreground">Sécurisez votre compte</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder="Minimum 8 caractères"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => updateField('confirmPassword', e.target.value)}
                            placeholder="Retapez votre mot de passe"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <Checkbox
                          id="acceptCGU"
                          checked={formData.acceptCGU}
                          onCheckedChange={(checked) => updateField('acceptCGU', checked)}
                        />
                        <label htmlFor="acceptCGU" className="text-sm leading-tight cursor-pointer">
                          J'accepte les <Link to="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</Link> et 
                          la <Link to="/confidentialite" className="text-primary hover:underline">Politique de Confidentialité</Link>
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(2)}>
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Retour
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Création...
                            </>
                          ) : (
                            <>
                              Créer mon compte
                              <Check className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <Link to="/connexion-annonceur" className="text-primary font-medium hover:underline">
                  Se connecter
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}