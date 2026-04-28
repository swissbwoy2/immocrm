import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Chapter } from '../types';
import type { ChapterProgress } from '../hooks/useFormationProgress';

interface Props {
  chapter: Chapter;
  progress?: ChapterProgress;
}

export function ChapterCard({ chapter, progress }: Props) {
  const navigate = useNavigate();
  const Icon = chapter.icon;
  const completed = !!progress?.completed_at;

  // Compute checklist progress %
  const allChecklists = chapter.blocks.filter((b) => b.type === 'checklist') as any[];
  const totalItems = allChecklists.reduce((s, c) => s + c.items.length, 0);
  const checked = allChecklists.reduce((s, c) => {
    return s + c.items.filter((it: any) => progress?.checklist_state?.[`${c.id}.${it.id}`]).length;
  }, 0);
  const checklistPct = totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0;

  let status: 'todo' | 'in-progress' | 'done' = 'todo';
  if (completed) status = 'done';
  else if (checked > 0) status = 'in-progress';

  return (
    <Card
      onClick={() => navigate(`/agent/formation/${chapter.id}`)}
      className={cn(
        'p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 group relative overflow-hidden h-full flex flex-col',
        completed && 'border-green-500/40 bg-green-500/5'
      )}
    >
      {chapter.isNew && (
        <Badge className="absolute top-3 right-3 gap-1 bg-accent text-accent-foreground">
          <Sparkles className="w-3 h-3" /> Nouveau
        </Badge>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-3 rounded-xl shrink-0', completed ? 'bg-green-500/20' : 'bg-primary/10')}>
          {completed ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <Icon className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Chapitre {chapter.numero}
          </div>
          <h3 className="font-semibold text-base leading-tight">{chapter.titre}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">{chapter.description}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" /> {chapter.duree}
          </span>
          {status === 'done' && <span className="text-green-600 font-medium">Terminé ✓</span>}
          {status === 'in-progress' && <span className="text-primary font-medium">{checklistPct}%</span>}
          {status === 'todo' && <span className="text-muted-foreground">À démarrer</span>}
        </div>
        {totalItems > 0 && status !== 'done' && (
          <Progress value={checklistPct} className="h-1.5" />
        )}
      </div>

      <div className="flex items-center justify-end mt-3 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Ouvrir <ArrowRight className="w-4 h-4 ml-1" />
      </div>
    </Card>
  );
}
