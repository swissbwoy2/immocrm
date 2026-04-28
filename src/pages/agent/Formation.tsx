import { useMemo } from 'react';
import { GraduationCap, Sparkles, Award, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CHAPTERS } from '@/features/formation/content';
import { ChapterCard } from '@/features/formation/components/ChapterCard';
import { useFormationProgress } from '@/features/formation/hooks/useFormationProgress';

export default function Formation() {
  const navigate = useNavigate();
  const { progress } = useFormationProgress();

  const stats = useMemo(() => {
    const total = CHAPTERS.length;
    const done = CHAPTERS.filter((c) => progress[c.id]?.completed_at).length;
    const lastChapter =
      CHAPTERS.find((c) => progress[c.id] && !progress[c.id]?.completed_at) ||
      CHAPTERS.find((c) => !progress[c.id]?.completed_at);
    return { total, done, pct: Math.round((done / total) * 100), lastChapter };
  }, [progress]);

  const chaptersByPartie = useMemo(
    () => ({
      application: CHAPTERS.filter((c) => c.partie === 'application'),
      metier: CHAPTERS.filter((c) => c.partie === 'metier'),
      bonus: CHAPTERS.filter((c) => c.partie === 'bonus'),
    }),
    []
  );

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-8 pb-20">
      {/* Hero */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-4 bg-primary/15 rounded-2xl">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Logisorama Academy
              </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                Formation agent
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Maîtrisez l'application et le métier de relocation
              </p>
            </div>
          </div>

          <div className="md:ml-auto md:text-right space-y-3 md:min-w-[260px]">
            <div className="flex items-center justify-between md:justify-end gap-3 text-sm">
              <span className="text-muted-foreground">Progression globale</span>
              <span className="font-bold tabular-nums">
                {stats.done}/{stats.total} chapitres
              </span>
            </div>
            <Progress value={stats.pct} className="h-2" />
            {stats.lastChapter && (
              <Button
                onClick={() => navigate(`/agent/formation/${stats.lastChapter!.id}`)}
                className="w-full md:w-auto"
              >
                {stats.done === 0 ? 'Commencer la formation' : 'Reprendre où je m\'étais arrêté'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Partie A */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Partie A — Maîtrise de Logisorama</h2>
            <p className="text-sm text-muted-foreground">
              Tour complet de l'application et de ses outils
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chaptersByPartie.application.map((c) => (
            <ChapterCard key={c.id} chapter={c} progress={progress[c.id]} />
          ))}
        </div>
      </section>

      {/* Partie B */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/15 rounded-lg">
            <TrendingUp className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Partie B — Le métier de relocation</h2>
            <p className="text-sm text-muted-foreground">
              Bonnes pratiques, scripts, sites d'annonces et workflow client
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chaptersByPartie.metier.map((c) => (
            <ChapterCard key={c.id} chapter={c} progress={progress[c.id]} />
          ))}
        </div>
      </section>

      {/* Bonus / Quiz */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Certification</h2>
            <p className="text-sm text-muted-foreground">Validez votre formation</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chaptersByPartie.bonus.map((c) => (
            <ChapterCard key={c.id} chapter={c} progress={progress[c.id]} />
          ))}
        </div>
      </section>
    </div>
  );
}
