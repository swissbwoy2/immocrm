import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const goldMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('hsl(38, 55%, 52%)'),
  metalness: 1.0,
  roughness: 0.1,
  emissive: new THREE.Color('hsl(38, 45%, 12%)'),
});

function KeyBow() {
  return (
    <mesh position={[0, 0.6, 0]} material={goldMat}>
      <torusGeometry args={[0.35, 0.1, 8, 24]} />
    </mesh>
  );
}

function KeyShank() {
  return (
    <mesh position={[0, -0.15, 0]} material={goldMat}>
      <cylinderGeometry args={[0.055, 0.055, 1.4, 6]} />
    </mesh>
  );
}

function KeyTooth({ y, x = 0.18 }: { y: number; x?: number }) {
  return (
    <mesh position={[x, y, 0]} material={goldMat}>
      <boxGeometry args={[0.18, 0.14, 0.1]} />
    </mesh>
  );
}

export function GoldKey3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.5;
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.15;
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.2;
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={2} color="hsl(38, 55%, 90%)" />
      <pointLight position={[-3, -3, 2]} intensity={1} color="hsl(38, 45%, 48%)" />
      <group ref={groupRef} scale={1.4}>
        <KeyBow />
        <KeyShank />
        <KeyTooth y={-0.55} />
        <KeyTooth y={-0.75} />
        <KeyTooth y={-0.95} x={0.16} />
      </group>
    </>
  );
}
