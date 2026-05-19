import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Key, Home, MapPin, CheckCircle, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import heroBg from '@/assets/hero-bg.jpg';

export function PremiumHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/85 to-background/95" />
      </div>

      <div className="container mx-auto px-4 py-10 md:py-20 relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          {/* Badge top */}
          <div className="animate-fade-in mb-3 md:mb-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-full px-4 py-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm font-semibold text-primary">
                À nos bureaux de Crissier · Analyse gratuite
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="animate-fade-in mb-2 md:mb-4" style={{ animationDelay: '50ms' }}>
            <img src={logoImmoRama} alt="Immo-Rama" className="h-14 md:h-24 w-auto drop-shadow-2xl" />
          </div>

          {/* Slogan */}
          <div className="animate-fade-in mb-4 md:mb-6" style={{ animationDelay: '75ms' }}>
            <span className="text-sm md:text-lg font-semibold text-primary tracking-wide">L'immobilier accessible</span>
          </div>

          {/* H1 */}
          <h1 className="animate-fade-in text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight max-w-4xl mb-4 md:mb-6" style={{ animationDelay: '100ms' }}>
            Fais analyser ton dossier <span className="text-primary">gratuitement</span> avant d'envoyer tes candidatures
          </h1>

          {/* Sous-titre */}
          <p className="animate-fade-in text-base md:text-lg text-muted-foreground max-w-3xl mb-8 md:mb-10 leading-relaxed" style={{ animationDelay: '150ms' }}>
            Tu cherches un logement en Suisse romande ?<br className="hidden sm:inline" />
            En 30 minutes, un expert Logisorama vérifie ton dossier, tes critères et tes chances réelles auprès des régies.
          </p>

          {/* Deux blocs */}
          <div className="animate-fade-in grid md:grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl mb-8 md:mb-10" style={{ animationDelay: '200ms' }}>
            {/* Gauche */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-5 md:p-6 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-base md:text-lg font-bold text-foreground">Analyse personnalisée de ton dossier</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Nos experts te disent clairement :</p>
              <ul className="space-y-2 text-sm text-foreground/90">
                <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> ce qui joue en ta faveur</li>
                <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> ce qui bloque tes candidatures</li>
                <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> comment améliorer ton dossier</li>
                <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" /> quels logements viser selon ta situation</li>
              </ul>
              <p className="text-xs md:text-sm text-primary font-semibold mt-4">
                Objectif : augmenter tes chances d'obtenir un logement rapidement.
              </p>
            </div>

            {/* Droite */}
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-5 md:p-6 text-left">
              <h2 className="text-base md:text-lg font-bold text-foreground mb-3">
                500+ familles accompagnées avec succès
              </h2>
              <ul className="space-y-2 text-sm text-foreground/90">
                <li>⭐ Dossiers analysés</li>
                <li>🏠 Recherches ciblées</li>
                <li>📩 Candidatures mieux présentées</li>
                <li>🤝 Accompagnement par un agent dédié</li>
              </ul>
              <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">RDV gratuit · Sans engagement · 30 minutes</span>
              </div>
            </div>
          </div>

          {/* Phrase de conversion */}
          <p className="animate-fade-in text-base md:text-lg font-semibold text-foreground max-w-3xl mb-5 md:mb-6" style={{ animationDelay: '250ms' }}>
            Ne laisse plus ton dossier être refusé sans comprendre pourquoi.<br className="hidden sm:inline" />
            <span className="text-primary">Réserve ton analyse gratuite maintenant.</span>
          </p>

          {/* Deux gros CTA */}
          <div className="animate-fade-in grid sm:grid-cols-2 gap-4 w-full max-w-3xl mb-3" style={{ animationDelay: '300ms' }}>
            <Button
              asChild
              size="lg"
              className="group h-auto py-5 md:py-6 flex-col gap-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
            >
              <Link to="/rendez-vous?type=location">
                <span className="flex items-center gap-2 text-lg md:text-xl font-bold">
                  <Key className="h-5 w-5" />
                  Je cherche une location
                </span>
                <span className="text-sm font-medium opacity-90 flex items-center gap-1">
                  Réserver mon analyse gratuite
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-auto py-5 md:py-6 flex-col gap-1 border-2 border-primary/40 hover:border-primary hover:bg-primary/5 shadow-lg hover:scale-[1.02] transition-all"
            >
              <Link to="/rendez-vous?type=achat">
                <span className="flex items-center gap-2 text-lg md:text-xl font-bold text-foreground">
                  <Home className="h-5 w-5 text-primary" />
                  Je veux acheter un bien
                </span>
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Réserver mon analyse gratuite
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
          </div>

          {/* Sous-texte CTA */}
          <p className="animate-fade-in text-sm text-muted-foreground mb-6" style={{ animationDelay: '320ms' }}>
            Choisis ton projet et réserve directement ton rendez-vous au bureau.
          </p>

          {/* Réassurance */}
          <div className="animate-fade-in flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground mb-4" style={{ animationDelay: '350ms' }}>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Gratuit</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Sans engagement</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary" /> 30 minutes</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> Bureau de Crissier</span>
          </div>

          {/* Lien secondaire activation */}
          <div className="animate-fade-in flex flex-col items-center gap-2" style={{ animationDelay: '400ms' }}>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Link to="/nouveau-mandat">Préfères tout faire en ligne ? Activer ma recherche</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/login">Déjà client ? Se connecter</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
