import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pullThreshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
  pullThreshold = 80,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);
  const { tapMedium, notifySuccess } = useHapticFeedback();

  const handleTouchStart = React.useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = React.useCallback(
    (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        setPullDistance(0);
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0) {
        // Apply rubber-band effect (iOS-style)
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, pullThreshold * 1.5);
        setPullDistance(distance);

        // Haptic when reaching threshold
        if (distance >= pullThreshold && pullDistance < pullThreshold) {
          tapMedium();
        }
      }
    },
    [isPulling, disabled, isRefreshing, pullThreshold, pullDistance, tapMedium]
  );

  const handleTouchEnd = React.useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold * 0.6);

      try {
        await onRefresh();
        notifySuccess();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, pullThreshold, isRefreshing, onRefresh, notifySuccess]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className={cn("relative overflow-auto", className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: pullDistance,
          transform: `translateY(${isRefreshing ? 0 : -pullThreshold * 0.3}px)`,
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-lg border border-border",
            isRefreshing && "animate-pulse"
          )}
          style={{
            transform: `scale(${0.5 + progress * 0.5}) rotate(${progress * 180}deg)`,
            opacity: progress,
          }}
        >
          <Loader2
            className={cn(
              "h-5 w-5 text-primary",
              isRefreshing && "animate-spin"
            )}
          />
        </div>
      </div>

      {/* Content with pull transform */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
