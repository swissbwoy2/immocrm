import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LuxuryParticles3DProps {
  count?: number;
  spread?: number;
}

export function LuxuryParticles3D({ count = 2000, spread = 20 }: LuxuryParticles3DProps) {
  const meshRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>(null!);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);

    const goldColors = [
      new THREE.Color('hsl(38, 55%, 65%)'),
      new THREE.Color('hsl(38, 45%, 48%)'),
      new THREE.Color('hsl(28, 35%, 38%)'),
      new THREE.Color('hsl(40, 35%, 80%)'),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      vels[i * 3] = (Math.random() - 0.5) * 0.002;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.002 + 0.001;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.002;

      const c = goldColors[Math.floor(Math.random() * goldColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    velocitiesRef.current = vels;
    return { positions, colors };
  }, [count, spread]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
    const vels = velocitiesRef.current;
    const half = spread / 2;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += vels[i * 3];
      pos[i * 3 + 1] += vels[i * 3 + 1];
      pos[i * 3 + 2] += vels[i * 3 + 2];

      if (Math.abs(pos[i * 3]) > half) vels[i * 3] *= -1;
      if (pos[i * 3 + 1] > half) pos[i * 3 + 1] = -half;
      if (Math.abs(pos[i * 3 + 2]) > half) vels[i * 3 + 2] *= -1;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y += 0.0003;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
