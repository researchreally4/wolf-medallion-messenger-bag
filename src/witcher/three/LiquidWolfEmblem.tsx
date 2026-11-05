import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeLiquidMaterial } from "../liquidMaterial";
import { rig, useUI } from "../store";
import { assetUrl } from "../assetUrl";

/** Rasterises /wolf-medallion.svg into a mask; falls back to procedural rings if it fails. */
function useEmblemMask() {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      c.getContext("2d")!.drawImage(img, 0, 0, 512, 512);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    };
    img.src = assetUrl("wolf-medallion.svg");
  }, []);
  return tex;
}

type Props = { variant: "hero" | "decal"; size: number; position?: [number, number, number] };
type Uniform<T> = { value: T };
type LiquidUniforms = {
  uTime: Uniform<number>;
  uScroll: Uniform<number>;
  uDistortion: Uniform<number>;
  uSoftness: Uniform<number>;
  uRefraction: Uniform<number>;
  uOpacity: Uniform<number>;
  uLiquid: Uniform<number>;
  uMouse: Uniform<THREE.Vector2>;
};

export function LiquidWolfEmblem({ variant, size, position = [0, 0, 0] }: Props) {
  const mask = useEmblemMask();
  const mat = useMemo(() => makeLiquidMaterial(mask), [mask]);
  const ref = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const [hovered, setHovered] = useState(false);
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, dt) => {
    const u = mat.uniforms as unknown as LiquidUniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uScroll.value = useUI.getState().progress;
    u.uMouse.value.set(rig.mouseX, rig.mouseY);
    hover.current += ((hovered ? 1 : 0) - hover.current) * Math.min(1, dt * 6);
    if (variant === "hero") {
      const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 1.4) * 0.15;
      u.uOpacity.value = rig.emblem * pulse;
      u.uLiquid.value = rig.liquid;
      u.uDistortion.value = 0.6 + rig.liquid * 1.4 + hover.current;
      u.uRefraction.value = 0.6 + rig.liquid * 1.5;
      if (ref.current) {
        ref.current.position.x = position[0] + rig.mouseX * 0.35;
        ref.current.position.y = position[1] + rig.mouseY * 0.2;
        ref.current.scale.setScalar(1 + hover.current * 0.04);
        ref.current.visible = rig.emblem > 0.01;
      }
    } else {
      // decal: dormant brass-silver until chapter 4 activates the liquid
      u.uOpacity.value = 0.55 + rig.liquid * 0.45;
      u.uLiquid.value = rig.liquid;
      u.uDistortion.value = rig.liquid * 2.2;
      u.uRefraction.value = rig.liquid * 2;
      u.uSoftness.value = 0.4 - rig.liquid * 0.25;
    }
  });

  return (
    <mesh
      ref={ref}
      position={position}
      material={mat}
      renderOrder={variant === "hero" ? -1 : 2}
      onPointerOver={() => { if (variant === "hero") setHovered(true); }}
      onPointerOut={() => { if (variant === "hero") setHovered(false); }}
    >
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
