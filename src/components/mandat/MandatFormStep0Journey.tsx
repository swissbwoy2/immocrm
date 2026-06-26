import { useNavigate } from 'react-router-dom';
import { MandatFormData } from './types';
import { Home, Building2, RotateCcw, Tag, ArrowRight } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

interface Choice {
  key: 'rental' | 'purchase' | 'reletting' | 'selling';
  icon: any;
  title: string;
  desc: string;
  /** redirect path for non-form journeys */
  redirect?: string;
}

const CHOICES: Choice[] = [
  { key: 'rental',    icon: Home,       title: 'Louer un logement',         desc: 'Trouver et signer un nouveau bail.' },
  { key: 'purchase',  icon: Building2,  title: 'Acheter un bien immobilier', desc: 'Accompagnement complet à l\'achat (60 jours).' },
  { key: 'reletting', icon: RotateCcw,  title: 'Relouer mon logement',      desc: 'Vous quittez votre bail : trouver un repreneur.', redirect: '/relouer-mon-appartement' },
  { key: 'selling',   icon: Tag,        title: 'Vendre mon bien',           desc: 'Mise en vente et accompagnement.', redirect: '/vendre-mon-bien' },
];

export default function MandatFormStep0Journey({ data, onChange }: Props) {
  const navigate = useNavigate();

  const handleClick = (c: Choice) => {
    if (c.redirect) {
      navigate(c.redirect);
      return;
    }
    if (c.key === 'purchase') {
      onChange({ journey: 'purchase', type_recherche: 'Acheter' });
    } else {
      onChange({ journey: 'rental', type_recherche: 'Louer' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Quel est votre projet immobilier&nbsp;?</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez votre parcours. Les questions qui suivent sont adaptées à votre projet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHOICES.map((c) => {
          const Icon = c.icon;
          const selected =
            (c.key === 'rental' && data.journey === 'rental') ||
            (c.key === 'purchase' && data.journey === 'purchase');
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => handleClick(c)}
              className={`group text-left rounded-xl border p-5 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${
                selected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                  : 'border-border bg-card/60 hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{c.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  {c.redirect && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Aller au parcours dédié <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {data.journey && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <strong>Parcours sélectionné :</strong>{' '}
          {data.journey === 'purchase' ? 'Acheter un bien immobilier' : 'Louer un logement'}.
          {' '}Cliquez sur Continuer pour démarrer.
        </div>
      )}
    </div>
  );
}
