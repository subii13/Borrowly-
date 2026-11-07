"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { voiceActivity } from "@/components/voice/activity";

// Ashima Arts 3D simplex noise (MIT) — drives the organic surface displacement.
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertexShader = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uFreq;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
${NOISE}
float field(vec3 p){
  return snoise(p * uFreq + vec3(uTime * 0.35, uTime * 0.22, uTime * 0.28)) + 0.1 * snoise(p * uFreq * 1.7 - uTime * 0.5);
}
void main(){
  // Displace along the normal, then rebuild the normal from two nearby displaced points so the
  // lighting follows the ripples instead of the original sphere.
  vec3 up = abs(normal.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t = normalize(cross(normal, up));
  vec3 b = normalize(cross(normal, t));
  float e = 0.015;
  float f0 = field(position);
  vec3 p0 = position + normal * f0 * uAmp;
  vec3 p1 = position + t * e + normal * field(position + t * e) * uAmp;
  vec3 p2 = position + b * e + normal * field(position + b * e) * uAmp;
  vec3 dn = normalize(cross(p1 - p0, p2 - p0));
  if (dot(dn, normal) < 0.0) dn = -dn;
  vNoise = f0;
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vNormal = normalize(normalMatrix * dn);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uGlow; uniform float uEnergy;
varying vec3 vNormal; varying vec3 vView; varying float vNoise;
void main(){
  vec3 n = normalize(vNormal);
  float fres = pow(1.0 - max(dot(n, vView), 0.0), 2.4);
  float key = max(dot(n, normalize(vec3(-0.5, 0.75, 0.6))), 0.0);
  float fill = max(dot(n, normalize(vec3(0.7, -0.3, 0.4))), 0.0);
  // Body colour follows the noise field: deep green in the folds, bright mint on the crests.
  vec3 base = mix(uDeep, uMid, smoothstep(-0.7, 0.8, vNoise));
  vec3 col = base * (0.62 + 0.55 * key + 0.18 * fill);
  col += uGlow * fres * (0.55 + uEnergy * 0.9);
  col += vec3(1.0) * pow(key, 28.0) * 0.45; // specular glint
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Target surface behaviour for each voice mode. */
function targets(mode: string, t: number, level: number) {
  switch (mode) {
    case "listening":
      return { amp: 0.1 + level * 0.45, freq: 1.05, speed: 1.6, energy: 0.4 + level, scale: 1.04 + level * 0.1 };
    case "thinking":
      return { amp: 0.15, freq: 1.4, speed: 3.2, energy: 0.8, scale: 0.98 };
    case "speaking": {
      const pulse = Math.abs(Math.sin(t * 8.5)) * (0.55 + 0.45 * Math.sin(t * 2.1));
      return { amp: 0.09 + pulse * 0.16, freq: 1.1, speed: 1.4, energy: 0.5 + pulse * 0.6, scale: 1.02 + pulse * 0.05 };
    }
    default:
      return { amp: 0.045 + Math.sin(t * 0.9) * 0.01, freq: 0.6, speed: 0.5, energy: 0.15, scale: 1 };
  }
}

function Blob({ detail }: { detail: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const clock = useRef(0);
  const live = useRef({ amp: 0.03, freq: 0.6, speed: 0.5, energy: 0.15, scale: 1 });
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.03 },
      uFreq: { value: 0.6 },
      uEnergy: { value: 0.15 },
      uDeep: { value: new THREE.Color("#1f5a43") },
      uMid: { value: new THREE.Color("#5fb48a") },
      uGlow: { value: new THREE.Color("#c9f5dc") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const tg = targets(voiceActivity.mode, state.clock.elapsedTime, voiceActivity.level);
    const k = 1 - Math.exp(-dt * 6); // frame-rate independent easing
    const l = live.current;
    l.amp += (tg.amp - l.amp) * k;
    l.freq += (tg.freq - l.freq) * k;
    l.speed += (tg.speed - l.speed) * k;
    l.energy += (tg.energy - l.energy) * k;
    l.scale += (tg.scale - l.scale) * k;
    clock.current += dt * l.speed;
    // Write to the material's own uniforms: R3F copies the initial object into the material.
    const u = material.current?.uniforms;
    if (u) {
      u.uTime.value = clock.current;
      u.uAmp.value = l.amp;
      u.uFreq.value = l.freq;
      u.uEnergy.value = l.energy;
    }
    if (mesh.current) {
      mesh.current.scale.setScalar(l.scale);
      mesh.current.rotation.y += dt * (0.12 + l.speed * 0.05);
      // Gentle tilt toward the pointer.
      mesh.current.rotation.x += (state.pointer.y * 0.25 - mesh.current.rotation.x) * k * 0.5;
      mesh.current.rotation.z += (-state.pointer.x * 0.15 - mesh.current.rotation.z) * k * 0.5;
    }
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.15, detail]} />
      <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}

function Halo({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 1.85 + Math.sin(i * 12.9898) * 0.12;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(i * 78.233) * 0.06;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const fast = voiceActivity.mode === "thinking" ? 1.6 : voiceActivity.mode === "idle" ? 0.15 : 0.5;
    points.current.rotation.y += Math.min(delta, 0.05) * fast;
  });

  return (
    <group rotation={[0.42, 0, -0.12]}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#7fcf9f" size={0.035} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
      </points>
    </group>
  );
}

/** WebGL voice orb. Loaded lazily; the parent renders a CSS orb while loading or when 3D is unavailable. */
export default function OrbScene({ active, lite }: { active: boolean; lite: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={lite ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0, 4.6], fov: 42 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Blob detail={lite ? 24 : 48} />
      <Halo count={lite ? 160 : 320} />
    </Canvas>
  );
}
