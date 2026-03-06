import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Key, Home, Rocket, ShieldCheck, ArrowRight, CheckCircle, Lock, Users, FileSearch } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';
import { useSearchType } from '@/contexts/SearchTypeContext';

// A/B testable headline variants
const HEADLINE_VARIANTS = {
  A: "Nous trouvons votre appartement avec méthode, discrétion et efficacité.",
  B: "Confiez votre recherche à un service structuré, haut de gamme et orienté résultat.",
  C: "Vous n'avez plus besoin de chercher seul.",
};
const ACTIVE_HEADLINE = HEADLINE_VARIANTS.A;

const zoneOptions = [
  { value: 'Genève', label: 'Genève' },
  { value: 'Lausanne', label: 'Lausanne' },
  { value: 'Nyon', label: 'Nyon' },
  { value: 'Morges', label: 'Morges' },
  { value: 'Vevey-Montreux', label: 'Vevey / Montreux' },
  { value: 'Fribourg', label: 'Fribourg' },
  { value: 'Neuchâtel', label: 'Neuchâtel' },
  { value: 'Autre', label: 'Autre région' },
];

const budgetOptions = [
  { value: '< 1500', label: "Moins de 1'500 CHF" },
  { value: '1500-2000', label: "1'500 - 2'000 CHF" },
  { value: '2000-2500', label: "2'000 - 2'500 CHF" },
  { value: '2500-3000', label: "2'500 - 3'000 CHF" },
  { value: '3000-4000', label: "3'000 - 4'000 CHF" },
  { value: '> 4000', label: "Plus de 4'000 CHF" },
];

const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C' },
  { value: 'B', label: 'Permis B' },
  { value: 'G', label: 'Permis G' },
  { value: 'Autre', label: 'Autre' },
];

