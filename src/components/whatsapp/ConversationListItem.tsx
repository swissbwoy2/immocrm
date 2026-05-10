import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { LeadAvatar } from "./LeadAvatar";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

interface Props {
  name: string;
  preview: string;
  createdAt: string;
  unread?: boolean;
  active?: boolean;
  isUnknown?: boolean;
  online?: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  name,
  preview,
  createdAt,
  unread,
  active,
  isUnknown,
  online,
  onClick,
}: Props) {
  const time = (() => {
    try {
      return formatDistanceToNow(new Date(createdAt), { locale: fr, addSuffix: false });
    } catch {
      return "";
    }
  })();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all duration-150 min-h-[64px]",
        "hover:bg-[hsl(var(--whatsapp-green))/0.08] active:bg-[hsl(var(--whatsapp-green))/0.12]",
        active && "bg-[hsl(var(--whatsapp-green))/0.10]",
      )}
    >
      <div className="relative">
        <LeadAvatar name={name} size={48} />
        {online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--whatsapp-green))] border-2 border-background" />
        )}
        {isUnknown && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center">
            <Phone className="h-2 w-2 text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", unread ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
            {name}
          </span>
          <span className={cn("text-[11px] shrink-0", unread ? "text-[hsl(var(--whatsapp-green-dark))] font-semibold" : "text-muted-foreground")}>
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn("truncate text-xs", unread ? "text-foreground/80" : "text-muted-foreground")}>
            {preview}
          </p>
          {unread && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[hsl(var(--whatsapp-green))] text-white text-[10px] font-bold flex items-center justify-center">
              ●
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
