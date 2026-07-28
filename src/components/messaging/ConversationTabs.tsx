import { Bell, Video, Users, Bot, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConversationTabKey = "a_traiter" | "videos" | "clients" | "robot" | "tout";

export interface ConversationTabCounts {
  a_traiter: number;
  videos: number;
  clients: number;
  robot: number;
  tout: number;
}

interface Props {
  active: ConversationTabKey;
  counts: ConversationTabCounts;
  onChange: (tab: ConversationTabKey) => void;
}

const TABS: { key: ConversationTabKey; label: string; icon: any; emoji: string }[] = [
  { key: "a_traiter", label: "À traiter", icon: Bell, emoji: "🔴" },
  { key: "videos", label: "Vidéos & visites", icon: Video, emoji: "🎥" },
  { key: "clients", label: "Réponses clients", icon: Users, emoji: "👥" },
  { key: "robot", label: "Offres du robot", icon: Bot, emoji: "🤖" },
  { key: "tout", label: "Tout", icon: Inbox, emoji: "📥" },
];

export function ConversationTabs({ active, counts, onChange }: Props) {
  return (
    <div className="border-b border-border/50 bg-background/60 backdrop-blur-sm">
      <div className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-2">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const count = counts[t.key] || 0;
          const isAlert = t.key === "a_traiter" && count > 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-transparent text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
              )}
              title={t.label}
            >
              <span className="text-sm leading-none">{t.emoji}</span>
              <span className="whitespace-nowrap">{t.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center",
                    isAlert
                      ? "bg-red-500 text-white"
                      : isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
