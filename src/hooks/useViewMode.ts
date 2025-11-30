import { useState, useEffect } from "react";

// Hook for managing view mode (table vs cards) with tablet detection
export function useViewMode() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const isSmallScreen = width < 1024; // lg breakpoint
      setIsTabletOrMobile(isSmallScreen);
      
      // Auto-switch to cards on tablet/mobile
      if (isSmallScreen && viewMode === 'table') {
        setViewMode('cards');
      }
    };
    
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return {
    viewMode,
    setViewMode,
    isTabletOrMobile,
  };
}
