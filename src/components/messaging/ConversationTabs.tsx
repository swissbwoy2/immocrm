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
    <div className="border-b border-border/70 bg-card">
      <div
        role="tablist"
        aria-label="Filtrer les conversations"
        aria-orientation="horizontal"
        className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const isActive = active === t.key;
          const count = counts[t.key] || 0;
          const isAlert = t.key === "a_traiter" && count > 0;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={count > 0 ? `${t.label} (${count})` : t.label}
              onClick={() => onChange(t.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/60"
              )}
              title={t.label}
            >
              <span className="whitespace-nowrap">{t.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center",
                    isAlert
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "text-background/70"
                      : "text-muted-foreground"
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
