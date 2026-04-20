import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Swiss Romande cantons approximate positions on sphere (lat/lon in degrees)
const SWISS_CANTONS = [
  { name: 'Genève', lat: 46.2, lon: 6.15 },
  { name: 'Vaud', lat: 46.57, lon: 6.52 },
  { name: 'Valais', lat: 46.23, lon: 7.36 },
  { name: 'Fribourg', lat: 46.8, lon: 7.15 },
  { name: 'Neuchâtel', lat: 47.0, lon: 6.93 },
  { name: 'Jura', lat: 47.35, lon: 7.36 },
  { name: 'Berne', lat: 46.95, lon: 7.44 },
  { name: 'Zurich', lat: 47.37, lon: 8.54 },
  { name: 'Basel', lat: 47.56, lon: 7.59 },
  { name: 'Lucerne', lat: 47.05, lon: 8.3 },
];

function latLonToVec3(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

function GlobePoint({ lat, lon }: { lat: number; lon: number }) {
  const pos = latLonToVec3(lat, lon, 1.02);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshStandardMaterial color="hsl(38, 55%, 65%)" emissive="hsl(38, 45%, 30%)" emissiveIntensity={0.8} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

export function SwissGlobe3D() {
  const groupRef = useRef<THREE.Group>(null);

  // Globe wireframe texture using lat/lon lines
  const wireframeGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 24);
    return geo;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.002;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="hsl(38, 55%, 80%)" />
      <pointLight position={[-4, -2, 3]} intensity={0.6} color="hsl(38, 45%, 48%)" />
      <group ref={groupRef}>
        {/* Globe sphere */}
        <mesh>
          <primitive object={wireframeGeometry} />
          <meshStandardMaterial
            color="hsl(30, 15%, 14%)"
            metalness={0.3}
            roughness={0.7}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Wireframe overlay */}
        <mesh>
          <primitive object={wireframeGeometry} />
          <meshBasicMaterial
            color="hsl(38, 45%, 35%)"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
        {/* Canton points */}
        {SWISS_CANTONS.map((c) => (
          <GlobePoint key={c.name} lat={c.lat} lon={c.lon} />
        ))}
        {/* Equatorial ring glow */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.003, 4, 128]} />
          <meshBasicMaterial color="hsl(38, 45%, 48%)" transparent opacity={0.4} />
        </mesh>
      </group>
    </>
  );
}
