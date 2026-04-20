import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BUILDINGS = [
  { x: -6, w: 1.2, h: 4, d: 1.0 },
  { x: -4.5, w: 0.9, h: 6.5, d: 0.9 },
  { x: -3.2, w: 1.4, h: 3.5, d: 1.1 },
  { x: -1.8, w: 1.0, h: 8, d: 1.0 },
  { x: -0.6, w: 1.5, h: 5.5, d: 1.3 },
  { x: 0.8, w: 0.8, h: 7, d: 0.8 },
  { x: 1.8, w: 1.2, h: 4.5, d: 1.0 },
  { x: 3.0, w: 1.0, h: 9, d: 1.0 },
  { x: 4.2, w: 1.3, h: 5, d: 1.1 },
  { x: 5.5, w: 0.9, h: 6, d: 0.9 },
  { x: 6.5, w: 1.1, h: 3.8, d: 1.0 },
];

function Building({ x, w, h, d }: { x: number; w: number; h: number; d: number }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('hsl(38, 45%, 22%)'),
        metalness: 0.9,
        roughness: 0.2,
        emissive: new THREE.Color('hsl(38, 45%, 8%)'),
      }),
    []
  );

  return (
    <mesh position={[x, h / 2 - 0.5, 0]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

export function LuxurySkyline3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.15;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} color="hsl(38, 55%, 75%)" />
      <pointLight position={[0, -2, 3]} intensity={0.8} color="hsl(38, 55%, 60%)" />
      <group ref={groupRef}>
        {BUILDINGS.map((b, i) => (
          <Building key={i} {...b} />
        ))}
        {/* Ground plane */}
        <mesh position={[0, -0.5, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 5]} />
          <meshStandardMaterial color="hsl(30, 15%, 12%)" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </>
  );
}
