import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type ChromaticAberrationEffect, type DepthOfFieldEffect } from "postprocessing";
import { useControls } from "leva";
import * as THREE from "three";
import { rig } from "../store";

export function Effects() {
  const dof = useRef<DepthOfFieldEffect>(null);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const { bloom } = useControls("Effects", { bloom: { value: 0.7, min: 0, max: 3 } });
  const offset = useRef(new THREE.Vector2(0, 0));

  useFrame(() => {
    if (dof.current) dof.current.bokehScale = rig.dof * 4;
    const o = rig.ca * 0.0018;
    if (ca.current) ca.current.offset.set(o, o * 0.6);
  });

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField ref={dof} focusDistance={0.01} focalLength={0.03} bokehScale={0} />
      <Bloom intensity={bloom} luminanceThreshold={0.7} mipmapBlur />
      <ChromaticAberration ref={ca} offset={offset.current} radialModulation={false} modulationOffset={0} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      <Vignette darkness={0.75} offset={0.25} />
    </EffectComposer>
  );
}
