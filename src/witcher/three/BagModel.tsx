import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { rig, TINTS, useUI } from "../store";
import { makeGrain, makeLeatherColor, makeLeatherRoughness, makeMetalBrush, makeWeave, makeWeaveColor, makeWeaveRoughness } from "../textures";
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

function roundedRectPath(cx: number, cy: number, z: number, width: number, height: number, radius: number) {
  const hw = width / 2;
  const hh = height / 2;
  const corners: [number, number, number, number][] = [
    [cx + hw - radius, cy + hh - radius, 0, Math.PI / 2],
    [cx - hw + radius, cy + hh - radius, Math.PI / 2, Math.PI],
    [cx - hw + radius, cy - hh + radius, Math.PI, Math.PI * 1.5],
    [cx + hw - radius, cy - hh + radius, Math.PI * 1.5, Math.PI * 2],
  ];
  const points: THREE.Vector3[] = [];
  for (const [x, y, start, end] of corners) {
    for (let i = 0; i <= 5; i++) {
      if (points.length && i === 0) continue;
      const angle = start + (end - start) * (i / 5);
      points.push(new THREE.Vector3(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z));
    }
  }
  points.push(points[0]!.clone());
  return points;
}

function stitchGeometry(paths: THREE.Vector3[][], holes = false) {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertex = 0;
  const spacing = holes ? 0.027 : 0.027;

  for (const path of paths) {
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const length = path[i]!.distanceTo(path[i - 1]!);
      lengths.push(length);
      total += length;
    }

    let segment = 0;
    let segmentStart = 0;
    let ordinal = 0;
    for (let distance = spacing * 0.5; distance < total; distance += spacing, ordinal++) {
      while (segment < lengths.length - 1 && segmentStart + lengths[segment]! < distance) {
        segmentStart += lengths[segment]!;
        segment++;
      }
      const a = path[segment]!;
      const b = path[segment + 1]!;
      const tangent = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
      const cross = new THREE.Vector2(-tangent.y, tangent.x);
      const t = (distance - segmentStart) / lengths[segment]!;
      const center = a.clone().lerp(b, t);
      const direction = holes
        ? tangent
        : tangent.clone().multiplyScalar(0.55).addScaledVector(cross, ordinal % 2 ? 0.84 : -0.84).normalize();
      const across = new THREE.Vector2(-direction.y, direction.x);
      const halfLength = holes ? 0.0038 : 0.009;
      const halfWidth = holes ? 0.0022 : 0.0025;
      const z = center.z + (holes ? -0.0015 : 0.002);
      const corners = [
        [-1, -1], [1, -1], [1, 1], [-1, 1],
      ] as const;
      for (const [along, sideways] of corners) {
        positions.push(
          center.x + direction.x * halfLength * along + across.x * halfWidth * sideways,
          center.y + direction.y * halfLength * along + across.y * halfWidth * sideways,
          z,
        );
      }
      indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
      vertex += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function seamSet(paths: THREE.Vector3[][]) {
  return { thread: stitchGeometry(paths), holes: stitchGeometry(paths, true) };
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

function Buckle({ x, brass, highlight, edge, leather }: { x: number; brass: THREE.MeshStandardMaterial; highlight: THREE.MeshStandardMaterial; edge: THREE.MeshStandardMaterial; leather: THREE.MeshPhysicalMaterial }) {
  return (
    <group position={[x, -0.66, 0.6]}>
      {/* Thin leather keeper and raised frame give the casting a real layered profile. */}
      <RoundedBox args={[0.15, 0.29, 0.018]} radius={0.025} smoothness={3} position={[0, 0.015, -0.005]} material={leather} castShadow />
      <RoundedBox args={[0.215, 0.205, 0.025]} radius={0.028} smoothness={4} position={[0, 0, 0.014]} material={edge} castShadow />
      <RoundedBox args={[0.178, 0.168, 0.026]} radius={0.018} smoothness={4} position={[0, 0, 0.028]} material={brass} castShadow />
      <RoundedBox args={[0.143, 0.132, 0.028]} radius={0.012} smoothness={4} position={[0, 0, 0.033]} material={edge} />

      {/* Crossbar, tongue and keeper studs are intentionally brighter than the frame. */}
      <mesh position={[0, -0.005, 0.056]} rotation={[0, 0, Math.PI / 2]} castShadow material={highlight}>
        <cylinderGeometry args={[0.009, 0.009, 0.145, 12]} />
      </mesh>
      <RoundedBox args={[0.074, 0.011, 0.009]} radius={0.004} smoothness={2} position={[0, 0.018, 0.062]} rotation={[0, 0, -0.12]} material={highlight} castShadow />
      {[-0.065, 0.065].map((y) => (
        <mesh key={y} position={[0, y, 0.059]} castShadow material={highlight}>
          <sphereGeometry args={[0.009, 12, 8]} />
        </mesh>
      ))}
      <mesh position={[0, -0.145, 0.028]} rotation={[Math.PI / 2, 0, 0]} material={edge}>
        <cylinderGeometry args={[0.009, 0.009, 0.014, 16]} />
      </mesh>
    </group>
  );
}

function SideRing({ x, brass, highlight, leather }: { x: number; brass: THREE.MeshStandardMaterial; highlight: THREE.MeshStandardMaterial; leather: THREE.MeshPhysicalMaterial }) {
  return (
    <group>
      <RoundedBox args={[0.055, 0.16, 0.038]} radius={0.018} smoothness={3} position={[x * 1.01, 0.38, 0]} rotation={[0, Math.PI / 2, 0]} material={leather} castShadow />
      <mesh position={[x * 1.045, 0.38, 0]} rotation={[0, Math.PI / 2, 0]} material={brass} castShadow>
        <torusGeometry args={[0.071, 0.014, 12, 32]} />
      </mesh>
      <mesh position={[x * 1.046, 0.38, 0]} rotation={[0, Math.PI / 2, 0]} material={highlight}>
        <torusGeometry args={[0.052, 0.004, 8, 32]} />
      </mesh>
      {[-0.045, 0.045].map((y) => (
        <mesh key={y} position={[x * 1.039, 0.38 + y, 0.025]} material={highlight} castShadow>
          <sphereGeometry args={[0.011, 12, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralBag() {
  const tint = useUI((s) => s.tint);
  const weave = useMemo(makeWeave, []);
  const weaveColor = useMemo(makeWeaveColor, []);
  const weaveRoughness = useMemo(makeWeaveRoughness, []);
  const grain = useMemo(makeGrain, []);
  const leatherColor = useMemo(makeLeatherColor, []);
  const leatherRoughness = useMemo(makeLeatherRoughness, []);
  const metalBrush = useMemo(makeMetalBrush, []);
  const leather = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: TINTS["Dark Brown"], map: leatherColor, roughnessMap: leatherRoughness,
    roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.46,
    bumpMap: grain, bumpScale: 0.12,
  }), [grain, leatherColor, leatherRoughness]);
  const canvasMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#292d30", map: weaveColor, roughnessMap: weaveRoughness,
    roughness: 0.96, bumpMap: weave, bumpScale: 0.16,
  }), [weave, weaveColor, weaveRoughness]);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b08a4a", metalness: 0.98, roughness: 0.3, bumpMap: metalBrush, bumpScale: 0.018, roughnessMap: metalBrush }), [metalBrush]);
  const hardwareHighlight = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d6b56e", metalness: 0.98, roughness: 0.23, bumpMap: metalBrush, bumpScale: 0.012, roughnessMap: metalBrush }), [metalBrush]);
  const hardwareEdge = useMemo(() => new THREE.MeshStandardMaterial({ color: "#73572f", metalness: 0.96, roughness: 0.36, bumpMap: metalBrush, bumpScale: 0.016, roughnessMap: metalBrush }), [metalBrush]);
  const canvasStitchMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8d7a62", roughness: 0.94 }), []);
  const leatherStitchMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#76543c", roughness: 0.96 }), []);
  const stitchHoleMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#241a11", roughness: 1 }), []);

  const bodySeams = useMemo(() => seamSet([roundedRectPath(0, 0, 0.255, 1.43, 0.98, 0.085)]), []);
  const strapTailSeams = useMemo(() => seamSet([-0.45, 0.45].map((x) => roundedRectPath(x, -0.36, 0.279, 0.101, 0.35, 0.018))), []);
  const flapSeams = useMemo(() => seamSet([
    roundedRectPath(0, -0.37, 0.596, 1.49, 0.61, 0.055),
    roundedRectPath(-0.45, -0.5, 0.612, 0.094, 0.31, 0.018),
    roundedRectPath(0.45, -0.5, 0.612, 0.094, 0.31, 0.018),
  ]), []);
  const target = useRef(new THREE.Color(TINTS[tint]));
  useEffect(() => { target.current.set(TINTS[tint]); }, [tint]);
  useEffect(() => () => {
    [leather, canvasMat, brass, hardwareHighlight, hardwareEdge, canvasStitchMaterial, leatherStitchMaterial, stitchHoleMaterial,
      weave, weaveColor, weaveRoughness, grain, leatherColor, leatherRoughness, metalBrush,
      bodySeams.thread, bodySeams.holes, strapTailSeams.thread, strapTailSeams.holes, flapSeams.thread, flapSeams.holes]
      .forEach((d) => d.dispose());
  }, [leather, canvasMat, brass, hardwareHighlight, hardwareEdge, canvasStitchMaterial, leatherStitchMaterial, stitchHoleMaterial,
    weave, weaveColor, weaveRoughness, grain, leatherColor, leatherRoughness, metalBrush, bodySeams, strapTailSeams, flapSeams]);

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

  return (
    <group>
      {/* body */}
      <group>
        <RoundedBox args={[1.6, 1.15, 0.5]} radius={0.08} smoothness={4} material={canvasMat} castShadow receiveShadow />
        <mesh geometry={bodySeams.holes} material={stitchHoleMaterial} renderOrder={1} />
        <mesh geometry={bodySeams.thread} material={canvasStitchMaterial} renderOrder={2} />
        {/* interior pocket, revealed when flap opens */}
        <mesh position={[0, 0.5, 0.12]}>
          <boxGeometry args={[1.3, 0.25, 0.05]} />
          <meshStandardMaterial color="#5a3a1e" roughness={0.8} />
        </mesh>
        {[-0.8, 0.8].map((x) => (
          <SideRing key={x} x={x} brass={brass} highlight={hardwareHighlight} leather={leather} />
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
        <mesh geometry={strapTailSeams.holes} material={stitchHoleMaterial} renderOrder={2} />
        <mesh geometry={strapTailSeams.thread} material={leatherStitchMaterial} renderOrder={3} />
        <group position={[0, -0.4, 0]}><Label text="Twin bridle straps" side={-1} /></group>
      </group>

      {/* flap (pivots on back-top edge) */}
      <group ref={(g) => { parts.current.flap = g; }} position={[0, 0.58, -0.25]}>
        <group ref={flap}>
          <mesh position={[0, 0.02, 0.27]} material={leather} castShadow>
            <boxGeometry args={[1.66, 0.05, 0.56]} />
          </mesh>
          <RoundedBox args={[1.66, 0.78, 0.06]} radius={0.025} position={[0, -0.37, 0.56]} material={leather} castShadow />
          {/* embossed medallion */}
          <mesh position={[0, -0.36, 0.595]} rotation={[Math.PI / 2, 0, 0]} material={brass}>
            <cylinderGeometry args={[0.17, 0.17, 0.015, 48]} />
          </mesh>
          <mesh position={[0, -0.36, 0.604]} rotation={[Math.PI / 2, 0, 0]} material={hardwareEdge}>
            <torusGeometry args={[0.177, 0.006, 8, 48]} />
          </mesh>
          <mesh geometry={flapSeams.holes} material={stitchHoleMaterial} renderOrder={2} />
          <mesh geometry={flapSeams.thread} material={leatherStitchMaterial} renderOrder={3} />
          <LiquidWolfEmblem variant="decal" size={0.32} position={[0, -0.36, 0.605]} />
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, -0.5, 0.595]} material={leather} castShadow>
              <boxGeometry args={[0.13, 0.42, 0.02]} />
            </mesh>
          ))}
          <group ref={(g) => { parts.current.buckles = g; }}>
            <Buckle x={-0.45} brass={brass} highlight={hardwareHighlight} edge={hardwareEdge} leather={leather} />
            <Buckle x={0.45} brass={brass} highlight={hardwareHighlight} edge={hardwareEdge} leather={leather} />
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
