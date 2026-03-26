import christPhoto from '@/assets/team/christ-ramazani.png';
import { Badge } from '@/components/ui/badge';

const teamMembers = [
  {
    name: 'Christ Ramazani',
    role: "Directeur d'agence – Courtier location et vente",
    photo: christPhoto,
  },
];

export function TeamSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Notre équipe
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Des experts passionnés à votre service pour vous accompagner dans tous vos projets immobiliers.
          </p>
        </div>

        {/* Team grid */}
        <div className="flex justify-center">
          {teamMembers.map((member, index) => (
            <div
              key={member.name}
              className="flex flex-col items-center text-center animate-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Circular photo */}
              <div className="relative mb-5">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-snug">
                {member.role}
              </p>
              <Badge variant="secondary" className="text-xs">
                Courtage &amp; Relocation
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
