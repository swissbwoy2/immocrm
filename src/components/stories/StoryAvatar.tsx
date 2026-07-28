import { cn } from "@/lib/utils";
import { LeadAvatar } from "@/components/whatsapp/LeadAvatar";

interface Props {
  name: string;
  avatarUrl?: string | null;
  viewed?: boolean;
  size?: number;
  active?: boolean;
}

/**
 * Round avatar bubble with a gradient ring (Immo-rama palette).
 * Grey ring when the current viewer has seen all of the author's stories.
 */
export function StoryAvatar({ name, avatarUrl, viewed = false, size = 60, active }: Props) {
  const ringGradient = viewed
    ? "linear-gradient(135deg, hsl(0 0% 80%), hsl(0 0% 65%))"
    : "linear-gradient(135deg, hsl(158 55% 38%), hsl(200 70% 45%))";

  return (
    <div
      className={cn("relative rounded-full p-[2.5px]", active && "scale-105")}
      style={{ background: ringGradient, width: size, height: size }}
    >
      <div className="bg-background rounded-full p-[2px] w-full h-full">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <LeadAvatar name={name} size={size - 9} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
