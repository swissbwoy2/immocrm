import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
  className?: string;
}

export const ScrollToTopButton = ({ show, onClick, className }: ScrollToTopButtonProps) => {
  if (!show) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "absolute bottom-24 right-4 z-20 rounded-full shadow-lg",
        "bg-background/90 backdrop-blur-sm border border-border/50",
        "hover:bg-background hover:scale-105 transition-all duration-200",
        "animate-in fade-in slide-in-from-bottom-2",
        className
      )}
      onClick={onClick}
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
};
