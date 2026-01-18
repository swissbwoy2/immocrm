import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  showHandle?: boolean;
  closeOnOverlayClick?: boolean;
}

export function MobileBottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  showHandle = true,
  closeOnOverlayClick = true,
}: MobileBottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const { tapLight } = useHapticFeedback();

  const handleClose = React.useCallback(() => {
    tapLight();
    onOpenChange(false);
  }, [onOpenChange, tapLight]);

  const handleOverlayClick = React.useCallback(() => {
    if (closeOnOverlayClick) {
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
    if (dragOffset > 100) {
      handleClose();
    }
    setDragOffset(0);
  }, [dragOffset, handleClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm",
          "animate-in fade-in-0 duration-200"
        )}
        onClick={handleOverlayClick}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "bg-background rounded-t-[20px] shadow-2xl",
          "animate-in slide-in-from-bottom duration-300 ease-out",
          "max-h-[90vh] overflow-hidden flex flex-col",
          "pb-safe",
          className
        )}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <div className="px-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              {title && (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              )}
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all touch-target-mobile"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Hook to detect mobile and use bottom sheet vs dialog
export function useIsMobileSheet() {
  const [isMobile, setIsMobile] = React.useState(() => {
    // Safe initialization for SSR/hydration
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || 'ontouchstart' in window;
    }
    return false;
  });

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    // Re-check on mount in case initial value was wrong
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
