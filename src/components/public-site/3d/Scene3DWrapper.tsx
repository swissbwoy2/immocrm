import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

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

// Detect WebGL support to avoid throwing in environments without it
// (Safari low-power, headless browsers, GPU-blocked machines, some bots).
function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
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
  const [webglOk, setWebglOk] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    setWebglOk(canUseWebGL());
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile || prefersReducedMotion || !webglOk) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className={className}>
      <WebGLErrorBoundary fallback={fallback ?? null}>
        <Suspense fallback={<SceneLoader />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: cameraPosition, fov: 60 }}
            frameloop="demand"
            gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                console.warn('[Scene3DWrapper] WebGL context lost');
              });
            }}
          >
            <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
            {children}
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>
    </div>
  );
}
