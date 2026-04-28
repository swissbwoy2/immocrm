import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Block } from '../types';
import { InteractiveChecklist } from './InteractiveChecklist';
import { QuizBlock } from './QuizBlock';
import { VideoBlock } from './VideoBlock';
import { ScriptBlock } from './ScriptBlock';
import { SitesGrid } from './SitesGrid';
import { FeatureTour } from './FeatureTour';

interface Props {
  block: Block;
  chapitreId: string;
  checklistState: Record<string, boolean>;
  onChecklistToggle: (checklistId: string, itemId: string, checked: boolean) => void;
  onQuizComplete: (score: number) => void;
  initialQuizScore?: number | null;
}

const TIP_STYLES = {
  tip: { Icon: Lightbulb, cls: 'border-l-yellow-500 bg-yellow-500/5 text-yellow-900 dark:text-yellow-200' },
  warning: { Icon: AlertTriangle, cls: 'border-l-orange-500 bg-orange-500/5 text-orange-900 dark:text-orange-200' },
  info: { Icon: Info, cls: 'border-l-blue-500 bg-blue-500/5 text-blue-900 dark:text-blue-200' },
  success: { Icon: CheckCircle2, cls: 'border-l-green-500 bg-green-500/5 text-green-900 dark:text-green-200' },
};

export function BlockRenderer({
  block,
  chapitreId,
  checklistState,
  onChecklistToggle,
  onQuizComplete,
  initialQuizScore,
}: Props) {
  const navigate = useNavigate();

  switch (block.type) {
    case 'heading': {
      const Tag = (block.level === 3 ? 'h3' : 'h2') as 'h2' | 'h3';
      return (
        <Tag className={cn('font-bold scroll-mt-24', block.level === 3 ? 'text-xl mt-6' : 'text-2xl mt-8')}>
          {block.content}
        </Tag>
      );
    }
    case 'text':
      return <p className="text-sm md:text-base leading-relaxed text-foreground/90">{block.content}</p>;

    case 'list':
      if (block.ordered) {
        return (
          <ol className="list-decimal pl-5 space-y-2 text-sm md:text-base">
            {block.items.map((it, i) => (
              <li key={i} className="leading-relaxed">{it}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="space-y-2 text-sm md:text-base">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <span className="text-primary mt-1.5 shrink-0">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );

    case 'tip': {
      const { Icon, cls } = TIP_STYLES[block.variant || 'tip'];
      return (
        <Card className={cn('p-4 border-l-4 flex gap-3', cls)}>
          <Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{block.content}</p>
        </Card>
      );
    }

    case 'video':
      return <VideoBlock title={block.title} src={block.src} poster={block.poster} duration={block.duration} />;

    case 'screenshot':
      return (
        <figure className="space-y-2">
          <img src={block.src} alt={block.alt} className="w-full rounded-lg border shadow-sm" loading="lazy" />
          {block.caption && (
            <figcaption className="text-xs text-muted-foreground text-center italic">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'feature-tour':
      return <FeatureTour items={block.items} />;

    case 'checklist':
      return (
        <InteractiveChecklist
          id={block.id}
          title={block.title}
          items={block.items}
          state={checklistState}
          onToggle={(itemId, checked) => onChecklistToggle(block.id, itemId, checked)}
        />
      );

    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-t hover:bg-muted/20">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption && (
            <p className="text-xs text-muted-foreground italic mt-2">{block.caption}</p>
          )}
        </div>
      );

    case 'script':
      return <ScriptBlock title={block.title} content={block.content} variant={block.variant} />;

    case 'sites-grid':
      return <SitesGrid items={block.items} />;

    case 'cta':
      return (
        <Card className="p-5 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="font-semibold">{block.label}</div>
              {block.description && (
                <p className="text-xs text-muted-foreground mt-1">{block.description}</p>
              )}
            </div>
            <Button onClick={() => navigate(block.path)} className="shrink-0">
              Ouvrir <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      );

    case 'quiz':
      return (
        <QuizBlock
          id={block.id}
          questions={block.questions}
          onComplete={onQuizComplete}
          initialScore={initialQuizScore}
        />
      );

    default:
      return null;
  }
}
