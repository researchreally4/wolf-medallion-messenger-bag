import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { rig } from "../store";

const charcoal = new THREE.Color("#0b0b0d");
const deepBlue = new THREE.Color("#0c1a2b");
const tmp = new THREE.Color();

export function Lighting() {
  const rim = useRef<THREE.SpotLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const warm = useRef<THREE.PointLight>(null);
  const scene = useThree((s) => s.scene);

  useFrame((state) => {
    tmp.copy(charcoal).lerp(deepBlue, rig.blue);
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(tmp);
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(tmp.getHex(), rig.fog);
    (scene.fog as THREE.FogExp2).color.copy(tmp);
    (scene.fog as THREE.FogExp2).density = rig.fog;
    if (rim.current) {
      rim.current.position.x = rig.rimX;
      rim.current.intensity = 60 + rig.warm * 60 - rig.blue * 40;
    }
    if (key.current) key.current.intensity = 2.2 + rig.blue * 1.5;
    if (warm.current) {
      warm.current.intensity = rig.warm * 8;
      warm.current.position.x = Math.sin(state.clock.elapsedTime * 0.6) * 3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight ref={key} position={[-3, 4, 4]} color="#9fbad6" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight ref={rim} position={[3, 2.5, -2.5]} angle={0.6} penumbra={0.8} color="#d9a441" />
      <pointLight ref={warm} position={[0, 1.5, 2.5]} color="#ffb067" intensity={0} />
      <Environment resolution={128}>
        <Lightformer intensity={1.2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} color="#8aa0b8" />
        <Lightformer intensity={0.8} color="#d9a441" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.6} color="#5b7a99" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
    </>
  );
}
