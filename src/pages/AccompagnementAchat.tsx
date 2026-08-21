import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Banknote, Eye, Handshake, Scale, Key, CheckCircle2, Clock, ShieldCheck, Sparkles } from 'lucide-react';

export default function AccompagnementAchat() {
  useEffect(() => {
    document.title = 'Accompagnement à l\'achat immobilier | Immo-Rama';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content',
        'Accompagnement complet à l\'achat immobilier en Suisse : validation bancaire 24-48 h, courtier qui visite pour vous, négociation et signature notariée. Mandat 6 mois jusqu\'à la remise des clés.',
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      {/* HERO */}
      <section className="container mx-auto px-4 py-16 md:py-24 max-w-5xl text-center">
        <Badge className="bg-sky-600 text-white border-0 mb-4">
          <Home className="h-3 w-3 mr-1" /> Accompagnement acheteur — Immo-Rama
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-sky-900 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
          Devenez propriétaire en toute sérénité
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Validation bancaire en 24 à 48 heures, biens sélectionnés et visités par notre courtier,
          offre d'achat défendue à votre place, suivi notarial jusqu'à la remise des clés.
          Mandat d'accompagnement 6 mois.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Button size="lg" className="bg-sky-600 hover:bg-sky-700" asChild>
            <Link to="/formulaire-relouer?intention=achat">Activer mon accompagnement achat</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/formulaire-relouer?intention=validation_bancaire">Obtenir ma validation bancaire</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="border-sky-200">Commission 1 % du prix — activation CHF 2'500</Badge>
          <Badge variant="outline" className="border-sky-200">Validation bancaire 24-48 h</Badge>
          <Badge variant="outline" className="border-sky-200">Mandat 6 mois</Badge>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="container mx-auto px-4 pb-16 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ValueProp icon={Banknote} title="Capacité d'achat fiable"
            text="Tenue des charges calculée selon les règles bancaires suisses : taux d'intérêt théorique, amortissement et entretien." />
          <ValueProp icon={Eye} title="Courtier qui visite pour vous"
            text="Notre courtier visite les biens à votre place et produit un rapport détaillé : points forts, risques, estimation, recommandation." />
          <ValueProp icon={Handshake} title="Offre & négociation"
            text="Nous préparons et défendons votre offre d'achat, gérons les contre-offres et la négociation finale." />
          <ValueProp icon={Scale} title="Suivi notarial"
            text="Coordination avec le notaire, préparation des documents, accompagnement à la signature de l'acte authentique." />
          <ValueProp icon={Key} title="Remise des clés"
            text="Présence à la remise des clés, état des lieux et premières démarches de propriétaire." />
          <ValueProp icon={ShieldCheck} title="Transparence totale"
            text="Commission de 1 % du prix (min. CHF 500, + TVA si due). Activation CHF 2'500 imputée sur la commission, solde à la remise des clés. Aucune commission cachée." />
        </div>
      </section>

      {/* PROCESS — 6 ÉTAPES */}
      <section className="container mx-auto px-4 pb-16 max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Le parcours en 6 grandes étapes</h2>
        <div className="space-y-4">
          {[
            { n: 1, title: 'Activation', text: 'Vous payez l\'acompte CHF 2\'499 et signez votre mandat d\'accompagnement. Rendez-vous de cadrage avec votre conseiller.' },
            { n: 2, title: 'Financement', text: 'Documents transmis, capacité d\'achat calculée, dossier envoyé à notre partenaire bancaire. Validation reçue en 24-48 h.' },
            { n: 3, title: 'Recherche', text: 'Critères définis, biens sélectionnés et analysés par notre équipe en fonction de votre budget validé.' },
            { n: 4, title: 'Visites & contre-visites', text: 'Notre courtier visite à votre place, vous remet un rapport, et vous accompagne en contre-visite sur les biens retenus.' },
            { n: 5, title: 'Offre d\'achat & négociation', text: 'Nous préparons votre offre d\'achat, gérons les contre-offres, défendons votre dossier face au vendeur ou à la régie.' },
            { n: 6, title: 'Notaire & remise des clés', text: 'Coordination notariale, signature de l\'acte authentique, état des lieux et remise des clés.' },
          ].map((s) => (
            <Card key={s.n} className="p-5 border-sky-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <Card className="p-8 md:p-12 border-sky-200 bg-white/80 backdrop-blur">
          <Sparkles className="h-10 w-10 text-sky-600 mx-auto mb-3" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Démarrer votre projet d'achat aujourd'hui</h2>
          <p className="text-muted-foreground mb-6">
            Avec votre mandat de 6 mois, vous passez de l'idée d'achat à la remise des clés, encadré par une équipe spécialisée.
          </p>
          <Button size="lg" className="bg-sky-600 hover:bg-sky-700" asChild>
            <Link to="/formulaire-relouer?intention=achat">Démarrer mon projet d'achat</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}

function ValueProp({ icon: Icon, title, text }: any) {
  return (
    <Card className="p-5 border-sky-100 hover:border-sky-200 transition">
      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