export function PremiumHero() {
  const navigate = useNavigate();
  const { searchType, setSearchType, isLocation, isAchat } = useSearchType();
  const [zone, setZone] = useState('');
  const [budget, setBudget] = useState('');
  const [permis, setPermis] = useState('');

  const handleSubmit = () => {
    const params = new URLSearchParams();
    if (zone) params.set('zone', zone);
    if (budget) params.set('budget', budget);
    if (permis) params.set('permis', permis);
    const qs = params.toString();
    navigate(`/nouveau-mandat${qs ? '?' + qs : ''}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/95" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* N°1 Badge */}
          <div className="animate-fade-in mb-2 md:mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-full px-3 py-1.5 md:px-5 md:py-2.5">
              <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
              <span className="text-xs md:text-base font-semibold text-amber-500">
                ⭐ Chasseur immobilier N°1 en Suisse romande
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="animate-fade-in mb-2 md:mb-4" style={{ animationDelay: '50ms' }}>
            <img src={logoImmoRama} alt="Immo-Rama" className="h-16 md:h-32 w-auto drop-shadow-2xl" />
          </div>

          {/* Slogan */}
          <div className="animate-fade-in mb-3 md:mb-6" style={{ animationDelay: '75ms' }}>
            <span className="text-base md:text-xl font-semibold text-primary tracking-wide">L'immobilier accessible</span>
          </div>

          {/* Tab Selector */}
          <div className="animate-fade-in mb-3 md:mb-6 w-full max-w-md" style={{ animationDelay: '85ms' }}>
            <div className="flex rounded-xl border-2 border-primary/30 bg-background/80 backdrop-blur-sm p-1 gap-1">
              <button
                onClick={() => setSearchType('location')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isLocation || !searchType
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                }`}
              >
                <Key className="h-5 w-5" />
                <span>Je cherche à louer</span>
              </button>
              <button
                onClick={() => setSearchType('achat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 md:py-3 md:px-4 rounded-lg font-semibold transition-all duration-300 ${
                  isAchat
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>Je cherche à acheter</span>
              </button>
            </div>
          </div>

          {/* === LOCATION PREMIUM CONTENT === */}
          {(isLocation || !searchType) && (
            <div className="animate-fade-in space-y-6 md:space-y-8 w-full">
              {/* Eyebrow */}
              <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium">
                Recherche locative accompagnée en Suisse romande
              </p>

              {/* H1 */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
                {ACTIVE_HEADLINE}
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Un agent dédié vous accompagne à chaque étape : recherche ciblée, sélection des opportunités, organisation des visites et transmission du dossier aux bonnes régies.
              </p>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium text-foreground">+500 familles accompagnées</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>4.8★ Google</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>Réponse sous 24h</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>90 jours ou remboursé</span>
              </div>

              {/* Mini-form */}
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 shadow-lg shadow-primary/5 max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger className="h-11 bg-background border-border/50">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zoneOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger className="h-11 bg-background border-border/50">
                      <SelectValue placeholder="Budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={permis} onValueChange={setPermis}>
                    <SelectTrigger className="h-11 bg-background border-border/50">
                      <SelectValue placeholder="Permis / Situation" />
                    </SelectTrigger>
                    <SelectContent>
                      {permisOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="w-full group shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-base md:text-lg py-6"
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Activer ma recherche maintenant
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground mt-3">
                  Gratuit · Sans engagement · Réponse sous 24h
                </p>
              </div>

              {/* CTA secondaire */}
              <a
                href="#comment-ca-marche"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Voir comment ça marche
                <ArrowRight className="h-4 w-4" />
              </a>

              {/* Offer block */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Acompte 300 CHF
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Commission uniquement en cas de succès
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Remboursement si échec après 90 jours
                </span>
              </div>
            </div>
          )}

          {/* === ACHAT CONTENT (legacy, inchangé) === */}
          {isAchat && (
            <div className="animate-fade-in space-y-4 w-full">
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground">
                Trouve ton bien idéal <span className="text-primary">avant qu'il soit sur le marché</span>
              </h1>

              <p className="text-base md:text-2xl font-semibold text-foreground">
                Accès exclusif à{' '}
                <span className="text-primary">des biens off-market dans ta région</span>
              </p>

              <p className="text-sm md:text-lg text-primary font-medium">
                🏡 Commission: 1% du prix d'achat (acompte déduit)
              </p>

              <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Nos experts cherchent, sélectionnent et contactent les vendeurs pour toi, afin de{' '}
                <strong className="text-foreground">maximiser tes chances de trouver plus vite et mieux</strong>.
              </p>

              {/* Promise box achat */}
              <div className="mx-auto max-w-lg">
                <div className="rounded-xl md:rounded-2xl px-4 md:px-8 py-3 md:py-5 border-2 border-green-500/50 bg-green-500/10 shadow-lg">
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                    <span className="text-base md:text-2xl font-bold text-foreground">
                      6 mois de recherche • Remboursé si échec
                    </span>
                  </div>
                </div>
              </div>

              {/* CTAs achat */}
              <div className="flex flex-col items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group text-base md:text-2xl px-8 md:px-14 py-5 md:py-9 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
                >
                  <Link to="/nouveau-mandat">
                    <Rocket className="mr-3 h-6 w-6 md:h-7 md:w-7" />
                    <span className="font-bold">Trouver mon bien idéal</span>
                    <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span>Sans engagement • Aucune carte de crédit requise</span>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group text-sm md:text-base px-6 md:px-8 py-4 md:py-5 border-2 border-green-500/40 hover:border-green-500 hover:bg-green-500/5 text-green-600 hover:text-green-700 transition-all duration-300"
                >
                  <a href="#analyse-dossier">
                    <FileSearch className="mr-2 h-5 w-5" />
                    <span>Analyse gratuite de solvabilité</span>
                  </a>
                </Button>

                {/* Trust signals achat */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    Acompte 2'500 CHF
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    Mandat de 6 mois
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    Acompte déduit de la commission
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Login link (commun) */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/login">Déjà client ? Se connecter</Link>
            </Button>
          </div>

          {/* Trust block (commun) */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 border border-border/40">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">
                  {isAchat ? '+150 biens vendus' : '+500 familles accompagnées'}
                </span>{' '}
                avec succès
              </span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>
                {isAchat
                  ? '🇨🇭 Service premium • Commission 1% • Remboursé après 6 mois sans succès'
                  : '🇨🇭 Service premium • Mandat de 90 jours • Transparence totale'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-7 h-12 border-2 border-primary/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
