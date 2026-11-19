/**
 * SpendingFieldView — Pulse's renderer.
 *
 * A world generated entirely from spending. There is no income, balance,
 * savings, debt or forecast anywhere in this file. Everything visible is a
 * consequence of one of these measured properties:
 *
 *   amount      → the mass and size of a body
 *   frequency   → how populated a region is
 *   recurrence  → whether a habit crystallises into a rigid lattice
 *   regularity  → how straight that lattice is; scattered intervals warp it
 *   velocity    → how agitated the field is over time
 *   bursts      → expanding shockwaves at days you spent far above your norm
 *   outliers    → physical displacement away from everything else
 *   cadence     → the rate the whole field breathes at
 *   co-purchase → which habits sit near each other on the map
 *
 * Six lenses re-derive the position of every purchase, so the same history
 * can be asked six different questions about behaviour. Switching morphs the
 * whole field through one uniform, so the world reorganises as a single move.
 *
 * The signature gesture is the ACCUMULATION PULL: grab a habit and drag, and
 * its real history unfurls behind it — every past visit, and what that habit
 * has actually cost you so far. It reveals the past; it never predicts.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { Box, Typography } from '@mui/material';
import { accents, chart } from '../../theme/tokens';
import { moneySmart } from './money';

export const LENSES = [
  { id: 'HABITS',       label: 'Habits',       blurb: 'Places you return to, grouped by what you buy together' },
  { id: 'RHYTHM',       label: 'Rhythm',       blurb: 'Which days of the week your spending lands on' },
  { id: 'VELOCITY',     label: 'Velocity',     blurb: 'How fast you were spending, across the window' },
  { id: 'RECURRENCE',   label: 'Recurrence',   blurb: 'Habits that repeat on a steady beat' },
  { id: 'OUTLIERS',     label: 'Outliers',     blurb: 'Purchases unlike the rest of yours' },
  { id: 'DISTRIBUTION', label: 'Distribution', blurb: 'The shape of your purchase sizes' },
];

export const SCALES = [
  { id: 'QUARTER', label: 'Quarter', days: 90 },
  { id: 'MONTH',   label: 'Month',   days: 30 },
  { id: 'WEEK',    label: 'Week',    days: 7 },
  { id: 'DAY',     label: 'Day',     days: 1 },
];

const HALF_W = 11;
const MAX_HISTORY = 32;   // ghosts revealed by an accumulation pull

/* ─── shaders ────────────────────────────────────────────────────────────── */

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

// A purchase. Turbulence is that day's spending velocity, so busy stretches
// visibly shimmer while quiet ones sit still.
const EVENT_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform float uMorph;
uniform vec3  uCursor;
uniform float uCursorPower;
uniform float uHighlightNode;
uniform float uFocusIndex;
uniform float uBeat;          // 0..1 pulse at the user's own cadence

attribute vec3  aFrom;
attribute vec3  aTo;
attribute float aVisFrom;
attribute float aVisTo;
attribute float aSize;
attribute float aSeed;
attribute vec3  aColor;
attribute float aOutlier;     // robust z-score, 0 when ordinary
attribute float aHabit;       // 1 when this is a place you return to
attribute float aNode;
attribute float aIndex;
attribute float aHeat;        // that day's velocity, 0..1

varying vec3  vColor;
varying float vAlpha;
varying float vOutlier;
varying float vHabit;
varying float vFocus;
varying float vLift;
${NOISE_GLSL}

