import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Floating "scroll to top" button for the messages area.
 * Positioned just above the composer (accounting for iOS safe area)
 * so it never overlaps the Send button or the input field.
 */
export const ScrollToTopButton = ({ show, onClick, className }: ScrollToTopButtonProps) => {
  if (!show) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Remonter en haut de la conversation"
      title="Remonter en haut"
      onClick={onClick}
      style={{
        // Sit above the composer + iOS safe area, without covering the Send button.
        bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))',
      }}
      className={cn(
        "absolute right-3 sm:right-4 z-30 h-10 w-10 rounded-full shadow-lg",
        "bg-background/90 backdrop-blur-sm border border-border/50",
        "hover:bg-background hover:scale-105 transition-all duration-200",
        "animate-in fade-in slide-in-from-bottom-2",
        "pointer-events-auto",
        className,
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};
