import { cn } from "@/lib/utils";

const PALETTE = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-indigo-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-lime-500 to-green-600",
  "from-fuchsia-500 to-pink-600",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function LeadAvatar({
  name,
  className,
  size = 40,
}: {
  name?: string | null;
  className?: string;
  size?: number;
}) {
  const safe = (name || "?").trim() || "?";
  const initials = safe
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "?";
  const gradient = PALETTE[hash(safe) % PALETTE.length];
  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center shadow-sm",
        gradient,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}