void main(){
  float m = uMorph * uMorph * (3.0 - 2.0 * uMorph);
  vec3 pos = mix(aFrom, aTo, m);
  float vis = mix(aVisFrom, aVisTo, m);

  // Agitation scales with how fast money was leaving that day.
  float turb = 0.04 + aHeat * 0.34;
  pos.x += snoise(vec3(pos.xz * 0.6, uTime * 0.25 + aSeed * 10.0)) * turb;
  pos.z += snoise(vec3(pos.zx * 0.6, uTime * 0.22 + aSeed * 7.0)) * turb;
  pos.y += sin(uTime * 0.4 + aSeed * 6.28) * (0.05 + aHeat * 0.12);

  // The field breathes at the user's own cadence rather than an arbitrary rate.
  pos *= 1.0 + uBeat * 0.012;

  vec3 toC = uCursor - pos;
  toC.y *= 0.25;
  float d = length(toC);
  pos += normalize(toC + 0.0001) * (1.4 / (d * d + 1.2)) * uCursorPower * 0.35;

  vFocus = smoothstep(2.6, 0.4, d) * uCursorPower;
  vLift = (uHighlightNode >= 0.0 && abs(aNode - uHighlightNode) < 0.5) ? 1.0 : 0.0;
  float isFocus = (uFocusIndex >= 0.0 && abs(aIndex - uFocusIndex) < 0.5) ? 1.0 : 0.0;

  vColor = aColor;
  vAlpha = vis * (0.7 + vFocus * 0.3 + vLift * 0.25);
  vOutlier = aOutlier;
  vHabit = aHabit;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // Size is amount. Small frequent purchases really are grains; a rare large
  // one really is a boulder.
  gl_PointSize = (aSize + vFocus * 6.0 + vLift * 3.0 + isFocus * 7.0)
               * vis * uDpr * (280.0 / -mv.z);
}
`;

const EVENT_FRAG = /* glsl */`
uniform float uTime;
varying vec3  vColor;
varying float vAlpha;
varying float vOutlier;
varying float vHabit;
varying float vFocus;
varying float vLift;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float rr = sqrt(r2);
  float core = exp(-r2 * 5.5);
  float halo = exp(-r2 * 1.5) * 0.35;
  vec3 col = vColor * (core * 3.2 + halo * 1.3);
  float alpha = vAlpha * (core * 1.15 + halo * 0.7);

  // An outlier does not get a badge — it burns differently, harder the more
  // unlike your other purchases it is.
  if (vOutlier > 0.5) {
    float sev = clamp(vOutlier / 8.0, 0.0, 1.0);
    float ring = smoothstep(0.58, 0.86, rr) * (1.0 - smoothstep(0.86, 1.0, rr));
    float pulse = 0.5 + 0.5 * sin(uTime * (2.0 + sev * 3.0));
    col += vec3(1.0, 0.5, 0.28) * ring * (0.7 + sev * 1.4) * (0.6 + 0.7 * pulse);
    alpha = max(alpha, ring * (0.6 + sev * 0.5) * vAlpha);
  }
  // A habit reads as a struck, faceted body rather than loose dust.
  if (vHabit > 0.5) {
    float facet = smoothstep(0.52, 0.86, rr) * (1.0 - smoothstep(0.86, 1.0, rr));
    col += vec3(0.2, 0.85, 1.0) * facet * (0.45 + vLift * 1.1);
  }
  col += vColor * vFocus * 0.7;
  gl_FragColor = vec4(col, alpha);
}
`;

// Lattice edges between consecutive visits to the same habit.
const LATTICE_VERT = /* glsl */`
attribute float aSeed;
varying float vSeed;
void main(){
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const LATTICE_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uTime;
uniform float uOpacity;
uniform float uRegularity;   // steady intervals read as a clean, solid bond
varying float vSeed;
void main(){
  float jitter = (1.0 - uRegularity);
  float flicker = 1.0 - jitter * 0.5 * (0.5 + 0.5 * sin(uTime * (3.0 + vSeed * 9.0) + vSeed * 20.0));
  gl_FragColor = vec4(uColor * (0.55 + 0.45 * uRegularity) * flicker,
                      uOpacity * (0.35 + 0.5 * uRegularity) * flicker);
}
`;

// Ghosts of past visits, revealed by the accumulation pull.
const HISTORY_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform float uCount;
attribute float aIdx;
attribute vec3  aPos;
attribute float aSize;
varying float vFade;
void main(){
  float live = step(aIdx, uCount - 0.5);
  vec3 p = aPos;
  p.y += sin(uTime * 1.4 + aIdx * 0.8) * 0.06;
  vFade = live;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * live * uDpr * (280.0 / -mv.z);
}
`;
const HISTORY_FRAG = /* glsl */`
uniform vec3 uColor;
varying float vFade;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 4.0);
  float ring = smoothstep(0.5, 0.82, sqrt(r2)) * (1.0 - smoothstep(0.82, 1.0, sqrt(r2)));
  gl_FragColor = vec4(uColor * (core * 1.4 + ring * 1.5), (core * 0.6 + ring * 0.9) * vFade);
}
`;

// A burst day: a shockwave through the field, amplitude set by how far above
// your normal day it was.
const BURST_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BURST_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uTime;
uniform float uPhase;
uniform float uStrength;
uniform float uOpacity;
varying vec2  vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float t = fract(uTime * 0.32 + uPhase);
  float wave = smoothstep(0.045, 0.0, abs(r - t));
  float fade = (1.0 - t) * (1.0 - t);
  gl_FragColor = vec4(uColor * (1.4 + uStrength), wave * fade * uOpacity * (0.35 + uStrength * 0.4));
}
`;

// The cadence ring: one pulse per typical gap between the days you spend.
const CADENCE_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uTime;
uniform float uPeriod;
varying vec2  vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float t = fract(uTime / uPeriod);
  float wave = smoothstep(0.03, 0.0, abs(r - t));
  gl_FragColor = vec4(uColor, wave * (1.0 - t) * 0.30);
}
`;

