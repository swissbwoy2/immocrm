import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  createdAt: string | Date;
  outgoing: boolean;
  read?: boolean;
  delivered?: boolean;
}

export function WhatsAppBubble({ content, createdAt, outgoing, read, delivered }: Props) {
  const time = format(new Date(createdAt), "HH:mm", { locale: fr });
  return (
    <div className={cn("flex w-full animate-wa-bubble", outgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[78%] sm:max-w-[70%] px-3 py-1.5 text-sm shadow-sm break-words",
          outgoing
            ? "rounded-2xl rounded-br-md bg-[hsl(var(--whatsapp-bubble-out))] text-foreground"
            : "rounded-2xl rounded-bl-md bg-[hsl(var(--whatsapp-bubble-in))] text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed pr-12">{content}</p>
        <div
          className={cn(
            "absolute bottom-1 right-2 flex items-center gap-0.5 text-[10px] leading-none",
            outgoing ? "text-foreground/55" : "text-muted-foreground",
          )}
        >
          <span>{time}</span>
          {outgoing && (
            <span className="inline-flex">
              {read ? (
                <CheckCheck className="h-3 w-3 text-[hsl(var(--whatsapp-tick))]" />
              ) : delivered ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
