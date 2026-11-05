import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { rig, TINTS, useUI } from "../store";
import { makeGrain, makeWeave } from "../textures";
import { assetUrl } from "../assetUrl";
import { LiquidWolfEmblem } from "./LiquidWolfEmblem";

/**
 * TODO(real asset): drop the production GLB at /public/models/witcher-bag.glb
 * (Draco-compressed is fine). It is detected automatically; until then the
 * procedural bag below is rendered. Name the flap mesh "Flap" for tint support.
 */
const MODEL_URL = assetUrl("models/witcher-bag.glb");

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function GLTFBag() {
  const { scene } = useGLTF(MODEL_URL, true);
  const tint = useUI((s) => s.tint);
  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = m.receiveShadow = true; }
      if (m.isMesh && /flap/i.test(m.name)) (m.material as THREE.MeshStandardMaterial).color?.set(TINTS[tint]);
    });
  }, [scene, tint]);
  return <primitive object={scene} />;
}

function Label({ text, side = 1 }: { text: string; side?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => { if (ref.current) ref.current.style.opacity = String(Math.max(0, (rig.explode - 0.35) / 0.65)); });
  return (
    <Html position={[side * 1.05, 0, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div ref={ref} className="annot" data-side={side > 0 ? "r" : "l"} style={{ opacity: 0 }}>
        <span className="annot-rule" />{text}
      </div>
    </Html>
  );
}

function Buckle({ x }: { x: number }) {
  const pieces: [number, number, number, number][] = [
    [0, 0.085, 0.2, 0.025],
    [0, -0.085, 0.2, 0.025],
    [0.09, 0, 0.025, 0.19],
    [-0.09, 0, 0.025, 0.19],
    [0, 0, 0.012, 0.19],
  ];
  return (
    <group position={[x, -0.66, 0.6]}>
      {pieces.map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.012]} castShadow>
          <boxGeometry args={[w, h, 0.025]} />
          <meshStandardMaterial color="#b08a4a" metalness={1} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralBag() {
  const tint = useUI((s) => s.tint);
  const weave = useMemo(makeWeave, []);
  const grain = useMemo(makeGrain, []);
  const leather = useMemo(() => new THREE.MeshPhysicalMaterial({ color: TINTS["Dark Brown"], roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.55, bumpMap: grain, bumpScale: 0.6 }), [grain]);
  const canvasMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2d2f", roughness: 0.95, bumpMap: weave, bumpScale: 1.4 }), [weave]);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b08a4a", metalness: 1, roughness: 0.3 }), []);
  const target = useRef(new THREE.Color(TINTS[tint]));
  useEffect(() => { target.current.set(TINTS[tint]); }, [tint]);
  useEffect(() => () => { [leather, canvasMat, brass, weave, grain].forEach((d) => d.dispose()); }, [leather, canvasMat, brass, weave, grain]);

  const flap = useRef<THREE.Group>(null);
  const parts = useRef({ flap: null as THREE.Group | null, buckles: null as THREE.Group | null, straps: null as THREE.Group | null, handle: null as THREE.Group | null });
  useFrame((_, dt) => {
    leather.color.lerp(target.current, Math.min(1, dt * 5));
    if (flap.current) flap.current.rotation.x = -rig.flap;
    const e = rig.explode;
    const p = parts.current;
    if (p.flap) p.flap.position.y = 0.58 + e * 0.95;
    if (p.buckles) p.buckles.position.set(0, e * 0.75, e * 0.35);
    if (p.straps) p.straps.position.y = -e * 0.9;
    if (p.handle) p.handle.position.y = 0.6 + e * 2.0;
  });

  const stitch = useMemo(() => {
    const y = -0.72, z = 0.58, w = 0.78;
    return [[-w, -0.02, z], [-w, y, z], [w, y, z], [w, -0.02, z]] as [number, number, number][];
  }, []);

  return (
    <group>
      {/* body */}
      <group>
        <RoundedBox args={[1.6, 1.15, 0.5]} radius={0.08} smoothness={4} material={canvasMat} castShadow receiveShadow />
        {/* interior pocket, revealed when flap opens */}
        <mesh position={[0, 0.5, 0.12]}>
          <boxGeometry args={[1.3, 0.25, 0.05]} />
          <meshStandardMaterial color="#5a3a1e" roughness={0.8} />
        </mesh>
        {[-0.81, 0.81].map((x) => (
          <mesh key={x} position={[x, 0.38, 0]} rotation={[0, Math.PI / 2, 0]} material={brass} castShadow>
            <torusGeometry args={[0.07, 0.012, 10, 24]} />
          </mesh>
        ))}
        <Label text="Waxed canvas body" side={-1} />
      </group>

      {/* body strap tails */}
      <group ref={(g) => { parts.current.straps = g; }}>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, -0.36, 0.265]} material={leather} castShadow>
            <boxGeometry args={[0.13, 0.42, 0.02]} />
          </mesh>
        ))}
        <group position={[0, -0.4, 0]}><Label text="Twin bridle straps" side={-1} /></group>
      </group>

      {/* flap (pivots on back-top edge) */}
      <group ref={(g) => { parts.current.flap = g; }} position={[0, 0.58, -0.25]}>
        <group ref={flap}>
          <mesh position={[0, 0.02, 0.27]} material={leather} castShadow>
            <boxGeometry args={[1.66, 0.05, 0.56]} />
          </mesh>
          <RoundedBox args={[1.66, 0.78, 0.06]} radius={0.025} position={[0, -0.37, 0.56]} material={leather} castShadow />
          <Line points={stitch} color="#c9b48a" lineWidth={1.1} dashed dashSize={0.025} gapSize={0.018} />
          {/* embossed medallion */}
          <mesh position={[0, -0.36, 0.595]} rotation={[Math.PI / 2, 0, 0]} material={brass}>
            <cylinderGeometry args={[0.17, 0.17, 0.015, 48]} />
          </mesh>
          <LiquidWolfEmblem variant="decal" size={0.32} position={[0, -0.36, 0.605]} />
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, -0.5, 0.595]} material={leather} castShadow>
              <boxGeometry args={[0.13, 0.42, 0.02]} />
            </mesh>
          ))}
          <group ref={(g) => { parts.current.buckles = g; }}>
            <Buckle x={-0.45} />
            <Buckle x={0.45} />
            <group position={[0, -0.66, 0.6]}><Label text="Aged-brass box buckles" /></group>
          </group>
        </group>
        <group position={[0, 0.1, 0.3]}><Label text="Full-grain leather flap" /></group>
      </group>

      {/* handle */}
      <group ref={(g) => { parts.current.handle = g; }} position={[0, 0.6, 0]}>
        <mesh material={leather} castShadow>
          <torusGeometry args={[0.28, 0.035, 14, 40, Math.PI]} />
        </mesh>
        <group position={[0, 0.2, 0]}><Label text="Rolled top handle" side={-1} /></group>
      </group>
    </group>
  );
}

export function BagModel({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [hasModel, setHasModel] = useState(false);
  useEffect(() => {
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => setHasModel(r.ok && !(r.headers.get("content-type") ?? "").includes("text/html")))
      .catch(() => setHasModel(false));
  }, []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const float = mobile ? 0 : Math.sin(t * 0.8) * 0.04;
    g.position.set(rig.bagX + rig.mouseX * 0.06, rig.bagY + rig.introY + float, 0);
    g.rotation.set(rig.bagRotX - rig.mouseY * 0.05, rig.bagRotY + rig.mouseX * 0.12 + t * 0.05 * (1 - rig.explode), 0);
    g.scale.setScalar(rig.bagScale * (mobile ? 0.85 : 1));
  });

  const procedural = <ProceduralBag />;
  return (
    <group ref={group}>
      {hasModel ? (
        <Boundary fallback={procedural}>
          <Suspense fallback={procedural}><GLTFBag /></Suspense>
        </Boundary>
      ) : procedural}
    </group>
  );
}
