/**
 * FinancialOrganism — the Pulse page's hero visualization.
 *
 * A WebGL scene rendered with three.js. Not a chart — a living instrument.
 *
 * Components of the organism:
 *   • Nucleus     — a shader-displaced sphere at world center. Radius encodes
 *                   ln(|net balance|); surface turbulence scales with spending
 *                   velocity; hue morphs mint↔red across the zero axis.
 *   • Day-Nodes   — instanced spheres arranged along a logarithmic temporal
 *                   spiral. Radius = √(day.spend / maxSpend). Emissive color
 *                   is the dominant category for that day.
 *   • Particles   — ~9,000 GPU-instanced points streaming along the spiral,
 *                   colored by dominant category, accelerating through wells.
 *   • Wells       — gravitational displacement centered on the heaviest days
 *                   deforms the particle field radially.
 *   • Income Rays — vertical light-shafts descending into the nucleus, one
 *                   per ~$1000 of income (capped) — visible cash flowing in.
 *   • Starfield   — a fullscreen background quad with a procedural shader
 *                   (star noise + nebula gradient) — no skybox textures.
 *
 * Interaction:
 *   • Pointer drag rotates the field.
 *   • Pointer move raycasts day-nodes; hover state is lifted via onHover.
 *   • Wheel/pinch zooms the temporal spiral.
 *
 * Degrades to:
 *   • Reduced-motion → single frame, no particles animating, no rotation drift.
 *   • No-data       → returns null; the page's empty state takes over.
 *   • No WebGL       → returns null with a message; page falls back.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { Box, Typography } from '@mui/material';
import { accents, chart } from '../../theme/tokens';
import { moneySmart } from './money';

/* ─── Shaders ─────────────────────────────────────────────────────────────── */

// Compact 3D simplex noise (Ashima) — used everywhere we need organic turbulence.
const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m; return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const NUCLEUS_VERT = /* glsl */`
uniform float uTime;
uniform float uTurbulence;   // 0..1 — spending velocity
uniform float uPulse;        // 0..1 — recent-day amplitude
varying vec3  vNormal;
varying vec3  vViewPos;
varying float vDisp;
${NOISE_GLSL}
void main(){
  vec3 p = position;
  float t = uTime * 0.35;
  float n1 = snoise(p * 1.4 + vec3(t, -t*0.7, t*0.4));
  float n2 = snoise(p * 3.1 + vec3(-t*0.8, t*0.5, -t)) * 0.5;
  float n3 = snoise(p * 6.2 + vec3(t*1.3, t*0.2, -t*0.9)) * 0.25;
  float disp = (n1 + n2 + n3) * (0.06 + uTurbulence * 0.18);
  disp += sin(uTime * 2.0) * 0.02 * uPulse;
  vec3 displaced = p + normal * disp;
  vDisp = disp;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const NUCLEUS_FRAG = /* glsl */`
uniform vec3  uCoreCold;    // deep interior (negative → red-shift; positive → mint)
uniform vec3  uCoreHot;     // rim / flare
uniform vec3  uFresnelCol;  // outer halo
uniform float uTime;
uniform float uPulse;
varying vec3  vNormal;
varying vec3  vViewPos;
varying float vDisp;
void main(){
  vec3 V = normalize(-vViewPos);
  float ndv = max(dot(vNormal, V), 0.0);
  float fresnel = pow(1.0 - ndv, 3.0);
  vec3 base = mix(uCoreCold, uCoreHot, smoothstep(-0.03, 0.06, vDisp));
  // hot filaments running with the noise displacement
  float fil = smoothstep(0.02, 0.09, vDisp);
  base += uCoreHot * fil * 0.6;
  vec3 halo = uFresnelCol * fresnel * (1.4 + 0.5 * sin(uTime * 1.6));
  vec3 col  = base * (0.55 + 0.45 * ndv) + halo;
  // subtle chromatic aberration on the rim — instability
  float aberr = fresnel * (0.15 + 0.05 * sin(uTime * 3.0));
  col.r += aberr * 0.25;
  col.b += aberr * 0.35;
  col *= 1.0 + 0.15 * uPulse;
  gl_FragColor = vec4(col, 1.0);
}
`;

const PARTICLE_VERT = /* glsl */`
attribute float aSize;
attribute float aSeed;
attribute float aRadius;    // spiral radius home
attribute float aAngle0;    // spiral angle home
attribute float aHeight;    // small z-offset
attribute vec3  aColor;
attribute float aSpeed;
uniform float   uTime;
uniform float   uDpr;
uniform vec3    uWellPos[4];   // up-to-4 heaviest-day positions
uniform float   uWellStr[4];   // matching strengths
varying vec3    vColor;
varying float   vAlpha;
void main(){
  float ang = aAngle0 + uTime * aSpeed * 0.3;
  vec3 p = vec3(cos(ang) * aRadius, sin(ang) * aRadius, aHeight);
  // gravitational displacement — particles bend toward wells
  for(int i = 0; i < 4; i++){
    vec3 d = uWellPos[i] - p;
    float dist = length(d) + 0.001;
    float pull = uWellStr[i] / (dist * dist + 0.4);
    p += normalize(d) * pull * 0.7;
  }
  // subtle vertical breathing
  p.z += sin(uTime * 1.2 + aSeed * 6.28) * 0.12;
  vColor = aColor;
  vAlpha = 0.35 + 0.45 * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 10.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uDpr * (200.0 / -mv.z);
}
`;

const PARTICLE_FRAG = /* glsl */`
varying vec3  vColor;
varying float vAlpha;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float glow = exp(-r2 * 4.0);
  gl_FragColor = vec4(vColor * (0.9 + glow * 0.9), vAlpha * glow);
}
`;

const SKY_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
`;