const SKY_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
`;
const SKY_FRAG = /* glsl */`
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uTintA;
uniform vec3  uTintB;
uniform float uAgitation;   // how bursty the spending is, 0..1
varying vec2  vUv;
${NOISE_GLSL}
float hash21(vec2 p){ p = fract(p*vec2(234.34,435.345)); p += dot(p, p+34.23); return fract(p.x*p.y); }
float grainLayer(vec2 uv, float scale){
  vec2 g = fract(uv*scale)-0.5; vec2 id = floor(uv*scale);
  float h = hash21(id); if(h < 0.989) return 0.0;
  return smoothstep(0.06, 0.0, length(g)) * (h - 0.989) * 88.0;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec3 col = vec3(0.005, 0.007, 0.016);
  // The backdrop churns in proportion to how uneven the spending is.
  float sp = 0.012 + uAgitation * 0.05;
  col += uTintA * pow(snoise(vec3(uv*1.3, uTime*sp))*0.5 + 0.5, 2.8) * 0.10;
  col += uTintB * pow(snoise(vec3(uv*2.6 + 8.0, uTime*sp*0.8))*0.5 + 0.5, 3.5) * 0.07;
  col *= 1.0 - smoothstep(0.4, 1.5, length(uv)) * 0.55;
  col += vec3(grainLayer(uv, 70.0) + grainLayer(uv+13.0, 140.0)*0.5) * vec3(0.85,0.9,1.05);
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
  col.rgb *= clamp(1.0 - dot(v,v) * 1.15, 0.32, 1.0);
  col.rgb += (hash(vUv * uRes + uTime) - 0.5) * 0.018;
  col.rgb *= 1.0 - 0.035 * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = col;
}
`;

/* ─── lens layouts ───────────────────────────────────────────────────────── */

function lensPosition(lens, e, ctx) {
  const { field, windowStart, windowSpan } = ctx;
  const frac = windowSpan > 0
    ? Math.min(Math.max((e.dayNum - windowStart) / windowSpan, 0), 1) : 0.5;

  switch (lens) {
    case 'RHYTHM': {
      // Seven columns, one per weekday; depth is which week it fell in.
      const weeks = Math.max(Math.ceil(windowSpan / 7), 1);
      const wk = Math.min(Math.max(Math.floor((e.dayNum - windowStart) / 7), 0), weeks - 1);
      return [
        (e.dayOfWeek - 3) * 2.9 + (e.seed - 0.5) * 0.8,
        0.3 + e.sizeNorm * 4.4,
        (wk - (weeks - 1) / 2) * 2.2 + (e.seed2 - 0.5) * 0.5,
      ];
    }
    case 'VELOCITY': {
      // Height is the 7-day spend rate on that day — bursts become peaks.
      const r = field.rate.find(x => x.dayNum === e.dayNum);
      const v = r ? r.value / field.maxRate : 0;
      return [
        -HALF_W + frac * 2 * HALF_W,
        0.25 + v * 5.4 + e.sizeNorm * 0.9,
        (e.seed - 0.5) * 2.2,
      ];
    }
    case 'RECURRENCE': {
      const node = field.nodes[e.nodeIdx];
      if (node && node.kind === 'merchant' && node.count >= 2) {
        // Each habit is a chain running outward. Steady intervals give an
        // evenly spaced, straight lattice; scattered ones buckle it.
        const rank = node.recurRank ?? 0;
        const ang = (rank / Math.max(field.recurCount, 1)) * Math.PI * 2;
        const step = 0.95 + node.regularity * 0.5;
        const along = 2.4 + (e.habitPos ?? 0) * step;
        const warp = (1 - node.regularity) * 2.2;
        return [
          Math.cos(ang) * along + Math.sin((e.habitPos ?? 0) * 1.9 + node.seed * 6.28) * warp,
          0.4 + e.sizeNorm * 1.4 + (1 - node.regularity) * (e.seed - 0.5) * 1.6,
          Math.sin(ang) * along + Math.cos((e.habitPos ?? 0) * 2.3 + node.seed * 6.28) * warp,
        ];
      }
      // One-offs are not habits; they disperse to a faint outer shell.
      const a = e.seed * Math.PI * 2;
      const r2 = 15 + e.seed2 * 4;
      return [Math.cos(a) * r2, (e.seed2 - 0.5) * 3, Math.sin(a) * r2];
    }
    case 'OUTLIERS': {
      if (e.isOutlier) {
        const a = e.seed * Math.PI * 2;
        const r = 8 + Math.min(e.robustZ, 12) * 0.55;
        return [Math.cos(a) * r, 1.6 + e.seed2 * 2.6, Math.sin(a) * r];
      }
      // Everything ordinary settles into one dense, low, quiet mass.
      const a = e.seed * Math.PI * 2, ph = e.seed2 * Math.PI;
      const r = 1.3 + e.seed3 * 1.5;
      return [Math.cos(a) * Math.sin(ph) * r, Math.cos(ph) * r * 0.5, Math.sin(a) * Math.sin(ph) * r];
    }
    case 'DISTRIBUTION': {
      // A histogram you can walk through: columns are size bands, height is
      // how many purchases you made in that band.
      const bins = field.distribution.length;
      return [
        (e.bin - (bins - 1) / 2) * 2.3,
        0.35 + (e.binPos ?? 0) * 0.46,
        (e.seed - 0.5) * 1.4,
      ];
    }
    case 'HABITS':
    default: {
      const p = field.layout[e.nodeIdx];
      if (!p) return [0, 0, 0];
      // Orbit the node it belongs to; radius is the size of the purchase.
      const a = e.seed * Math.PI * 2;
      const r = 0.45 + e.sizeNorm * 1.5;
      return [p.x + Math.cos(a) * r, 0.25 + e.sizeNorm * 1.2, p.z + Math.sin(a) * r];
    }
  }
}

/* ─── component ──────────────────────────────────────────────────────────── */

export default function SpendingFieldView({
  field, lens = 'HABITS', scale = 'MONTH',
  onFocusChange, onPullChange, height,
}) {
  const wrapRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const apiRef = useRef(null);
  const onFocusRef = useRef(onFocusChange); onFocusRef.current = onFocusChange;
  const onPullRef = useRef(onPullChange);   onPullRef.current = onPullChange;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    if (!field) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { setWebglOk(false); return; }

    const N = field.events.length;
    const palette = chart.categorical.dark;
    const colorFor = (i) => new THREE.Color(palette[i % palette.length]);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    Object.assign(renderer.domElement.style, {
      display: 'block', width: '100%', height: '100%',
      touchAction: 'none', cursor: 'grab', outline: 'none',
    });
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.020);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    const camState  = { azimuth: 0.9, polar: 1.05, distance: 31 };
    const camTarget = { azimuth: 0.9, polar: 1.05, distance: 31 };
    const updateCamera = () => {
      const { azimuth: a, polar: p, distance: d } = camState;
      camera.position.set(d * Math.sin(p) * Math.cos(a), d * Math.cos(p), d * Math.sin(p) * Math.sin(a));
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    /* Backdrop — churn scales with how uneven the spending is */
    const skyScene = new THREE.Scene();
    const skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(w * dpr, h * dpr) },
        uTime: { value: 0 },
        uTintA: { value: colorFor(0).clone().multiplyScalar(0.85) },
        uTintB: { value: colorFor(1).clone().multiplyScalar(0.8) },
        uAgitation: { value: Math.min(field.dailyCv, 1.5) / 1.5 },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthWrite: false, depthTest: false,
    });
    skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));

    /* Cadence ring — the field's heartbeat is the user's own spending rhythm */
    const cadencePeriod = Math.min(Math.max(field.cadenceDays * 0.75, 0.7), 4.5);
    const cadenceMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: colorFor(0).clone().multiplyScalar(1.1) },
        uTime: { value: 0 }, uPeriod: { value: cadencePeriod },
      },
      vertexShader: BURST_VERT, fragmentShader: CADENCE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const cadenceRing = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), cadenceMat);
    cadenceRing.rotation.x = -Math.PI / 2;
    cadenceRing.position.y = -0.4;
    scene.add(cadenceRing);

    /* Burst shockwaves — one per day you spent far above your own norm */
    const burstMeshes = field.bursts.slice(0, 8).map((b, i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(accents.amber) },
          uTime: { value: 0 }, uPhase: { value: i * 0.17 },
          uStrength: { value: Math.min(b.z / 4, 1) }, uOpacity: { value: 1 },
        },
        vertexShader: BURST_VERT, fragmentShader: BURST_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const size = 5 + Math.min(b.z, 4) * 2.2;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.2;
      scene.add(mesh);
      return { mesh, mat, burst: b };
    });

    /* Node label plates — merchants and category pools, HABITS lens only */
    const nodePlates = field.nodes.map((nd) => {
      const c = colorFor(nd.catIdx);
      const cv = document.createElement('canvas');
      cv.width = 640; cv.height = 150;
      const g = cv.getContext('2d');
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 40px "SF Mono", "JetBrains Mono", ui-monospace, monospace';
      g.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.95)`;
      g.fillText(nd.label.toUpperCase().slice(0, 20), 320, 34);
      g.font = '400 34px "SF Pro Display", -apple-system, sans-serif';
      g.fillStyle = 'rgba(232,240,252,0.86)';
      g.fillText(moneySmart(nd.total), 320, 84);
      g.font = '500 24px "SF Mono", ui-monospace, monospace';
      g.fillStyle = 'rgba(180,200,235,0.58)';
      g.fillText(nd.kind === 'merchant'
        ? `${nd.count}× · EVERY ~${Math.max(Math.round(nd.cadenceDays), 1)}D`
        : `${nd.count} ONE-OFF${nd.count === 1 ? '' : 'S'}`, 320, 124);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 8; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.03), mat);
      scene.add(mesh);
      return { mesh, mat, tex, node: nd };
    });

    /* Events */
    const positions = new Float32Array(N * 3);
    const aFrom = new Float32Array(N * 3);
    const aTo = new Float32Array(N * 3);
    const aVisFrom = new Float32Array(N);
    const aVisTo = new Float32Array(N);
    const aSize = new Float32Array(N);
    const aSeed = new Float32Array(N);
    const aColor = new Float32Array(N * 3);
    const aOutlier = new Float32Array(N);
    const aHabit = new Float32Array(N);
    const aNode = new Float32Array(N);
    const aIndex = new Float32Array(N);
    const aHeat = new Float32Array(N);

    const maxDayTotal = Math.max(...field.events.map(e => e.dayTotal), 1);
    field.events.forEach((e, i) => {
      // Size is the amount itself, so grain reads honestly.
      aSize[i] = 3.2 + e.sizeNorm * 9.0;
      aSeed[i] = e.seed;
      const c = colorFor(e.catIdx);
      aColor[i * 3] = c.r; aColor[i * 3 + 1] = c.g; aColor[i * 3 + 2] = c.b;
      aOutlier[i] = e.isOutlier ? Math.max(e.robustZ, 1) : 0;
      aHabit[i] = e.isHabit ? 1 : 0;
      aNode[i] = e.nodeIdx;
      aIndex[i] = i;
      aHeat[i] = Math.min(e.dayTotal / maxDayTotal, 1);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aFrom', new THREE.BufferAttribute(aFrom, 3));
    geom.setAttribute('aTo', new THREE.BufferAttribute(aTo, 3));
    geom.setAttribute('aVisFrom', new THREE.BufferAttribute(aVisFrom, 1));
    geom.setAttribute('aVisTo', new THREE.BufferAttribute(aVisTo, 1));
    geom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geom.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    geom.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    geom.setAttribute('aOutlier', new THREE.BufferAttribute(aOutlier, 1));
    geom.setAttribute('aHabit', new THREE.BufferAttribute(aHabit, 1));
    geom.setAttribute('aNode', new THREE.BufferAttribute(aNode, 1));
    geom.setAttribute('aIndex', new THREE.BufferAttribute(aIndex, 1));
    geom.setAttribute('aHeat', new THREE.BufferAttribute(aHeat, 1));
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 34);

    const eventMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uDpr: { value: dpr }, uMorph: { value: 1 },
        uCursor: { value: new THREE.Vector3() }, uCursorPower: { value: 0 },
        uHighlightNode: { value: -1 }, uFocusIndex: { value: -1 }, uBeat: { value: 0 },
      },
      vertexShader: EVENT_VERT, fragmentShader: EVENT_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geom, eventMat);
    points.frustumCulled = false;
    scene.add(points);

    /* Lattices — one per habit, bonding consecutive visits */
    const habitNodes = field.nodes.filter(nd => nd.kind === 'merchant' && nd.count >= 2);
    const lattices = habitNodes.map((nd, li) => {
      const members = field.events.filter(e => e.nodeIdx === nd.index)
        .sort((a, b) => a.dayNum - b.dayNum);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(members.length * 3), 3));
      const seeds = new Float32Array(members.length);
      seeds.fill(li * 0.31);
      g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 34);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: colorFor(nd.catIdx).clone().multiplyScalar(1.25) },
          uTime: { value: 0 }, uOpacity: { value: 1 },
          uRegularity: { value: nd.regularity },
        },
        vertexShader: LATTICE_VERT, fragmentShader: LATTICE_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(g, mat);
      line.frustumCulled = false;
      scene.add(line);
      return { line, geom: g, mat, node: nd, members };
    });

    /* Accumulation-pull ghosts */
    const histPos = new Float32Array(MAX_HISTORY * 3);
    const histIdx = new Float32Array(MAX_HISTORY);
    const histSize = new Float32Array(MAX_HISTORY);
    for (let i = 0; i < MAX_HISTORY; i++) { histIdx[i] = i; histSize[i] = 6; }
    const histGeom = new THREE.BufferGeometry();
    histGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY * 3), 3));
    histGeom.setAttribute('aPos', new THREE.BufferAttribute(histPos, 3));
    histGeom.setAttribute('aIdx', new THREE.BufferAttribute(histIdx, 1));
    histGeom.setAttribute('aSize', new THREE.BufferAttribute(histSize, 1));
    histGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    const histMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uDpr: { value: dpr }, uCount: { value: 0 },
        uColor: { value: new THREE.Color(accents.cyan) },
      },
      vertexShader: HISTORY_VERT, fragmentShader: HISTORY_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const histPoints = new THREE.Points(histGeom, histMat);
    histPoints.frustumCulled = false;
    histPoints.visible = false;
    scene.add(histPoints);

    const histLineGeom = new THREE.BufferGeometry();
    histLineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY * 3), 3));
    histLineGeom.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(MAX_HISTORY), 1));
    histLineGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    const histLineMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(accents.cyan) },
        uTime: { value: 0 }, uOpacity: { value: 0 }, uRegularity: { value: 1 },
      },
      vertexShader: LATTICE_VERT, fragmentShader: LATTICE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const histLine = new THREE.Line(histLineGeom, histLineMat);
    histLine.frustumCulled = false;
    histLine.visible = false;
    scene.add(histLine);

    /* Receipt plate */
    const rc = document.createElement('canvas');
    rc.width = 560; rc.height = 250;
    const rctx = rc.getContext('2d');
    const rTex = new THREE.CanvasTexture(rc);
    rTex.anisotropy = 8; rTex.minFilter = THREE.LinearFilter;
    const rMat = new THREE.MeshBasicMaterial({ map: rTex, transparent: true, depthWrite: false, opacity: 0 });
    const receipt = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.74), rMat);
    receipt.visible = false;
    scene.add(receipt);

    const brackets = (c, W, H) => {
      c.strokeStyle = 'rgba(100,210,255,0.5)'; c.lineWidth = 1.5;
      const b = 20;
      c.beginPath();
      [[8,8,b,8],[8,8,8,b],[W-8,8,W-8-b,8],[W-8,8,W-8,b],
       [8,H-8,b,H-8],[8,H-8,8,H-8-b],[W-8,H-8,W-8-b,H-8],[W-8,H-8,W-8,H-8-b]]
        .forEach(([x1,y1,x2,y2]) => { c.moveTo(x1,y1); c.lineTo(x2,y2); });
      c.stroke();
    };

    function drawReceipt(e) {
      const c = rctx;
      c.clearRect(0, 0, 560, 250);
      brackets(c, 560, 250);
      const col = colorFor(e.catIdx);
      c.textBaseline = 'top'; c.textAlign = 'left';
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.92)`;
      c.fillText(`▸ ${e.category.toUpperCase()}`, 24, 18);
      c.font = '300 54px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(e.amount), 22, 40);
      c.font = '500 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180,200,235,0.7)';
      c.fillText(e.date, 24, 112);
      if (e.description) {
        c.font = '400 13px "SF Pro Text", -apple-system, sans-serif';
        c.fillStyle = 'rgba(180,200,235,0.5)';
        c.fillText(e.description.slice(0, 46), 24, 134);
      }
      let y = 166;
      if (e.isOutlier) {
        c.fillStyle = 'rgba(255,159,10,0.14)';
        c.fillRect(22, y - 4, 516, 30);
        c.font = '600 15px "SF Mono", ui-monospace, monospace';
        c.fillStyle = '#FF9F0A';
        c.fillText(`${e.ratioToTypical.toFixed(1)}× YOUR USUAL ${e.category.toUpperCase().slice(0,12)} PURCHASE`, 30, y + 3);
        y += 38;
      }
      if (e.isHabit) {
        const nd = field.nodes[e.nodeIdx];
        c.font = '600 13px "SF Mono", ui-monospace, monospace';
        c.fillStyle = 'rgba(100,210,255,0.9)';
        c.fillText(`HABIT · ${nd.count} VISITS · DRAG TO UNFURL HISTORY`, 24, y + 4);
      }
      rTex.needsUpdate = true;
    }

    /* Pull readout plate */
    const pc = document.createElement('canvas');
    pc.width = 620; pc.height = 190;
    const pctx = pc.getContext('2d');
    const pTex = new THREE.CanvasTexture(pc);
    pTex.anisotropy = 8; pTex.minFilter = THREE.LinearFilter;
    const pMat = new THREE.MeshBasicMaterial({ map: pTex, transparent: true, depthWrite: false, opacity: 0 });
    const pullPlate = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.41), pMat);
    pullPlate.visible = false;
    scene.add(pullPlate);

    function drawPull(node, shown, spent, firstDate) {
      const c = pctx;
      c.clearRect(0, 0, 620, 190);
      brackets(c, 620, 190);
      c.textBaseline = 'top'; c.textAlign = 'left';
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(100,210,255,0.95)';
      c.fillText('▸ SPENT HERE SO FAR', 26, 18);
      c.font = '500 15px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(200,216,240,0.85)';
      c.fillText(node.label.toUpperCase().slice(0, 22), 26, 44);
      c.font = '300 52px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(spent), 24, 76);
      c.font = '500 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180,200,235,0.65)';
      c.fillText(`${shown} OF ${node.count} VISITS  ·  SINCE ${firstDate}`, 26, 146);
      pTex.needsUpdate = true;
    }

    /* ── layout state ──────────────────────────────────────────────────── */
    const cur = new Float32Array(N * 3);
    let morph = 1, morphing = false;
    let activeLens = lens, activeScale = scale;
    let plateTarget = 1, plateOpacity = 1;
    let latticeTarget = 1;
    let burstTarget = 1;

    const windowFor = (id) => {
      const s = SCALES.find(x => x.id === id) || SCALES[1];
      return { start: field.maxDay - (s.days - 1), span: Math.max(s.days - 1, 1) };
    };

    function applyLayout(lensId, scaleId, immediate) {
      const { start, span } = windowFor(scaleId);
      const ctx = { field, windowStart: start, windowSpan: span };
      for (let i = 0; i < N * 3; i++) aFrom[i] = cur[i];
      for (let i = 0; i < N; i++) aVisFrom[i] = aVisTo[i];
      field.events.forEach((e, i) => {
        const p = lensPosition(lensId, e, ctx);
        aTo[i * 3] = p[0]; aTo[i * 3 + 1] = p[1]; aTo[i * 3 + 2] = p[2];
        aVisTo[i] = e.dayNum >= start ? 1 : 0;
      });
      geom.attributes.aFrom.needsUpdate = true;
      geom.attributes.aTo.needsUpdate = true;
      geom.attributes.aVisFrom.needsUpdate = true;
      geom.attributes.aVisTo.needsUpdate = true;
      morph = immediate ? 1 : 0;
      morphing = !immediate;
      eventMat.uniforms.uMorph.value = morph;

      // Only show the scaffolding that the active lens actually explains.
      plateTarget   = lensId === 'HABITS' ? 1 : 0;
      latticeTarget = (lensId === 'RECURRENCE' || lensId === 'HABITS') ? 1 : 0.10;
      burstTarget   = (lensId === 'VELOCITY' || lensId === 'RHYTHM') ? 1 : 0.12;

      activeLens = lensId; activeScale = scaleId;
      if (immediate) writeLive(1);
    }

    function writeLive(m) {
      const e = m * m * (3 - 2 * m);
      for (let i = 0; i < N * 3; i++) cur[i] = aFrom[i] + (aTo[i] - aFrom[i]) * e;
      lattices.forEach(({ geom: g, members }) => {
        const arr = g.attributes.position.array;
        members.forEach((mem, k) => {
          arr[k * 3] = cur[mem.i * 3];
          arr[k * 3 + 1] = cur[mem.i * 3 + 1];
          arr[k * 3 + 2] = cur[mem.i * 3 + 2];
        });
        g.attributes.position.needsUpdate = true;
      });
      // Node plates and burst rings ride the centroid of what they describe.
      if (plateOpacity > 0.01) {
        nodePlates.forEach(({ mesh, node }) => {
          const mem = field.events.filter(ev => ev.nodeIdx === node.index);
          if (!mem.length) return;
          let x = 0, y = 0, z = 0;
          mem.forEach(ev => { x += cur[ev.i*3]; y += cur[ev.i*3+1]; z += cur[ev.i*3+2]; });
          mesh.position.set(x / mem.length, y / mem.length + 1.9, z / mem.length);
        });
      }
      burstMeshes.forEach(({ mesh, burst }) => {
        const mem = field.events.filter(ev => ev.dayNum === burst.dayNum);
        if (!mem.length) return;
        let x = 0, z = 0;
        mem.forEach(ev => { x += cur[ev.i*3]; z += cur[ev.i*3+2]; });
        mesh.position.x = x / mem.length;
        mesh.position.z = z / mem.length;
      });
    }

    for (let i = 0; i < N; i++) aVisTo[i] = 1;
    applyLayout(lens, scale, true);
    applyLayout(lens, scale, true);

    /* ── interaction ───────────────────────────────────────────────────── */
    let dragging = false, lastX = 0, lastY = 0, pointerX = 0, pointerY = 0;
    let cursorActive = false, focusedEvent = null;
    let pulling = false, pullStartX = 0, pullStartY = 0, pullNode = null;
    let pullAmount = 0, pullTarget = 0;

    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPt = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    const worldCursor = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((cx - r.left) / r.width) * 2 - 1;
      ndc.y = -((cy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(ground, hitPt) ? hitPt : null;
    };

    function updateFocus() {
      const p = worldCursor(pointerX, pointerY);
      if (!p) return;
      eventMat.uniforms.uCursor.value.copy(p);
      let best = null, bestD = Infinity;
      for (let i = 0; i < N; i++) {
        if (aVisTo[i] < 0.5) continue;
        const dx = cur[i*3] - p.x, dz = cur[i*3+2] - p.z;
        const d = dx*dx + dz*dz;
        if (d < bestD) { bestD = d; best = field.events[i]; }
      }
      if (best && bestD < 2.25) {
        if (focusedEvent !== best) {
          focusedEvent = best;
          drawReceipt(best);
          receipt.visible = true;
          eventMat.uniforms.uFocusIndex.value = best.i;
          eventMat.uniforms.uHighlightNode.value = best.nodeIdx;
          const nd = field.nodes[best.nodeIdx];
          onFocusRef.current?.({
            amount: best.amount, category: best.category, date: best.date,
            description: best.description, isOutlier: best.isOutlier,
            ratioToTypical: best.ratioToTypical, isHabit: best.isHabit,
            merchant: nd?.kind === 'merchant' ? nd.label : '',
            visits: nd?.kind === 'merchant' ? nd.count : 0,
          });
        }
        receipt.position.set(cur[best.i*3] + 2.6, cur[best.i*3+1] + 1.5, cur[best.i*3+2]);
      } else if (focusedEvent) {
        focusedEvent = null;
        receipt.visible = false;
        eventMat.uniforms.uFocusIndex.value = -1;
        if (!pulling) eventMat.uniforms.uHighlightNode.value = -1;
        onFocusRef.current?.(null);
      }
    }

    const onPointerDown = (ev) => {
      renderer.domElement.focus?.();
      // Grabbing a habit unfurls its history rather than orbiting the camera.
      if (focusedEvent && focusedEvent.isHabit) {
        const nd = field.nodes[focusedEvent.nodeIdx];
        if (nd && nd.count >= 2) {
          pulling = true; pullNode = nd;
          pullStartX = ev.clientX; pullStartY = ev.clientY; pullTarget = 0;
          histMat.uniforms.uColor.value.copy(colorFor(nd.catIdx)).multiplyScalar(1.3);
          histLineMat.uniforms.uColor.value.copy(histMat.uniforms.uColor.value);
          histPoints.visible = true; histLine.visible = true; pullPlate.visible = true;
          renderer.domElement.style.cursor = 'ew-resize';
          return;
        }
      }
      dragging = true; lastX = ev.clientX; lastY = ev.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onPointerMove = (ev) => {
      cursorActive = true; pointerX = ev.clientX; pointerY = ev.clientY;
      if (pulling) {
        const dx = ev.clientX - pullStartX, dy = ev.clientY - pullStartY;
        pullTarget = Math.min(Math.hypot(dx, dy) / 240, 1);
        return;
      }
      if (dragging) {
        camTarget.azimuth -= (ev.clientX - lastX) * 0.006;
        camTarget.polar = Math.max(0.4, Math.min(Math.PI - 0.4, camTarget.polar + (ev.clientY - lastY) * 0.005));
        lastX = ev.clientX; lastY = ev.clientY;
      }
    };
    const endPull = () => { pulling = false; pullTarget = 0; renderer.domElement.style.cursor = 'grab'; };
    const onPointerUp = () => { if (pulling) endPull(); dragging = false; renderer.domElement.style.cursor = 'grab'; };
    const onPointerLeave = () => {
      dragging = false; cursorActive = false;
      if (pulling) endPull();
      if (focusedEvent) {
        focusedEvent = null; receipt.visible = false;
        eventMat.uniforms.uFocusIndex.value = -1;
        eventMat.uniforms.uHighlightNode.value = -1;
        onFocusRef.current?.(null);
      }
    };
    const onWheel = (ev) => {
      ev.preventDefault();
      camTarget.distance = Math.max(9, Math.min(62, camTarget.distance + Math.sign(ev.deltaY) * 1.8));
    };
    const onKey = (ev) => {
      if (ev.key === 'r' || ev.key === 'R') {
        camTarget.azimuth = 0.9; camTarget.polar = 1.05; camTarget.distance = 31;
        ev.preventDefault();
      }
    };

    const el = renderer.domElement;
    el.tabIndex = 0;
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerleave', onPointerLeave);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', onPointerUp);

    /* Post */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.5));
    const finalPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(w * dpr, h * dpr) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: FINAL_FRAG,
    });
    composer.addPass(finalPass);

    const onResize = () => {
      const nw = wrap.clientWidth, nh = wrap.clientHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh, false);
      composer.setSize(nw, nh);
      camera.aspect = nw / nh; camera.updateProjectionMatrix();
      skyMat.uniforms.uRes.value.set(nw * dpr, nh * dpr);
      finalPass.uniforms.uRes.value.set(nw * dpr, nh * dpr);
    };
    const ro = new ResizeObserver(onResize); ro.observe(wrap);

    apiRef.current = {
      setLens: (id) => { if (id !== activeLens) applyLayout(id, activeScale, false); },
      setScale: (id) => { if (id !== activeScale) applyLayout(activeLens, id, false); },
    };

    /* Loop */
    let raf = 0, running = true, tPrev = 0, t = 0;
    const loop = (now) => {
      if (!running) return;
      // Clamped both directions: the upper bound guards against a huge
      // catch-up frame after the tab was backgrounded a long time; the
      // lower bound guards against a non-monotonic `now` (defensive — the
      // browser's rAF clock should never go backward, but a negative dt
      // would otherwise drive morph outside [0,1] with no way back).
      const dt = tPrev ? Math.max(0, Math.min((now - tPrev) / 1000, 0.05)) : 0.016;
      tPrev = now; t += dt;

      camState.azimuth  += (camTarget.azimuth  - camState.azimuth)  * 0.09;
      camState.polar    += (camTarget.polar    - camState.polar)    * 0.09;
      camState.distance += (camTarget.distance - camState.distance) * 0.09;
      if (!dragging && !pulling && !reduce) camTarget.azimuth += dt * 0.02;
      updateCamera();

      if (morphing) {
        morph = Math.max(0, Math.min(1, morph + dt * 0.9));
        eventMat.uniforms.uMorph.value = morph;
        if (morph >= 1) morphing = false;
      }
      writeLive(morph);

      plateOpacity += (plateTarget - plateOpacity) * 0.08;
      nodePlates.forEach(p => { p.mat.opacity = plateOpacity; p.mesh.lookAt(camera.position); });
      lattices.forEach(l => {
        const lifted = eventMat.uniforms.uHighlightNode.value === l.node.index;
        const target = lifted ? 1.4 : latticeTarget;
        l.mat.uniforms.uOpacity.value += (target - l.mat.uniforms.uOpacity.value) * 0.12;
        l.mat.uniforms.uTime.value = t;
      });
      burstMeshes.forEach(b => {
        b.mat.uniforms.uOpacity.value += (burstTarget - b.mat.uniforms.uOpacity.value) * 0.08;
        b.mat.uniforms.uTime.value = t;
      });

      // Accumulation pull — reveal real past visits, oldest first.
      pullAmount += (pullTarget - pullAmount) * 0.16;
      if (pullAmount > 0.01 && pullNode) {
        const mem = field.events
          .filter(e => e.nodeIdx === pullNode.index)
          .sort((a, b) => a.dayNum - b.dayNum);
        const shown = Math.max(1, Math.min(mem.length, Math.round(pullAmount * mem.length)));
        const anchor = mem[mem.length - 1];
        const ax = cur[anchor.i*3], ay = cur[anchor.i*3+1], az = cur[anchor.i*3+2];
        // Lay the history out as a receding trail behind the habit.
        const dirx = ax === 0 && az === 0 ? 1 : ax / (Math.hypot(ax, az) || 1);
        const dirz = ax === 0 && az === 0 ? 0 : az / (Math.hypot(ax, az) || 1);
        let spent = 0;
        const hp = histGeom.attributes.aPos.array;
        const hs = histGeom.attributes.aSize.array;
        const hl = histLineGeom.attributes.position.array;
        for (let k = 0; k < MAX_HISTORY; k++) {
          if (k < shown) {
            const ev = mem[mem.length - 1 - k];
            spent += ev.amount;
            const step = 1.15 + k * 0.06;
            const x = ax + dirx * step * (k + 1);
            const y = ay + 0.35 * (k + 1) * 0.32;
            const z = az + dirz * step * (k + 1);
            hp[k*3] = x; hp[k*3+1] = y; hp[k*3+2] = z;
            hs[k] = 4 + ev.sizeNorm * 7;
            hl[k*3] = x; hl[k*3+1] = y; hl[k*3+2] = z;
          } else {
            hl[k*3] = hl[(Math.max(shown,1)-1)*3];
            hl[k*3+1] = hl[(Math.max(shown,1)-1)*3+1];
            hl[k*3+2] = hl[(Math.max(shown,1)-1)*3+2];
          }
        }
        histGeom.attributes.aPos.needsUpdate = true;
        histGeom.attributes.aSize.needsUpdate = true;
        histLineGeom.attributes.position.needsUpdate = true;
        histMat.uniforms.uCount.value = shown;
        histLineMat.uniforms.uOpacity.value = Math.min(pullAmount * 1.4, 1);
        const firstShown = mem[mem.length - shown];
        drawPull(pullNode, shown, spent, firstShown.date);
        const lastIdx = Math.max(shown - 1, 0);
        pullPlate.position.set(hp[lastIdx*3] + 2.2, hp[lastIdx*3+1] + 1.3, hp[lastIdx*3+2]);
        pullPlate.lookAt(camera.position);
        pMat.opacity = Math.min(pullAmount * 1.6, 1);
        histPoints.visible = true; histLine.visible = true; pullPlate.visible = true;
        onPullRef.current?.({
          label: pullNode.label, shown, visits: pullNode.count,
          spent, since: firstShown.date,
        });
      } else {
        histMat.uniforms.uCount.value = 0;
        histLineMat.uniforms.uOpacity.value = 0;
        pMat.opacity = 0;
        if (pullAmount <= 0.01) {
          histPoints.visible = false; histLine.visible = false; pullPlate.visible = false;
          if (!pulling && pullNode) { pullNode = null; onPullRef.current?.(null); }
        }
      }

      if (cursorActive) {
        eventMat.uniforms.uCursorPower.value += (1 - eventMat.uniforms.uCursorPower.value) * 0.12;
        if (!pulling) updateFocus();
      } else {
        eventMat.uniforms.uCursorPower.value *= 0.9;
      }
      rMat.opacity += ((receipt.visible ? 1 : 0) - rMat.opacity) * 0.16;
      if (receipt.visible) receipt.lookAt(camera.position);

      // One beat per typical gap between spending days.
      eventMat.uniforms.uBeat.value = Math.pow(1 - (t % cadencePeriod) / cadencePeriod, 3);
      eventMat.uniforms.uTime.value = t;
      skyMat.uniforms.uTime.value = t;
      cadenceMat.uniforms.uTime.value = t;
      histMat.uniforms.uTime.value = t;
      histLineMat.uniforms.uTime.value = t;
      finalPass.uniforms.uTime.value = t;

      renderer.autoClear = false;
      renderer.clear();
      renderer.render(skyScene, skyCam);
      renderer.clearDepth();
      composer.render();
      renderer.autoClear = true;
      raf = requestAnimationFrame(loop);
    };
    const start = () => { tPrev = 0; raf = requestAnimationFrame(loop); };
    if (reduce) { start(); setTimeout(() => { cancelAnimationFrame(raf); running = false; }, 80); }
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
      apiRef.current = null;
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onPointerLeave);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
      wrap.removeChild(el);
      composer.dispose?.();
      renderer.dispose();
      [skyMat, eventMat, cadenceMat, histMat, histLineMat, rMat, pMat].forEach(m => m.dispose());
      [geom, histGeom, histLineGeom, cadenceRing.geometry, receipt.geometry, pullPlate.geometry]
        .forEach(g => g.dispose());
      lattices.forEach(l => { l.mat.dispose(); l.geom.dispose(); });
      burstMeshes.forEach(b => { b.mat.dispose(); b.mesh.geometry.dispose(); });
      nodePlates.forEach(p => { p.mat.dispose(); p.tex.dispose(); p.mesh.geometry.dispose(); });
      rTex.dispose(); pTex.dispose();
    };
    // lens and scale are applied imperatively; listing them here would tear
    // down and rebuild the whole scene on every control change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, reduce]);

  useEffect(() => { apiRef.current?.setLens(lens); }, [lens]);
  useEffect(() => { apiRef.current?.setScale(scale); }, [scale]);

  if (!webglOk) {
    return (
      <Box sx={{ height: height || '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#04050a' }}>
        <Typography sx={{ color: 'rgba(180,200,235,0.6)', fontSize: 13, fontFamily: '"SF Mono", monospace' }}>
          WEBGL UNAVAILABLE · FIELD CANNOT RENDER
        </Typography>
      </Box>
    );
  }
  if (!field) return null;

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={`Spending field. ${field.count} purchases across ${field.categories.length} categories, seen through the ${lens.toLowerCase()} lens at ${scale.toLowerCase()} scale.`}
      sx={{ position: 'relative', width: '100%', height: height || '100%', bgcolor: '#04050a', overflow: 'hidden' }}
    />
  );
}
