import * as THREE from "three";

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const frag = /* glsl */ `
uniform sampler2D uMask; uniform float uHasMask;
uniform float uTime, uScroll, uDistortion, uSoftness, uRefraction, uOpacity, uLiquid;
uniform vec2 uMouse;
uniform vec3 uSilver, uSteel, uAmber;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
float mask(vec2 uv){
  if (uHasMask > 0.5) return texture2D(uMask, uv).a * step(0.0, uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
  float d = length(uv-0.5); return smoothstep(0.47,0.45,d) - smoothstep(0.41,0.39,d) + smoothstep(0.3,0.28,d);
}
void main(){
  float t = uTime*0.35;
  vec2 uv = vUv;
  vec2 n = vec2(fbm(uv*3.0 + t), fbm(uv*3.0 - t + 4.2)) - 0.5;
  uv += n * uDistortion * (0.04 + 0.06*uLiquid) + uMouse*0.015;
  float off = uRefraction * 0.012;
  float r = mask(uv + vec2(off,0.0));
  float g = mask(uv);
  float b = mask(uv - vec2(off,0.0));
  float a = max(max(r,g),b);
  if (a < 0.01) discard;
  float f = fbm(uv*4.0 + vec2(t*0.6, -t) + uScroll*2.0);
  float bands = sin((uv.y + f*0.8 + uv.x*0.4)*18.0 - uTime*1.2)*0.5+0.5;
  bands = smoothstep(0.5 - uSoftness, 0.5 + uSoftness, bands);
  vec3 col = mix(uSteel, uSilver, bands);
  col = mix(col, uAmber, smoothstep(0.6, 0.95, f) * (0.35 + 0.4*(1.0-uLiquid)));
  float streak = pow(max(0.0, sin((uv.x - uv.y)*6.0 + uTime*0.9)), 40.0);
  col += streak * 1.4;
  col.r += (r - g) * 0.6; col.b += (b - g) * 0.9; // chromatic edge
  gl_FragColor = vec4(col * 1.25, a * uOpacity);
}`;

export function makeLiquidMaterial(mask: THREE.Texture | null) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uMask: { value: mask },
      uHasMask: { value: mask ? 1 : 0 },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uDistortion: { value: 0.6 },
      uSoftness: { value: 0.25 },
      uRefraction: { value: 0.6 },
      uOpacity: { value: 1 },
      uLiquid: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uSilver: { value: new THREE.Color("#c9ced6") },
      uSteel: { value: new THREE.Color("#5b7a99") },
      uAmber: { value: new THREE.Color("#d9a441") },
    },
  });
}
