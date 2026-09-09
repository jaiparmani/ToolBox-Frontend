/**
 * FinancialOrganism v2 — The Instrument.
 *
 * A rebuild motivated by three weaknesses in the v1 spiral:
 *
 *   (1) Data-truth was decorative. Day-nodes were dots, particles orbited.
 *       You could not read your spending from the scene.
 *   (2) Navigation was generic 3D — drag-rotate, wheel-zoom. Every
 *       three.js scene does that.
 *   (3) UI floated over canvas as corner cards, disconnected from the world.
 *
 * v2 answers all three:
 *
 *   • The month is a linear temporal manifold — a row of GPU-instanced
 *     stack-bars. Each bar's HEIGHT is literally the day's spend
 *     (log-scaled so a big day doesn't crush the small ones). Each stack
 *     SEGMENT is a category share. You read the month at a glance.
 *
 *   • The scene has a scrub cursor — a vertical read-head. Everything
 *     ahead ghosts to 12% alpha; everything behind is illuminated. The
 *     cursor snaps magnetically to real day columns. You sweep it to
 *     replay your month.
 *
 *   • The primary readout is diegetic — a canvas-texture plane floats
 *     above the cursor, showing the exact date, day-spend and running
 *     net at that time-slice. The label moves with the cursor. There is
 *     no "current" tooltip; the world is the tooltip.
 *
 *   • The nucleus rides the cursor as the "position marker." Its radius
 *     tracks |running-net at cursor|; its color signs the direction
 *     (mint if you're cumulatively ahead, red if behind).
 *
 *   • An emissive ink-line — a spline traced through every day's bar top
 *     — is your literal waveform. Every point is a physical vertex on a
 *     physical object.
 *
 * Ambient layers (starfield / nebula / bloom / grain) are preserved
 * because they still do the atmosphere job.
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

/* ─── Shader source ──────────────────────────────────────────────────────── */

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

// Reveal function — <1 ahead of cursor, 1 behind. `edge` is the sweep width.
const REVEAL_GLSL = /* glsl */`
float reveal(float x, float cursor, float edge){
  return smoothstep(cursor + edge, cursor - edge, x);
}
`;

const NUCLEUS_VERT = /* glsl */`
uniform float uTime;
uniform float uTurbulence;
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
  float disp = (n1 + n2 + n3) * (0.05 + uTurbulence * 0.18);
  vec3 displaced = p + normal * disp;
  vDisp = disp;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const NUCLEUS_FRAG = /* glsl */`
