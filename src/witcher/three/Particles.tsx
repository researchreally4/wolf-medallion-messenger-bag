import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Particles({ count = 400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      speeds[i] = 0.1 + Math.random() * 0.35;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const attr = ref.current?.geometry.getAttribute("position");
    if (!attr) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < Math.min(count, attr.count); i++) {
      const speed = speeds[i];
      if (speed === undefined) continue;
      let y = attr.getY(i) + speed * dt;
      if (y > 4) y = -4;
      attr.setY(i, y);
      attr.setX(i, attr.getX(i) + Math.sin(t * 0.5 + i) * 0.002);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#ff9a3c" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} sizeAttenuation />
    </points>
  );
}
