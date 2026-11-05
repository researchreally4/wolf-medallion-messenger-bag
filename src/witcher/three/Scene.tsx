import { Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Preload } from "@react-three/drei";
import * as THREE from "three";
import { rig } from "../store";
import { BagModel } from "./BagModel";
import { LiquidWolfEmblem } from "./LiquidWolfEmblem";
import { Particles } from "./Particles";
import { Lighting } from "./Lighting";
import { Effects } from "./Effects";

const look = new THREE.Vector3();

function CameraRig() {
  useFrame(({ camera }) => {
    camera.position.set(rig.camX + rig.mouseX * 0.15, rig.camY + rig.mouseY * 0.08, rig.camZ);
    look.set(rig.lookX, rig.lookY, rig.lookZ);
    camera.lookAt(look);
  });
  return null;
}

export function Scene({ mobile, onReady }: { mobile: boolean; onReady: () => void }) {
  return (
    <Canvas
      className="scene-canvas"
      dpr={mobile ? [1, 1.5] : [1, 2]}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      camera={{ position: [0, 0.3, 5.2], fov: 35 }}
      onCreated={() => requestAnimationFrame(onReady)}
    >
      <CameraRig />
      <Lighting />
      <LiquidWolfEmblem variant="hero" size={4.2} position={[0, 0.2, -2.2]} />
      <Suspense fallback={null}>
        <BagModel mobile={mobile} />
        <Preload all />
      </Suspense>
      <ContactShadows position={[0, -0.6, 0]} opacity={0.6} blur={2.6} scale={6} far={2} frames={mobile ? 1 : Infinity} />
      <Particles count={mobile ? 120 : 420} />
      {!mobile && <Effects />}
    </Canvas>
  );
}
