import { useState } from "react";
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
 * Bulle de story (style Liquid Glass) : anneau vert de la marque, gris quand toutes
 * les stories de l'auteur ont été vues. Repli sur les initiales si l'image ne charge pas.
 */
export function StoryAvatar({ name, avatarUrl, viewed = false, size = 64, active }: Props) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn("imr-story-ring block", active && "scale-105")}
      data-viewed={viewed}
      style={{ width: size, height: size }}
    >
      <span className="imr-story-inner">
        <span className="imr-story-media">
          {avatarUrl && !broken ? (
            <img src={avatarUrl} alt={name} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
          ) : (
            <LeadAvatar name={name} size={size - 9} className="h-full w-full" />
          )}
        </span>
      </span>
    </span>
  );
}
