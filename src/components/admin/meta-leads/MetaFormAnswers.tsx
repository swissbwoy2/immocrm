import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { extractAnswers, type MetaLead } from "./types";

interface Props {
  lead: MetaLead;
}

export function MetaFormAnswers({ lead }: Props) {
  const entries = extractAnswers(lead);

  if (entries.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-3 px-3 rounded-md border border-dashed">
        Aucune réponse de formulaire enregistrée.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <Card key={i} className="p-3 bg-muted/30 border-border/60">
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-md bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center flex-shrink-0">
              <HelpCircle className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-foreground/80 leading-snug">
                {e.question}
              </div>
              <div className="text-sm text-foreground break-words leading-snug">
                → {e.answer}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
