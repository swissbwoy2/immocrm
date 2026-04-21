import { useRef } from 'react';
import { useScroll, useTransform, useSpring, motion, useReducedMotion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 9 zig-zag waypoints as [xFraction, yFraction] of viewport
const WAY_X = [0.78, 0.12, 0.82, 0.08, 0.76, 0.12, 0.55, 0.82, 0.50];
const WAY_Y = [0.12, 0.22, 0.42, 0.55, 0.68, 0.72, 0.22, 0.18, 0.48];
const WAY_T = [0.00, 0.12, 0.24, 0.36, 0.48, 0.58, 0.70, 0.82, 1.00];

// Gold key 3D mesh using Three.js primitives
function GoldKeyMesh() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    groupRef.current.rotation.y += delta * 0.9;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.18;
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('hsl(38, 55%, 58%)'),
    metalness: 1.0,
    roughness: 0.18,
    envMapIntensity: 1.2,
  });

  return (
    <group ref={groupRef} scale={0.9}>
      {/* Bow (ring) */}
      <mesh material={goldMat} position={[0, 0.6, 0]}>
        <torusGeometry args={[0.38, 0.10, 8, 24]} />
      </mesh>
      {/* Shank */}
      <mesh material={goldMat} position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.1, 8]} />
      </mesh>
      {/* Tooth 1 */}
      <mesh material={goldMat} position={[0.18, -0.55, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.10]} />
      </mesh>
      {/* Tooth 2 */}
      <mesh material={goldMat} position={[0.18, -0.28, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.10]} />
      </mesh>
    </group>
  );
}

export function TravelingGoldKey3D() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { scrollYProgress } = useScroll();

  const W = typeof window !== 'undefined' ? window.innerWidth : 1400;
  const H = typeof window !== 'undefined' ? window.innerHeight : 900;
  const SIZE = 110;

  const xPositions = WAY_X.map((f) => f * W - SIZE / 2);
  const yPositions = WAY_Y.map((f) => f * H - SIZE / 2);

  const rawX = useTransform(scrollYProgress, WAY_T, xPositions);
  const rawY = useTransform(scrollYProgress, WAY_T, yPositions);

  const x = useSpring(rawX, { stiffness: 50, damping: 20 });
  const y = useSpring(rawY, { stiffness: 50, damping: 20 });

  if (isMobile || prefersReducedMotion) return null;

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x,
        y,
        width: SIZE,
        height: SIZE,
        zIndex: 30,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} color="#f8e4b0" />
        <directionalLight position={[3, 5, 4]} intensity={2.2} color="#ffd580" />
        <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#c8a04a" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#ffd060" />
        <GoldKeyMesh />
      </Canvas>
    </motion.div>
  );
}
