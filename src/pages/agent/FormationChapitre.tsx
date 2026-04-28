import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import { getChapterById, getNextChapter, getPrevChapter } from '@/features/formation/content';
import { BlockRenderer } from '@/features/formation/components/BlockRenderer';
import { useFormationProgress } from '@/features/formation/hooks/useFormationProgress';

export default function FormationChapitre() {
  const { chapitreId } = useParams();
  const navigate = useNavigate();
  const chapter = chapitreId ? getChapterById(chapitreId) : undefined;
  const { progress, toggleChecklistItem, markCompleted, saveQuizScore } = useFormationProgress();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chapitreId]);

  const checklistState = useMemo(
    () => (chapter ? progress[chapter.id]?.checklist_state || {} : {}),
    [chapter, progress]
  );

  const initialQuizScore = chapter ? progress[chapter.id]?.quiz_score : null;
  const completed = chapter ? !!progress[chapter.id]?.completed_at : false;

  if (!chapter) {
    return (
      <div className="container max-w-3xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Chapitre introuvable.</p>
        <Button onClick={() => navigate('/agent/formation')} className="mt-4">
          Retour à la formation
        </Button>
      </div>
    );
  }

  const Icon = chapter.icon;
  const next = getNextChapter(chapter.id);
  const prev = getPrevChapter(chapter.id);

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      {/* Breadcrumb / back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/agent/formation')}
        className="-ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour à la formation
      </Button>

      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              <span>Chapitre {chapter.numero}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {chapter.duree}
              </span>
              {completed && (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20 ml-2 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Terminé
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{chapter.titre}</h1>
            <p className="text-muted-foreground mt-2">{chapter.description}</p>
          </div>
        </div>
      </Card>

      {/* Blocks */}
      <article className="space-y-5">
        {chapter.blocks.map((block, idx) => (
          <BlockRenderer
            key={idx}
            block={block}
            chapitreId={chapter.id}
            checklistState={checklistState}
            onChecklistToggle={(checklistId, itemId, checked) =>
              toggleChecklistItem(chapter.id, checklistId, itemId, checked)
            }
            onQuizComplete={(score) => saveQuizScore(chapter.id, score)}
            initialQuizScore={initialQuizScore}
          />
        ))}
      </article>

      {/* Mark as completed */}
      {!completed && !chapter.blocks.some((b) => b.type === 'quiz') && (
        <Card className="p-5 bg-primary/5 border-primary/20 text-center">
          <GraduationCap className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Vous avez parcouru ce chapitre ? Marquez-le comme terminé.
          </p>
          <Button onClick={() => markCompleted(chapter.id)}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Marquer comme terminé
          </Button>
        </Card>
      )}

      {/* Navigation */}
      <nav className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        {prev ? (
          <Button
            variant="outline"
            onClick={() => navigate(`/agent/formation/${prev.id}`)}
            className="flex-1 justify-start h-auto py-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-xs text-muted-foreground">Précédent</div>
              <div className="text-sm font-medium truncate">{prev.titre}</div>
            </div>
          </Button>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Button
            onClick={() => navigate(`/agent/formation/${next.id}`)}
            className="flex-1 justify-end h-auto py-3"
          >
            <div className="text-right min-w-0">
              <div className="text-xs opacity-80">Suivant</div>
              <div className="text-sm font-medium truncate">{next.titre}</div>
            </div>
            <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate('/agent/formation')}
            className="flex-1 justify-end h-auto py-3"
          >
            <div className="text-right">
              <div className="text-xs opacity-80">Retour</div>
              <div className="text-sm font-medium">Centre de formation</div>
            </div>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </nav>
    </div>
  );
}
