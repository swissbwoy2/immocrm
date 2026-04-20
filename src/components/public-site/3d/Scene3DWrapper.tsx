import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';

interface Scene3DWrapperProps {
  children: React.ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  fallback?: React.ReactNode;
}

function SceneLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[hsl(38_45%_48%/0.4)] border-t-[hsl(38_45%_48%)] animate-spin" />
    </div>
  );
}

export function Scene3DWrapper({
  children,
  className = 'absolute inset-0',
  cameraPosition = [0, 0, 5],
  fogColor = 'hsl(30, 15%, 10%)',
  fogNear = 10,
  fogFar = 50,
  fallback,
}: Scene3DWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile || prefersReducedMotion) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className={className}>
      <Suspense fallback={<SceneLoader />}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: cameraPosition, fov: 60 }}
          frameloop="demand"
          gl={{ antialias: true, alpha: true }}
        >
          <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
}
