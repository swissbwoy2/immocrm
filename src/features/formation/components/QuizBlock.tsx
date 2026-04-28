import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Award, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion } from '../types';

interface Props {
  id: string;
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  initialScore?: number | null;
}

export function QuizBlock({ id, questions, onComplete, initialScore }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(initialScore !== null && initialScore !== undefined);
  const [score, setScore] = useState<number | null>(initialScore ?? null);

  const handleSubmit = () => {
    const correct = questions.filter((q) => answers[q.id] === q.correct).length;
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);
    onComplete(finalScore);
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Award className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Quiz de validation</h3>
          <p className="text-sm text-muted-foreground">
            {questions.length} question{questions.length > 1 ? 's' : ''} pour valider vos acquis
          </p>
        </div>
      </div>

      {submitted && score !== null && (
        <div
          className={cn(
            'mb-6 p-4 rounded-lg flex items-center gap-3',
            score >= 70 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
          )}
        >
          {score >= 70 ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          <div className="flex-1">
            <div className="font-semibold">Score : {score}%</div>
            <div className="text-sm opacity-80">
              {score >= 70 ? 'Bravo, vous maîtrisez ce chapitre !' : 'Relisez le chapitre et réessayez.'}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Recommencer
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <div className="font-medium">
              <span className="text-primary mr-2">{idx + 1}.</span>
              {q.question}
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.id;
                const isCorrect = opt.id === q.correct;
                const showResult = submitted;
                return (
                  <button
                    key={opt.id}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border min-h-[44px] transition-colors',
                      'hover:bg-muted/50 cursor-pointer disabled:cursor-default',
                      isSelected && !showResult && 'border-primary bg-primary/10',
                      showResult && isCorrect && 'border-green-500 bg-green-500/10',
                      showResult && isSelected && !isCorrect && 'border-red-500 bg-red-500/10',
                      !isSelected && !showResult && 'border-border'
                    )}
                  >
                    <span className="text-sm">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <p className="text-xs text-muted-foreground italic pl-4 border-l-2 border-primary/30">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered} className="mt-6 w-full md:w-auto">
          Valider mes réponses
        </Button>
      )}
    </Card>
  );
}