uniform vec3  uCoreCold;
uniform vec3  uCoreHot;
uniform vec3  uFresnelCol;
uniform float uTime;
varying vec3  vNormal;
varying vec3  vViewPos;
varying float vDisp;
void main(){
  vec3 V = normalize(-vViewPos);
  float ndv = max(dot(vNormal, V), 0.0);
  float fresnel = pow(1.0 - ndv, 3.0);
  vec3 base = mix(uCoreCold, uCoreHot, smoothstep(-0.03, 0.06, vDisp));
  float fil = smoothstep(0.02, 0.09, vDisp);
  base += uCoreHot * fil * 0.6;
  vec3 halo = uFresnelCol * fresnel * (1.4 + 0.5 * sin(uTime * 1.6));
  vec3 col  = base * (0.55 + 0.45 * ndv) + halo;
  float aberr = fresnel * (0.15 + 0.05 * sin(uTime * 3.0));
  col.r += aberr * 0.25;
  col.b += aberr * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Stack-segment instanced material — one instance per (day, category) box.
// Passes through instance color; the fragment reads the reveal uniform and
// dims segments ahead of the cursor.
const BAR_VERT = /* glsl */`
uniform float uCursorX;
uniform float uCursorEdge;
attribute vec3 instColor;
attribute float instX;      // world x of this segment's day column
varying float vReveal;
varying vec3  vColor;
varying vec2  vUv;
${REVEAL_GLSL}
void main(){
  vUv = uv;
  vColor = instColor;
  vReveal = reveal(instX, uCursorX, uCursorEdge);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const BAR_FRAG = /* glsl */`
uniform float uTime;
varying float vReveal;
varying vec3  vColor;
varying vec2  vUv;
void main(){
  // Bar is a slim column — soften edges left/right so it doesn't look pixelated.
  float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  // Inner scan bands travel upward — subtle instrument character.
  float band = 0.6 + 0.4 * sin(vUv.y * 22.0 - uTime * 3.5);
  // Ahead of cursor: ghost (very dim, desaturated); behind: full color + glow.
  vec3 dim = mix(vec3(dot(vColor, vec3(0.33))), vColor, 0.35);
  vec3 col = mix(dim * 0.28, vColor * (0.85 + 0.25 * band), vReveal);
  float alpha = mix(0.35, 1.0, vReveal) * edgeFade;
  gl_FragColor = vec4(col, alpha);
}
`;

// Particle: anchored to a home-day column; jitters upward + horizontally.
// Colored by home-day dominant category. Dimmed ahead of cursor.
const PARTICLE_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform float uCursorX;
uniform float uCursorEdge;
attribute float aHomeX;    // world x of home-day column
attribute float aHomeH;    // world height of that day's bar (spend energy)
attribute float aBand;     // random offset in [0,1] — vertical band position
attribute float aJitter;   // random horizontal spread within column
attribute float aSize;
attribute float aSeed;
attribute vec3  aColor;
attribute float aSpeed;
varying vec3  vColor;
varying float vAlpha;
varying float vReveal;
${REVEAL_GLSL}
void main(){
  // Rise from the bar top, drift sideways, wrap.
  float rise = fract(aSeed + uTime * aSpeed * 0.05);
  float y = aHomeH + rise * 3.5 + sin(uTime + aSeed * 6.28) * 0.15;
  float x = aHomeX + aJitter + sin(uTime * 0.6 + aSeed * 4.0) * 0.12;
  float z = (aBand - 0.5) * 0.9 + cos(uTime * 0.4 + aSeed * 8.0) * 0.2;
  vec3 p = vec3(x, y, z);
  vColor = aColor;
  // Fade with rise (higher = more sparse)
  vAlpha = (1.0 - smoothstep(0.6, 1.0, rise)) * (0.4 + 0.6 * fract(aSeed * 7.0));
  vReveal = reveal(aHomeX, uCursorX, uCursorEdge);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uDpr * (200.0 / -mv.z);
}
`;

const PARTICLE_FRAG = /* glsl */`
varying vec3  vColor;
varying float vAlpha;
varying float vReveal;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float glow = exp(-r2 * 4.0);
  vec3 dim = mix(vec3(dot(vColor, vec3(0.33))), vColor, 0.4) * 0.35;
  vec3 col = mix(dim, vColor, vReveal);
  float a = vAlpha * glow * mix(0.25, 1.0, vReveal);
  gl_FragColor = vec4(col, a);
}
`;

// Scrub cursor plane — a vertical column of light at cursor.x
const CURSOR_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CURSOR_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uTime;
varying vec2  vUv;
void main(){
  // Horizontal falloff — a slim glowing rod.
  float d = abs(vUv.x - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = pow(a, 2.2);
  // Traveling pulse along Y.
  float travel = 0.6 + 0.4 * sin(uTime * 2.5 - vUv.y * 12.0);
  gl_FragColor = vec4(uColor * (0.8 + 0.4 * travel), a * 0.75);
}
`;

// Ink-line: emissive spline through the tops of every bar
const INK_VERT = /* glsl */`
uniform float uCursorX;
uniform float uCursorEdge;
varying float vReveal;
${REVEAL_GLSL}
void main(){
  vReveal = reveal(position.x, uCursorX, uCursorEdge);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const INK_FRAG = /* glsl */`
uniform vec3 uColor;
varying float vReveal;
void main(){
  vec3 dim = mix(vec3(dot(uColor, vec3(0.33))), uColor, 0.3) * 0.3;
  gl_FragColor = vec4(mix(dim, uColor, vReveal), mix(0.35, 0.95, vReveal));
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
  vec3 col = vec3(0.006, 0.008, 0.018);
  float n = snoise(vec3(uv*1.4, uTime*0.03))*0.5 + 0.5;
  float m = snoise(vec3(uv*3.1 + 4.0, uTime*0.02))*0.5 + 0.5;
  col += uNebulaA * pow(n, 2.5) * 0.12;
  col += uNebulaB * pow(m, 3.5) * 0.08;
  col *= 1.0 - smoothstep(0.4, 1.4, length(uv)) * 0.55;
  float s = starLayer(uv, 60.0) + starLayer(uv+13.0, 120.0)*0.6 + starLayer(uv-7.0, 220.0)*0.35;
  col += vec3(s) * vec3(0.9, 0.95, 1.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FINAL_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float     uTime;
uniform vec2      uRes;
varying vec2      vUv;
float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
void main(){
  vec4 col = texture2D(tDiffuse, vUv);
  vec2 v = vUv - 0.5;
  float vig = 1.0 - dot(v,v) * 1.15;
  col.rgb *= clamp(vig, 0.35, 1.0);
  float g = hash(vUv * uRes + uTime) - 0.5;
  col.rgb += g * 0.02;
  col.rgb *= 1.0 - 0.035 * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = col;
}
`;

/* ─── Data grooming ──────────────────────────────────────────────────────── */

// Reduce arbitrary category list to a fixed palette-friendly 6 + "Other".
function bucketCategories(days) {
  const totals = new Map();
  days.forEach(d => (d.cats || []).forEach(c => totals.set(c.name, (totals.get(c.name) || 0) + c.amount)));
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6).map(([name]) => name);
  const catList = [...top, 'Other'];
  const idxOf = new Map(catList.map((n, i) => [n, i]));
  return { catList, idxOf };
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function FinancialOrganism({
  days = [], categories = [], net = 0, income = 0,
  onCursorChange, height, initialCursor = null,
}) {
  const wrapRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  // cursor is a float in [0, N-1] — which day column it's over
  const [cursorIdx, setCursorIdx] = useState(initialCursor ?? Math.max(days.length - 1, 0));
  const cursorRef = useRef(cursorIdx);
  cursorRef.current = cursorIdx;
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const derived = useMemo(() => {
    if (!days.length) return null;
    const { catList, idxOf } = bucketCategories(days);
    const maxSpend = Math.max(...days.map(d => d.total || 0), 1);
    // Log-scale bar heights so a giant day doesn't crush the small ones.
    const heightFor = (spend) => Math.log10(spend + 1) / Math.log10(maxSpend + 1) * 4.4;
    // Precompute per-day segment breakdown [{catIdx, amount, share, color, height}]
    const palette = chart.categorical.dark;
    const catColorFor = (idx) => palette[idx % palette.length];
    const daySegments = days.map((d, di) => {
      const bucketed = new Map();
      (d.cats || []).forEach(c => {
        const idx = idxOf.get(c.name) ?? idxOf.get('Other');
        bucketed.set(idx, (bucketed.get(idx) || 0) + c.amount);
      });
      const entries = [...bucketed.entries()].sort((a, b) => b[1] - a[1]);
      const total = d.total || 0;
      const barH = heightFor(total);
      let yAccum = 0;
      const segs = entries.map(([idx, amount]) => {
        const share = total > 0 ? amount / total : 0;
        const h = barH * share;
        const y = yAccum + h / 2;
        yAccum += h;
        return { catIdx: idx, amount, share, color: catColorFor(idx), h, y };
      });
      return { di, total, barH, segs, topCatIdx: entries.length ? entries[0][0] : 0 };
    });
    // Running cumulative net at each day: income spread evenly, subtract spend.
    const perDayIncome = income / Math.max(days.length, 1);
    const cumNet = [];
    let c = 0;
    for (let i = 0; i < days.length; i++) {
      c += perDayIncome - (days[i].total || 0);
      cumNet.push(c);
    }
    const maxAbsCum = Math.max(...cumNet.map(Math.abs), 1);
    return { catList, idxOf, palette, catColorFor, daySegments, maxSpend, cumNet, maxAbsCum, heightFor };
  }, [days, income]);

  /* ─── Three.js scene ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!derived) return;
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) { setWebglOk(false); return; }

    const N = days.length;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'ew-resize';
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.028);
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200);
    camera.position.set(0, 3.8, 16.5);
    camera.lookAt(0, 1.6, 0);

    /* Layout — a horizontal line at y=0, spanning [-halfW, halfW] on X. */
    const halfW = 8;
    const dayX = (i) => -halfW + (i / Math.max(N - 1, 1)) * (halfW * 2);
    const stepW = (halfW * 2) / Math.max(N - 1, 1);
    const barW = Math.min(stepW * 0.55, 0.34);

    /* Skybox */
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

    /* Ground grid — subtle amplitude reference plane. */
    const grid = new THREE.GridHelper(halfW * 2, N, 0x2a3050, 0x1a2038);
    grid.material.transparent = true;
    grid.material.opacity = 0.24;
    grid.position.y = 0;
    scene.add(grid);
    // Horizontal amplitude gridlines behind the bars
    for (let g = 1; g <= 4; g++) {
      const y = (g / 4) * 4.4;
      const gGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfW - 0.5, y, -1.6),
        new THREE.Vector3(halfW + 0.5, y, -1.6),
      ]);
      const gMat = new THREE.LineBasicMaterial({ color: 0x2a3050, transparent: true, opacity: 0.35 });
      scene.add(new THREE.Line(gGeom, gMat));
    }

    /* Cursor uniforms (shared across materials) */
    const uCursorX = { value: dayX(cursorRef.current) };
    const uCursorEdge = { value: barW * 1.4 };

    /* Stack-bar segments — one InstancedMesh across all (day, category) blocks. */
    const totalSegs = derived.daySegments.reduce((s, d) => s + d.segs.length, 0);
    const barGeom = new THREE.BoxGeometry(1, 1, 1);
    const barMat = new THREE.ShaderMaterial({
      uniforms: { uCursorX, uCursorEdge, uTime: { value: 0 } },
      vertexShader: BAR_VERT, fragmentShader: BAR_FRAG,
      transparent: true, depthWrite: false,
    });
    const bars = new THREE.InstancedMesh(barGeom, barMat, Math.max(totalSegs, 1));
    const instColors = new Float32Array(Math.max(totalSegs, 1) * 3);
    const instXs = new Float32Array(Math.max(totalSegs, 1));
    const dummy = new THREE.Object3D();
    let segIdx = 0;
    derived.daySegments.forEach((day) => {
      const x = dayX(day.di);
      day.segs.forEach((seg) => {
        dummy.position.set(x, seg.y, 0);
        dummy.scale.set(barW, Math.max(seg.h, 0.001), barW);
        dummy.updateMatrix();
        bars.setMatrixAt(segIdx, dummy.matrix);
        const c = new THREE.Color(seg.color);
        instColors[segIdx * 3 + 0] = c.r;
        instColors[segIdx * 3 + 1] = c.g;
        instColors[segIdx * 3 + 2] = c.b;
        instXs[segIdx] = x;
        segIdx++;
      });
    });
    bars.instanceMatrix.needsUpdate = true;
    bars.geometry.setAttribute('instColor', new THREE.InstancedBufferAttribute(instColors, 3));
    bars.geometry.setAttribute('instX', new THREE.InstancedBufferAttribute(instXs, 1));
    scene.add(bars);

    /* Bar cap — a bright dot at the top of every day column so day-tops read clearly */
    const capGeom = new THREE.SphereGeometry(0.09, 12, 10);
    const capMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    const caps = new THREE.InstancedMesh(capGeom, capMat, N);
    for (let i = 0; i < N; i++) {
      const bh = derived.daySegments[i].barH;
      dummy.position.set(dayX(i), bh, 0);
      dummy.scale.setScalar(bh > 0 ? 1 : 0);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
    scene.add(caps);

    /* Ink-line — an emissive spline through the tops of every day's bar */
    const inkPts = [];
    if (N > 1) {
      const totalSteps = (N - 1) * 12;
      const heights = derived.daySegments.map(d => d.barH);
      for (let k = 0; k <= totalSteps; k++) {
        const idx = (k / totalSteps) * (N - 1);
        const lo = Math.floor(idx), hi = Math.min(lo + 1, N - 1);
        const f = idx - lo;
        // Catmull-Rom smoothing on Y through neighbors
        const y0 = heights[Math.max(lo - 1, 0)];
        const y1 = heights[lo];
        const y2 = heights[hi];
        const y3 = heights[Math.min(hi + 1, N - 1)];
        const ff = f * f, fff = ff * f;
        const y = 0.5 * (
          (2 * y1) +
          (-y0 + y2) * f +
          (2 * y0 - 5 * y1 + 4 * y2 - y3) * ff +
          (-y0 + 3 * y1 - 3 * y2 + y3) * fff
        );
        inkPts.push(new THREE.Vector3(dayX(idx), y, 0));
      }
    }
    const inkGeom = new THREE.BufferGeometry().setFromPoints(inkPts);
    const inkMat = new THREE.ShaderMaterial({
      uniforms: { uCursorX, uCursorEdge, uColor: { value: new THREE.Color(accents.cyan) } },
      vertexShader: INK_VERT, fragmentShader: INK_FRAG,
      transparent: true, depthWrite: false,
    });
    const inkLine = new THREE.Line(inkGeom, inkMat);
    scene.add(inkLine);

    /* Particles — anchored to each day column, rising as spending "gas" */
    const P = reduce ? 800 : 5500;
    const pGeom = new THREE.BufferGeometry();
    const pPos = new Float32Array(P * 3);
    const aHomeX = new Float32Array(P);
    const aHomeH = new Float32Array(P);
    const aBand = new Float32Array(P);
    const aJitter = new Float32Array(P);
    const aSize = new Float32Array(P);
    const aSeed = new Float32Array(P);
    const aColor = new Float32Array(P * 3);
    const aSpeed = new Float32Array(P);

    // Distribute particles by day proportionally to spend. Zero-spend days get none.
    const totalSpend = days.reduce((s, d) => s + (d.total || 0), 0);
    const weights = days.map(d => (d.total || 0));
    let particleIdx = 0;
    for (let di = 0; di < N && particleIdx < P; di++) {
      const share = totalSpend > 0 ? weights[di] / totalSpend : 1 / N;
      const alloc = Math.max(1, Math.floor(share * P));
      const segList = derived.daySegments[di].segs;
      const topColor = segList.length ? segList[0].color : accents.cyan;
      for (let k = 0; k < alloc && particleIdx < P; k++) {
        const p = particleIdx++;
        aHomeX[p] = dayX(di);
        aHomeH[p] = derived.daySegments[di].barH;
        aBand[p] = Math.random();
        aJitter[p] = (Math.random() - 0.5) * barW * 0.9;
        aSize[p] = 0.7 + Math.pow(Math.random(), 2.5) * 2.4;
        aSeed[p] = Math.random();
        aSpeed[p] = 0.5 + Math.random() * 1.8;
        // 20% "sparks" in white/cyan mixed with dominant category
        let col;
        if (Math.random() < 0.2) col = new THREE.Color(accents.cyan);
        else col = new THREE.Color(topColor);
        aColor[p * 3 + 0] = col.r; aColor[p * 3 + 1] = col.g; aColor[p * 3 + 2] = col.b;
        pPos[p * 3] = 0; pPos[p * 3 + 1] = 0; pPos[p * 3 + 2] = 0;
      }
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeom.setAttribute('aHomeX', new THREE.BufferAttribute(aHomeX, 1));
    pGeom.setAttribute('aHomeH', new THREE.BufferAttribute(aHomeH, 1));
    pGeom.setAttribute('aBand', new THREE.BufferAttribute(aBand, 1));
    pGeom.setAttribute('aJitter', new THREE.BufferAttribute(aJitter, 1));
    pGeom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    pGeom.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    pGeom.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    pGeom.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
    pGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), halfW + 6);

    const particleMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uDpr: { value: dpr }, uCursorX, uCursorEdge },
      vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeom, particleMat);
    particles.frustumCulled = false;
    scene.add(particles);

    /* Scrub cursor — a slim vertical rod that lives ON the timeline */
    const cursorGeom = new THREE.PlaneGeometry(0.55, 5.6);
    const cursorMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(accents.cyan) } },
      vertexShader: CURSOR_VERT, fragmentShader: CURSOR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const cursor = new THREE.Mesh(cursorGeom, cursorMat);
    cursor.position.set(uCursorX.value, 2.6, 0.3);
    scene.add(cursor);
    // Cursor base marker — a small triangle-plane on the ground plane
    const baseGeom = new THREE.CircleGeometry(0.16, 24);
    const baseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accents.cyan), transparent: true, opacity: 0.85 });
    const cursorBase = new THREE.Mesh(baseGeom, baseMat);
    cursorBase.position.set(uCursorX.value, 0.02, 0);
    cursorBase.rotation.x = -Math.PI / 2;
    scene.add(cursorBase);

    /* Nucleus — the "position marker" that rides the cursor */
    const nucleusR = 0.42;
    const nucleusMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTurbulence: { value: 0.4 },
        uCoreCold: { value: new THREE.Color(accents.mint).multiplyScalar(0.4) },
        uCoreHot:  { value: new THREE.Color(accents.cyan) },
        uFresnelCol: { value: new THREE.Color(accents.violet).multiplyScalar(1.2) },
      },
      vertexShader: NUCLEUS_VERT,
      fragmentShader: NUCLEUS_FRAG,
    });
    const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(nucleusR, 5), nucleusMat);
    scene.add(nucleus);

    /* Diegetic label — canvas-textured plane that floats above the cursor */
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512; labelCanvas.height = 220;
    const labelCtx = labelCanvas.getContext('2d');
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.anisotropy = 8;
    labelTex.minFilter = THREE.LinearFilter;
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.55), labelMat);
    labelMesh.position.set(uCursorX.value, 5.8, 0.4);
    scene.add(labelMesh);

    function drawLabel(dayIdx) {
      const c = labelCtx;
      c.clearRect(0, 0, 512, 220);
      // frame — corner brackets, no card body
      c.strokeStyle = 'rgba(100,210,255,0.45)';
      c.lineWidth = 1.5;
      const brk = 22;
      const paths = [
        [8, 8, brk, 8], [8, 8, 8, brk],
        [512 - 8, 8, 512 - 8 - brk, 8], [512 - 8, 8, 512 - 8, brk],
        [8, 212, brk, 212], [8, 212, 8, 212 - brk],
        [512 - 8, 212, 512 - 8 - brk, 212], [512 - 8, 212, 512 - 8, 212 - brk],
      ];
      c.beginPath();
      paths.forEach(([x1, y1, x2, y2]) => { c.moveTo(x1, y1); c.lineTo(x2, y2); });
      c.stroke();

      // Data
      const d = days[dayIdx];
      const runNet = derived.cumNet[dayIdx];
      const dateLabel = d?.dateLabel || d?.label || `Day ${dayIdx + 1}`;
      const total = d?.total || 0;
      const count = d?.count || 0;
      // Date header
      c.font = '600 18px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.85)';
      c.textBaseline = 'top';
      c.fillText(`▸ ${dateLabel.toUpperCase()}`, 28, 22);
      // Big spend
      c.font = '300 62px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(total), 26, 46);
      // Sub
      c.font = '500 15px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.55)';
      c.fillText(`${count} txn${count === 1 ? '' : 's'}`, 28, 128);
      // Running net (right aligned)
      c.textAlign = 'right';
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.6)';
      c.fillText('RUNNING NET', 512 - 28, 22);
      c.font = '400 28px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = runNet >= 0 ? '#30D6A5' : '#FF6B6B';
      c.fillText(moneySmart(runNet), 512 - 28, 46);
      // Category ticks under the date
      c.textAlign = 'left';
      const segs = derived.daySegments[dayIdx].segs.slice(0, 5);
      const stripY = 168;
      let sx = 26;
      const stripMaxW = 512 - 52;
      segs.forEach(s => {
        const w = Math.max(6, stripMaxW * s.share);
        c.fillStyle = s.color;
        c.fillRect(sx, stripY, w - 2, 8);
        sx += w;
      });
      // Percent bar labels (tiny)
      c.font = '500 10px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.55)';
      c.fillText(`${segs.length} STREAM${segs.length === 1 ? '' : 'S'}`, 26, 186);
      c.textAlign = 'right';
      c.fillText(`${derived.catList.length} CATEGORIES INDEXED`, 512 - 28, 186);
      labelTex.needsUpdate = true;
    }
    drawLabel(cursorRef.current);

    /* Compass/tick strip on the base line — day-of-month markers under the bars */
    const tickGroup = new THREE.Group();
    for (let i = 0; i < N; i++) {
      const isMajor = i % 5 === 0 || i === N - 1;
      const tickH = isMajor ? 0.18 : 0.09;
      const tGeom = new THREE.BoxGeometry(0.02, tickH, 0.02);
      const tMat = new THREE.MeshBasicMaterial({ color: isMajor ? 0xa0b4d0 : 0x5060a0, transparent: true, opacity: isMajor ? 0.6 : 0.35 });
      const t = new THREE.Mesh(tGeom, tMat);
      t.position.set(dayX(i), -tickH / 2, 0);
      tickGroup.add(t);
    }
    scene.add(tickGroup);

    /* Post-processing */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.7, 0.35);
    composer.addPass(bloom);
    const finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(w * dpr, h * dpr) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: FINAL_FRAG,
    });
    composer.addPass(finalPass);

    /* Interaction — pointer drag horizontally moves the cursor with magnetic snap.
       Vertical drag tilts the camera slightly (subtle). Wheel adjusts zoom. */
    let dragging = false;
    let lastX = 0, lastY = 0;
    let tiltT = 0;   // target tilt (camera rotation around x)
    let tiltC = 0;   // current
    let camY = 3.8, camYT = 3.8;

    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hitPoint = new THREE.Vector3();
    const mouse = new THREE.Vector2();

    const pickIndex = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
      const idxF = ((hitPoint.x + halfW) / (halfW * 2)) * (N - 1);
      const idx = Math.max(0, Math.min(N - 1, Math.round(idxF)));
      return idx;
    };

    const setCursor = (idx) => {
      if (idx == null || idx < 0 || idx >= N) return;
      cursorRef.current = idx;
      const x = dayX(idx);
      uCursorX.value = x;
      cursor.position.x = x;
      cursorBase.position.x = x;
      labelMesh.position.x = x;
      // Nucleus rides cursor; its size tracks running net magnitude.
      const runNet = derived.cumNet[idx];
      const s = 0.7 + Math.min(Math.abs(runNet) / (derived.maxAbsCum || 1), 1) * 0.9;
      nucleus.scale.setScalar(s);
      // Sign colors
      if (runNet >= 0) {
        nucleusMat.uniforms.uCoreCold.value.set(accents.mint).multiplyScalar(0.4);
        nucleusMat.uniforms.uCoreHot.value.set(accents.cyan);
      } else {
        nucleusMat.uniforms.uCoreCold.value.set(accents.red).multiplyScalar(0.4);
        nucleusMat.uniforms.uCoreHot.value.set(accents.amber);
      }
      nucleus.position.set(x, derived.daySegments[idx].barH + 0.7, 0.3);
      drawLabel(idx);
      onCursorChangeRef.current?.(idx);
      setCursorIdx(idx);
    };
    // Initialize position
    setCursor(cursorRef.current);

    const onPointerDown = (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
      const idx = pickIndex(e.clientX, e.clientY);
      if (idx != null) setCursor(idx);
    };
    const onPointerMove = (e) => {
      if (!dragging) {
        // On hover-without-drag, do nothing — cursor stays put until user grabs it.
        return;
      }
      const idx = pickIndex(e.clientX, e.clientY);
      if (idx != null) setCursor(idx);
      // Vertical drag → small camera tilt
      const dy = e.clientY - lastY;
      tiltT = Math.max(-0.18, Math.min(0.18, tiltT + dy * 0.001));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = 'ew-resize';
    };
    const onWheel = (e) => {
      e.preventDefault();
      camYT = Math.max(2.2, Math.min(7.5, camYT + Math.sign(e.deltaY) * 0.4));
    };
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  { setCursor(Math.max(0, cursorRef.current - 1)); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setCursor(Math.min(N - 1, cursorRef.current + 1)); e.preventDefault(); }
      if (e.key === 'Home')  { setCursor(0); e.preventDefault(); }
      if (e.key === 'End')   { setCursor(N - 1); e.preventDefault(); }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('keydown', onKey);

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

    /* Loop */
    let raf = 0, running = true, tPrev = 0, t = 0;
    const loop = (now) => {
      if (!running) return;
      const dt = tPrev ? Math.min((now - tPrev) / 1000, 0.05) : 0.016;
      tPrev = now; t += dt;
      // ease tilt back to 0 when idle
      if (!dragging && !reduce) tiltT *= 0.94;
      tiltC += (tiltT - tiltC) * 0.1;
      camY += (camYT - camY) * 0.08;
      camera.position.y = camY;
      camera.rotation.x = -0.15 + tiltC;   // slight base pitch — looking down at manifold
      // Face-camera the label
      labelMesh.lookAt(camera.position);
      // uniforms
      nucleusMat.uniforms.uTime.value = t;
      barMat.uniforms.uTime.value = t;
      particleMat.uniforms.uTime.value = t;
      cursorMat.uniforms.uTime.value = t;
      skyMat.uniforms.uTime.value = t;
      finalPass.uniforms.uTime.value = t;
      // render
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
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('keydown', onKey);
      wrap.removeChild(renderer.domElement);
      composer.dispose?.();
      renderer.dispose();
      [nucleusMat, barMat, particleMat, cursorMat, skyMat, inkMat, capMat, baseMat, labelMat].forEach(m => m.dispose());
      [nucleus.geometry, bars.geometry, pGeom, cursorGeom, inkGeom, capGeom, baseGeom, labelMesh.geometry].forEach(g => g.dispose());
      tickGroup.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
      labelTex.dispose();
      grid.geometry.dispose(); grid.material.dispose();
    };
  }, [derived, days, income, reduce]);

  if (!derived) return null;
  if (!webglOk) {
    return (
      <Box sx={{ height: height || 620, display: 'flex', alignItems: 'center', justifyContent: 'center',
                 border: '1px solid rgba(120,140,200,0.12)', borderRadius: 5, bgcolor: '#04050a' }}>
        <Typography color="rgba(180,200,235,0.6)" sx={{ fontSize: 13 }}>
          WebGL is disabled — the instrument cannot render.
        </Typography>
      </Box>
    );
  }

  const summary = `Financial instrument. ${days.length} days rendered. Cursor at day ${cursorIdx + 1}.`;

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={summary}
      sx={{ position: 'relative', width: '100%', height: height || 620,
            borderRadius: 5, overflow: 'hidden',
            bgcolor: '#04050a',
            border: '1px solid rgba(120, 140, 200, 0.12)' }}
    >
      <Box ref={canvasWrapRef} sx={{ position: 'absolute', inset: 0 }} />
    </Box>
  );
}