const SKY_FRAG = /* glsl */`
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uNebulaA;
uniform vec3  uNebulaB;
varying vec2  vUv;
${NOISE_GLSL}
// classic hash-based stars
float hash21(vec2 p){ p = fract(p*vec2(234.34,435.345)); p += dot(p, p+34.23); return fract(p.x*p.y); }
float starLayer(vec2 uv, float scale){
  vec2 g = fract(uv*scale)-0.5; vec2 id = floor(uv*scale);
  float h = hash21(id); if(h < 0.985) return 0.0;
  float s = smoothstep(0.06, 0.0, length(g)) * (h - 0.985) * 66.0;
  s *= 0.6 + 0.4 * sin(uTime * (1.0 + h*4.0) + h * 20.0);
  return s;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  // deep-void base
  vec3 col = vec3(0.006, 0.008, 0.018);
  // slow-moving nebula clouds
  float n = snoise(vec3(uv*1.4, uTime*0.03))*0.5 + 0.5;
  float m = snoise(vec3(uv*3.1 + 4.0, uTime*0.02))*0.5 + 0.5;
  col += uNebulaA * pow(n, 2.5) * 0.14;
  col += uNebulaB * pow(m, 3.5) * 0.10;
  // radial vignette toward center for depth
  col *= 1.0 - smoothstep(0.4, 1.4, length(uv)) * 0.55;
  // 3 star layers at different scales — parallax feel
  float s = starLayer(uv, 60.0) + starLayer(uv+13.0, 120.0)*0.6 + starLayer(uv-7.0, 220.0)*0.35;
  col += vec3(s) * vec3(0.9, 0.95, 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

// Small vignette + film grain finalizer
const FINAL_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float     uTime;
uniform vec2      uRes;
varying vec2      vUv;
float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
void main(){
  vec4 col = texture2D(tDiffuse, vUv);
  // vignette
  vec2 v = vUv - 0.5;
  float vig = 1.0 - dot(v,v) * 1.15;
  col.rgb *= clamp(vig, 0.35, 1.0);
  // film grain
  float g = hash(vUv * uRes + uTime) - 0.5;
  col.rgb += g * 0.025;
  // faint horizontal scanlines
  col.rgb *= 1.0 - 0.04 * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = col;
}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function FinancialOrganism({
  days = [],
  categories = [],
  net = 0,
  income = 0,
  onHover,          // (dayIndex|null) => void
  height,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const hoverRef = useRef(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // Derive strengths from data — everything visual is data-true.
  const derived = useMemo(() => {
    const maxSpend = Math.max(...days.map(d => d.total || 0), 1);
    const totalSpend = days.reduce((s, d) => s + (d.total || 0), 0);
    const avgSpend = days.length ? totalSpend / days.length : 0;
    // velocity — avg day-to-day change / max
    let vel = 0;
    for (let i = 1; i < days.length; i++) {
      vel += Math.abs((days[i].total || 0) - (days[i - 1].total || 0));
    }
    vel = days.length > 1 ? vel / ((days.length - 1) * maxSpend) : 0;
    // heaviest 4 days become gravitational wells
    const sorted = days.map((d, i) => ({ i, t: d.total || 0 })).sort((a, b) => b.t - a.t);
    const wells = sorted.slice(0, 4).map(({ i, t }) => ({ i, strength: t / maxSpend }));
    return { maxSpend, totalSpend, avgSpend, velocity: Math.min(vel, 1), wells };
  }, [days]);

  useEffect(() => {
    if (!days.length) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Feature-detect WebGL
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) { setWebglOk(false); return; }

    /* Renderer */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    canvasRef.current = renderer.domElement;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    wrap.appendChild(renderer.domElement);

    /* Scene + Camera */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.028);
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, -22, 26);
    camera.lookAt(0, 0, 0);

    /* Skybox — a fullscreen quad in its own scene, rendered first */
    const skyScene = new THREE.Scene();
    const skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(w * dpr, h * dpr) },
        uTime: { value: 0 },
        uNebulaA: { value: new THREE.Color(accents.violet).multiplyScalar(0.9) },
        uNebulaB: { value: new THREE.Color(accents.cyan).multiplyScalar(0.8) },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthWrite: false, depthTest: false,
    });
    skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));

    /* Organism group — everything the user drags rotates as one */
    const organism = new THREE.Group();
    scene.add(organism);

    /* Spiral layout — logarithmic, today at center (radius ~2), month-start at rim (radius ~10) */
    const N = days.length;
    const radiusFor = (i) => {
      const t = 1 - i / Math.max(N - 1, 1);   // most-recent → smallest radius
      return 2.4 + Math.pow(t, 1.15) * 8.5;
    };
    const angleFor = (i) => -i * 0.55;         // constant turn per day

    /* Category palette — same source as canvas charts, so categories stay recognizable */
    const catPalette = chart.categorical.dark;
    const catIndex = new Map();
    categories.forEach((c, i) => catIndex.set(c, i % catPalette.length));
    const colorForDay = (d) => {
      if (!d.cats || !d.cats.length) return new THREE.Color(0x304060);
      const top = d.cats[0];
      const idx = catIndex.get(top.name) ?? 0;
      return new THREE.Color(catPalette[idx]);
    };

    /* Nucleus — hero object at center */
    const netMag = Math.abs(net);
    const nucleusR = 0.9 + Math.log10(netMag + 10) * 0.28;
    const netCold = net >= 0
      ? new THREE.Color(accents.mint).multiplyScalar(0.35)
      : new THREE.Color(accents.red).multiplyScalar(0.35);
    const netHot = net >= 0
      ? new THREE.Color(accents.cyan)
      : new THREE.Color(accents.amber);
    const halo = new THREE.Color(accents.violet).multiplyScalar(1.2);
    const nucleusMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTurbulence: { value: derived.velocity },
        uPulse: { value: Math.min(derived.avgSpend / derived.maxSpend, 1) },
        uCoreCold: { value: netCold },
        uCoreHot:  { value: netHot },
        uFresnelCol: { value: halo },
      },
      vertexShader: NUCLEUS_VERT,
      fragmentShader: NUCLEUS_FRAG,
    });
    const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(nucleusR, 6), nucleusMat);
    organism.add(nucleus);

    // Nucleus outer soft-glow sprite — a billboarded quad, cheap fake-bloom halo
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: halo }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){ vec2 c=vUv-0.5; float d=length(c);
          float a = smoothstep(0.5,0.0,d) * (0.25 + 0.08*sin(uTime*1.4));
          gl_FragColor=vec4(uColor, a*0.35); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(nucleusR * 5, nucleusR * 5), glowMat);
    organism.add(glow);

    /* Day-nodes — one instanced mesh, per-instance color + matrix.
       Radius encodes spend, position is the spiral. */
    const nodeGeo = new THREE.IcosahedronGeometry(1, 2);
    const nodeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.98 });
    const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, N);
    const nodeColors = new Float32Array(N * 3);
    nodes.instanceColor = new THREE.InstancedBufferAttribute(nodeColors, 3);
    nodes.instanceColor.setUsage(THREE.DynamicDrawUsage);
    const nodePositions = []; // world positions for wells + raycasting
    const dummyObj = new THREE.Object3D();
    days.forEach((d, i) => {
      const r = radiusFor(i);
      const a = angleFor(i);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const z = 0;
      const spendFrac = (d.total || 0) / derived.maxSpend;
      const nodeR = 0.16 + Math.sqrt(spendFrac) * 0.65;
      dummyObj.position.set(x, y, z);
      dummyObj.scale.setScalar(nodeR);
      dummyObj.updateMatrix();
      nodes.setMatrixAt(i, dummyObj.matrix);
      const col = colorForDay(d);
      nodeColors[i * 3 + 0] = col.r; nodeColors[i * 3 + 1] = col.g; nodeColors[i * 3 + 2] = col.b;
      nodePositions.push(new THREE.Vector3(x, y, z));
    });
    nodes.instanceMatrix.needsUpdate = true;
    nodes.instanceColor.needsUpdate = true;
    organism.add(nodes);

    /* Node halo — one bigger, dimmer instanced sphere behind each node for "emission" */
    const nodeHaloMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    const nodeHalos = new THREE.InstancedMesh(nodeGeo, nodeHaloMat, N);
    const haloColors = new Float32Array(N * 3);
    nodeHalos.instanceColor = new THREE.InstancedBufferAttribute(haloColors, 3);
    days.forEach((d, i) => {
      const r = radiusFor(i);
      const a = angleFor(i);
      const spendFrac = (d.total || 0) / derived.maxSpend;
      const nodeR = 0.16 + Math.sqrt(spendFrac) * 0.65;
      dummyObj.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      dummyObj.scale.setScalar(nodeR * 3.2);
      dummyObj.updateMatrix();
      nodeHalos.setMatrixAt(i, dummyObj.matrix);
      const col = colorForDay(d);
      haloColors[i * 3 + 0] = col.r; haloColors[i * 3 + 1] = col.g; haloColors[i * 3 + 2] = col.b;
    });
    nodeHalos.instanceMatrix.needsUpdate = true;
    nodeHalos.instanceColor.needsUpdate = true;
    organism.add(nodeHalos);

    /* Spiral line — a thin line tracing the temporal orbit through every day */
    const linePts = [];
    if (N > 1) {
      const totalSteps = (N - 1) * 8;
      for (let k = 0; k <= totalSteps; k++) {
        const idx = (k / totalSteps) * (N - 1);
        const r = radiusFor(idx);
        const a = angleFor(idx);
        linePts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x445088, transparent: true, opacity: 0.28 });
    organism.add(new THREE.Line(lineGeom, lineMat));

    /* Particle field — ~9000 points along the spiral, colored by their home-day category */
    const P = reduce ? 1200 : 9000;
    const pGeom = new THREE.BufferGeometry();
    const pPos = new Float32Array(P * 3);   // required by three; we compute in shader
    const aRadius = new Float32Array(P);
    const aAngle0 = new Float32Array(P);
    const aHeight = new Float32Array(P);
    const aSize = new Float32Array(P);
    const aSeed = new Float32Array(P);
    const aColor = new Float32Array(P * 3);
    const aSpeed = new Float32Array(P);
    for (let p = 0; p < P; p++) {
      const t = Math.random();
      const idxFloat = t * (N - 1);
      const idx = Math.floor(idxFloat);
      const home = days[idx];
      const rBase = radiusFor(idxFloat) + (Math.random() - 0.5) * 0.35;
      const aBase = angleFor(idxFloat) + (Math.random() - 0.5) * 0.09;
      aRadius[p] = rBase;
      aAngle0[p] = aBase;
      aHeight[p] = (Math.random() - 0.5) * 0.5;
      aSize[p] = 0.6 + Math.pow(Math.random(), 3) * 3.2;
      aSeed[p] = Math.random();
      aSpeed[p] = 0.3 + Math.random() * 1.5;
      const col = home ? colorForDay(home) : new THREE.Color(0.4, 0.5, 0.9);
      // 15% chance to be a bright "cash" particle (white/cyan) — echoes income
      if (Math.random() < 0.15) col.set(accents.cyan);
      aColor[p * 3 + 0] = col.r; aColor[p * 3 + 1] = col.g; aColor[p * 3 + 2] = col.b;
      pPos[p * 3] = 0; pPos[p * 3 + 1] = 0; pPos[p * 3 + 2] = 0;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeom.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
    pGeom.setAttribute('aAngle0', new THREE.BufferAttribute(aAngle0, 1));
    pGeom.setAttribute('aHeight', new THREE.BufferAttribute(aHeight, 1));
    pGeom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    pGeom.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    pGeom.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    pGeom.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));

    // Wells uniform arrays (max 4)
    const wellPos = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const wellStr = new Float32Array(4);
    derived.wells.forEach((w, i) => {
      if (i > 3) return;
      wellPos[i].copy(nodePositions[w.i]);
      wellStr[i] = w.strength;
    });

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: dpr },
        uWellPos: { value: wellPos },
        uWellStr: { value: wellStr },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeom, particleMat);
    particles.frustumCulled = false;   // positions computed in vertex shader
    // Prevent CPU-side bounding sphere (all zero positions → NaN division)
    pGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
    organism.add(particles);

    /* Income rays — vertical shafts descending toward the nucleus.
       One per ~$1000 income, capped at 20 for visual density. */
    const rayCount = Math.min(20, Math.max(1, Math.floor(income / 1000)));
    const rays = new THREE.Group();
    for (let r = 0; r < rayCount; r++) {
      const angle = (r / rayCount) * Math.PI * 2;
      const rad = 2.5 + (r % 3) * 0.3;
      const geo = new THREE.CylinderGeometry(0.02, 0.06, 12, 8, 1, true);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOffset: { value: Math.random() }, uColor: { value: new THREE.Color(accents.mint) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uOffset; varying vec2 vUv;
          void main(){
            float a = smoothstep(1.0, 0.0, vUv.y) * 0.55;
            a *= smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
            float pulse = 0.5 + 0.5 * sin(uTime*2.0 - vUv.y*8.0 + uOffset*6.28);
            gl_FragColor = vec4(uColor * (0.8 + 0.6*pulse), a);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const cyl = new THREE.Mesh(geo, mat);
      cyl.position.set(Math.cos(angle) * rad, Math.sin(angle) * rad, 6);
      cyl.rotation.x = Math.PI / 2;
      cyl.userData.mat = mat;
      rays.add(cyl);
    }
    organism.add(rays);

    /* Compass ring — a static "instrumentation" torus around the nucleus.
       Ticks encode the maxSpend axis; it's a visible ruler. */
    const ringGeo = new THREE.TorusGeometry(nucleusR * 2.4, 0.008, 8, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x64d2ff, transparent: true, opacity: 0.32 });
    organism.add(new THREE.Mesh(ringGeo, ringMat));
    // ticks — 12 tiny boxes around the ring
    for (let ti = 0; ti < 24; ti++) {
      const a = (ti / 24) * Math.PI * 2;
      const tickR = nucleusR * 2.4;
      const tickGeo = new THREE.BoxGeometry(ti % 6 === 0 ? 0.09 : 0.04, 0.008, 0.008);
      const tickMat = new THREE.MeshBasicMaterial({ color: ti % 6 === 0 ? 0xffffff : 0x64d2ff, transparent: true, opacity: ti % 6 === 0 ? 0.8 : 0.35 });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(Math.cos(a) * tickR, Math.sin(a) * tickR, 0);
      tick.rotation.z = a;
      organism.add(tick);
    }

    /* Post-processing: bloom + finalizer (grain/vignette/scanlines) */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    // Bloom is expensive — use small threshold for glow but keep strength restrained.
    // Strength 0.45 lets the nucleus glow without blowing out.
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.45, 0.6, 0.55);
    composer.addPass(bloom);
    const finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uRes:  { value: new THREE.Vector2(w * dpr, h * dpr) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: FINAL_FRAG,
    });
    composer.addPass(finalPass);

    /* Interaction — drag to rotate; wheel to zoom; move to raycast */
    let dragging = false, lastX = 0, lastY = 0;
    let rotY = 0, rotX = 0;    // target
    let curRotY = 0, curRotX = 0;
    let camZ = 26, camZT = 26;
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0 };
    const mouse = new THREE.Vector2();

    const onPointerDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.style.cursor = 'grabbing'; };
    const onPointerUp = () => { dragging = false; renderer.domElement.style.cursor = 'grab'; };
    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (dragging) {
        rotY += (e.clientX - lastX) * 0.006;
        rotX += (e.clientY - lastY) * 0.006;
        rotX = Math.max(-0.6, Math.min(0.6, rotX));
        lastX = e.clientX; lastY = e.clientY;
      } else {
        // raycast the day-nodes for hover
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(nodes);
        const newHover = hits.length ? hits[0].instanceId : null;
        if (newHover !== hoverRef.current) {
          hoverRef.current = newHover;
          onHoverRef.current?.(newHover);
        }
      }
    };
    const onPointerLeave = () => {
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
      if (hoverRef.current !== null) { hoverRef.current = null; onHoverRef.current?.(null); }
    };
    const onWheel = (e) => {
      e.preventDefault();
      camZT = Math.max(14, Math.min(46, camZT + Math.sign(e.deltaY) * 1.5));
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    /* Resize */
    const onResize = () => {
      const nw = wrap.clientWidth, nh = wrap.clientHeight;
      renderer.setSize(nw, nh, false);
      composer.setSize(nw, nh);
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      skyMat.uniforms.uRes.value.set(nw * dpr, nh * dpr);
      finalPass.uniforms.uRes.value.set(nw * dpr, nh * dpr);
    };
    const ro = new ResizeObserver(onResize); ro.observe(wrap);

    /* Loop with visibility/intersection pause */
    let raf = 0, running = true, tPrev = 0, t = 0;
    const loop = (now) => {
      if (!running) return;
      const dt = tPrev ? Math.min((now - tPrev) / 1000, 0.05) : 0.016;
      tPrev = now; t += dt;
      // smooth rotate + zoom
      curRotY += (rotY - curRotY) * 0.1;
      curRotX += (rotX - curRotX) * 0.1;
      // ambient drift when idle (unless reduced motion)
      if (!dragging && !reduce) rotY += dt * 0.03;
      organism.rotation.y = curRotY;
      organism.rotation.x = curRotX;
      camZ += (camZT - camZ) * 0.08;
      camera.position.z = camZ;
      // uniforms
      nucleusMat.uniforms.uTime.value = t;
      glowMat.uniforms.uTime.value = t;
      skyMat.uniforms.uTime.value = t;
      particleMat.uniforms.uTime.value = t;
      finalPass.uniforms.uTime.value = t;
      rays.children.forEach(c => { c.userData.mat.uniforms.uTime.value = t; });
      // billboard glow to face camera
      glow.lookAt(camera.position);
      // render: sky first (into main target), then main scene, then bloom+final
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(skyScene, skyCam);
      renderer.clearDepth();
      composer.render();
      renderer.autoClear = true;
      raf = requestAnimationFrame(loop);
    };
    const start = () => { tPrev = 0; raf = requestAnimationFrame(loop); };
    if (reduce) { start(); setTimeout(() => { cancelAnimationFrame(raf); running = false; }, 60); }
    else start();

    let visible = true, onScreen = true;
    const sync = () => {
      const want = visible && onScreen && !reduce;
      if (want === running) return;
      running = want;
      if (want) start(); else cancelAnimationFrame(raf);
    };
    const onVis = () => { visible = !document.hidden; sync(); };
    document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: 0.02 });
    io.observe(wrap);

    return () => {
      running = false; cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      wrap.removeChild(renderer.domElement);
      // Dispose GPU resources
      composer.dispose?.();
      renderer.dispose();
      nucleusMat.dispose(); nucleus.geometry.dispose();
      glowMat.dispose(); glow.geometry.dispose();
      particleMat.dispose(); pGeom.dispose();
      nodeGeo.dispose(); nodeMat.dispose(); nodeHaloMat.dispose();
      skyMat.dispose();
      rays.children.forEach(c => { c.geometry.dispose(); c.userData.mat.dispose(); });
      lineGeom.dispose(); lineMat.dispose();
      ringGeo.dispose(); ringMat.dispose();
    };
  }, [days, categories, net, income, reduce, derived]);

  if (!webglOk) {
    return (
      <Box sx={{ height: height || 620, display: 'flex', alignItems: 'center', justifyContent: 'center',
                 border: '1px solid', borderColor: 'divider', borderRadius: 5, bgcolor: 'background.paper' }}>
        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
          WebGL is disabled in this browser — the organism cannot render.
        </Typography>
      </Box>
    );
  }
  if (!days.length) return null;

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={`Financial organism. Net position ${moneySmart(net)}. ${days.length} days rendered.`}
      sx={{
        position: 'relative', width: '100%',
        height: height || 620,
        borderRadius: 5, overflow: 'hidden',
        // no gradient — the organism paints its own void
        bgcolor: '#04050a',
        border: '1px solid rgba(120, 140, 200, 0.12)',
      }}
    />
  );
}
