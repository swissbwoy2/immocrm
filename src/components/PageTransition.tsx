import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let mounted = true;
    setShowLoader(false);
    const timer = window.setTimeout(() => {
      if (mounted) setShowLoader(true);
    }, 150);

    // Hide on next paint after route change settles
    const hideTimer = window.setTimeout(() => {
      if (mounted) setShowLoader(false);
    }, 600);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      window.clearTimeout(hideTimer);
    };
  }, [location.pathname]);

  return (
    <div className="h-full w-full relative">
      {children}
      {showLoader && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in duration-150"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative h-16 w-16 rounded-full bg-card shadow-lg flex items-center justify-center animate-pulse">
                <img
                  src={logoImmoRama}
                  alt="Chargement Logisorama"
                  className="h-11 w-11 object-contain"
                />
              </div>
            </div>
            <div className="flex gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
