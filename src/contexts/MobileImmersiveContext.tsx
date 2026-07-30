import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface MobileImmersiveContextValue {
  /** True when a full-screen mobile surface (ex: conversation) is open. */
  immersive: boolean;
  setImmersive: (value: boolean) => void;
}

const MobileImmersiveContext = createContext<MobileImmersiveContextValue>({
  immersive: false,
  setImmersive: () => {},
});

export function MobileImmersiveProvider({ children }: { children: ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);

  const setImmersive = useCallback((value: boolean) => {
    setImmersiveState(value);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('imr-immersive', immersive);
    return () => document.body.classList.remove('imr-immersive');
  }, [immersive]);

  return (
    <MobileImmersiveContext.Provider value={{ immersive, setImmersive }}>
      {children}
    </MobileImmersiveContext.Provider>
  );
}

export function useMobileImmersive() {
  return useContext(MobileImmersiveContext);
}

/** Enables immersive (chrome-less) mode while `active` is true. */
export function useImmersiveMode(active: boolean) {
  const { setImmersive } = useMobileImmersive();
  useEffect(() => {
    setImmersive(active);
    return () => setImmersive(false);
  }, [active, setImmersive]);
}
