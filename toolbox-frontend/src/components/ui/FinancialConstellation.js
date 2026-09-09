/**
 * FinancialConstellation — Money OS's signature paradigm.
 *
 * Every individual transaction becomes a star in 3D void space. Position
 * is a deterministic function of (category, amount, date), so the same
 * money always draws the same constellation — every user's Money OS looks
 * recognizably like theirs.
 *
 * Physics rules that govern the space:
 *
 *   • Category → gravity well. Seven fixed anchor points on a ring at
 *     radius R around the origin. Each transaction orbits its category's
 *     well.
 *   • Transaction → mass. Orbit radius scales with log(amount) so bigger
 *     purchases sit further out and read louder.
 *   • Date → orbital angle. A deterministic seed drawn from the date +
 *     an amount-hash, so the same underlying data always yields the same
 *     spatial layout — reproducible, comparable across months.
 *   • Recurring subscription → constellation line. Whenever the detector
 *     finds ≥3 transactions in a category clustered around one rounded
 *     amount, it renders an emissive line-strip through them. Netflix
 *     becomes a shape.
 *   • Anomaly → halo. A transaction beyond 3× its category's median gets
 *     a pulsing ring and bends its neighbors gravitationally.
 *   • Net balance → central sun. Icosahedron at world origin, radius
 *     ln(|net|), color signed mint/red.
 *   • User cursor → attractor. Raycast to a plane at y=0 gives a world
 *     position; every star within influence bends toward it. The nearest
 *     star inside a small pick-radius surfaces a floating receipt.
 *
 * UI lives inside the world:
 *   • Category names are billboarded canvas-texture labels above wells.
 *   • The net readout and month totals orbit the sun as text-planes.
 *   • The focused-star receipt is a canvas-texture plane anchored to the
 *     hit position — no DOM overlay.
 *
 * The React tree above the canvas is empty. The viewport IS the page.
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

// Star vertex — computes orbital position per-frame, applies user gravity.
// Per-star attributes carry the deterministic layout; time drives orbit angle.
const STAR_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform vec3  uCursor;
uniform float uCursorPower;
uniform vec3  uAnomalyPos[6];   // up to 6 anomaly positions for lensing
uniform float uAnomalyStr[6];

attribute vec3  aAnchor;
attribute float aRadius;
attribute float aAngle0;
attribute float aOrbitSpeed;
attribute float aYLocal;
attribute float aSize;
attribute float aSeed;
attribute vec3  aColor;
attribute float aIsAnomaly;
attribute float aIsRecurring;

varying vec3  vColor;
varying float vAlpha;
varying float vIsAnomaly;
varying float vIsRecurring;
varying float vFocus;
varying float vDist;

void main(){
  float ang = aAngle0 + uTime * aOrbitSpeed;
  vec3 local = vec3(
    aRadius * cos(ang),
    aYLocal + sin(uTime * 0.3 + aSeed * 6.28) * 0.05,
    aRadius * sin(ang)
  );
  vec3 pos = aAnchor + local;

  // Anomaly gravitational lensing — bend nearby stars around anomalies
  for (int i = 0; i < 6; i++) {
    vec3 d = pos - uAnomalyPos[i];
    float dl = length(d) + 0.001;
    float pull = uAnomalyStr[i] * 0.35 / (dl * dl + 0.6);
    pos += normalize(d) * pull;
  }

  // User cursor gravity — subtle attractor within influence
  vec3 toC = uCursor - pos;
  toC.y *= 0.25;                          // mostly horizontal pull
  float d = length(toC);
  float pull = 1.4 / (d * d + 1.2);
  pos += normalize(toC + 0.0001) * pull * uCursorPower * 0.35;

  vFocus = smoothstep(2.6, 0.4, d) * uCursorPower;
  vColor = aColor;
  vAlpha = 0.72 + vFocus * 0.28;
  vIsAnomaly = aIsAnomaly;
  vIsRecurring = aIsRecurring;
  vDist = d;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (aSize + vFocus * 6.0) * uDpr * (280.0 / -mv.z);
}
`;

const STAR_FRAG = /* glsl */`
uniform float uTime;
varying vec3  vColor;
varying float vAlpha;
varying float vIsAnomaly;
varying float vIsRecurring;
varying float vFocus;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 5.5);
  float halo = exp(-r2 * 1.5) * 0.35;
  vec3 col = vColor * (core * 3.2 + halo * 1.3);
  float alpha = vAlpha * (core * 1.15 + halo * 0.7);
  // Anomaly ring — pulsing outer glow
  if (vIsAnomaly > 0.5) {
    float ring = smoothstep(0.62, 0.88, sqrt(r2)) * (1.0 - smoothstep(0.88, 1.0, sqrt(r2)));
    float pulse = 0.5 + 0.5 * sin(uTime * 2.8);
    col += vec3(1.0, 0.55, 0.35) * ring * (0.9 + 0.6 * pulse);
    alpha = max(alpha, ring * 0.9);
  }
  // Recurring — slight cyan edge tint for identity
  if (vIsRecurring > 0.5) {
    float edge = smoothstep(0.55, 0.9, sqrt(r2)) * (1.0 - smoothstep(0.9, 1.0, sqrt(r2)));
    col += vec3(0.15, 0.85, 1.0) * edge * 0.6;
  }
  // Focus lift — extra brightness on the star nearest the cursor
  col += vColor * vFocus * 0.7;
  gl_FragColor = vec4(col, alpha);
}
`;

// Recurring constellation line — solid emissive
const LINE_VERT = /* glsl */`
uniform float uTime;
attribute float aSeed;
varying float vSeed;
void main(){
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const LINE_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uTime;
varying float vSeed;
void main(){
  float pulse = 0.55 + 0.45 * sin(uTime * 1.6 + vSeed * 6.28);
  gl_FragColor = vec4(uColor * (0.65 + 0.35 * pulse), 0.55 + 0.35 * pulse);
}
`;

// Sun — reused nucleus-style shader
const SUN_VERT = /* glsl */`
uniform float uTime;
uniform float uTurbulence;
varying vec3  vNormal;
varying vec3  vViewPos;
varying float vDisp;
${NOISE_GLSL}
void main(){
  vec3 p = position;
  float t = uTime * 0.3;
  float n1 = snoise(p * 1.4 + vec3(t, -t*0.7, t*0.4));
  float n2 = snoise(p * 3.1 + vec3(-t*0.8, t*0.5, -t)) * 0.5;
  float disp = (n1 + n2) * (0.06 + uTurbulence * 0.14);
  vec3 displaced = p + normal * disp;
  vDisp = disp;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;
const SUN_FRAG = /* glsl */`
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
  base += uCoreHot * fil * 0.55;
  vec3 halo = uFresnelCol * fresnel * (1.3 + 0.4 * sin(uTime * 1.4));
  vec3 col  = base * (0.55 + 0.45 * ndv) + halo;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Well disc — a translucent ring at each gravity well anchor
const WELL_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Gravity well = a READABLE GAUGE, not a decorative ring.
// The arc sweeps `uShare` of a full turn, so the ring's filled length is
// literally this category's share of the month's spend. Ticks mark tenths.
// A dim "empty" track shows the remainder, so the ratio is legible at a glance.
const WELL_FRAG = /* glsl */`
#define PI 3.14159265
uniform vec3  uColor;
uniform float uTime;
uniform float uShare;    // 0..1 — category share of month spend
varying vec2  vUv;
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  // Angle measured from +Y clockwise so the gauge starts at "12 o'clock"
  float a01 = fract((atan(c.x, c.y)) / (2.0 * PI) + 1.0);

  // The gauge track — a thin annulus
  float track = smoothstep(0.60, 0.635, r) * (1.0 - smoothstep(0.695, 0.73, r));
  // The filled portion
  float filled = step(a01, uShare);
  // Leading-edge highlight so the arc terminates crisply
  float head = smoothstep(0.02, 0.0, abs(a01 - uShare)) * track;

  // Tick marks every tenth of the circumference, longer every quarter
  float tphase = fract(a01 * 10.0);
  float isTick = smoothstep(0.06, 0.0, min(tphase, 1.0 - tphase));
  float tickBand = smoothstep(0.72, 0.745, r) * (1.0 - smoothstep(0.79, 0.815, r));
  float ticks = isTick * tickBand;

  // A soft floor-glow marking the well's gravitational basin
  float basin = exp(-pow(r, 2.0) * 3.2) * 0.30;
  // Very slow inward drift lines — reads as infall, not shimmer
  float infall = sin(r * 16.0 - uTime * 0.9) * 0.5 + 0.5;
  infall *= smoothstep(0.60, 0.20, r) * 0.10;

  vec3 col = uColor * (
      track * (filled * 0.85 + 0.10)     // bright where filled, faint track elsewhere
    + head * 1.6
    + ticks * 0.45
    + basin
    + infall
  );
  float alpha = track * (filled * 0.85 + 0.14) + head * 0.9 + ticks * 0.4
              + basin * 0.85 + infall;
  gl_FragColor = vec4(col, alpha);
}
`;

// Sky — starfield + nebula fullscreen
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
  float h = hash21(id); if(h < 0.987) return 0.0;
  float s = smoothstep(0.06, 0.0, length(g)) * (h - 0.987) * 77.0;
  s *= 0.6 + 0.4 * sin(uTime * (1.0 + h*4.0) + h * 20.0);
  return s;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec3 col = vec3(0.005, 0.007, 0.016);
  float n = snoise(vec3(uv*1.3, uTime*0.025))*0.5 + 0.5;
  float m = snoise(vec3(uv*2.6 + 8.0, uTime*0.018))*0.5 + 0.5;
  col += uNebulaA * pow(n, 2.8) * 0.11;
  col += uNebulaB * pow(m, 3.5) * 0.075;
  col *= 1.0 - smoothstep(0.4, 1.5, length(uv)) * 0.55;
  float s = starLayer(uv, 60.0) + starLayer(uv+13.0, 120.0)*0.55 + starLayer(uv-7.0, 220.0)*0.32;
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
  col.rgb *= clamp(vig, 0.32, 1.0);
  float g = hash(vUv * uRes + uTime) - 0.5;
  col.rgb += g * 0.018;
  col.rgb *= 1.0 - 0.035 * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = col;
}
`;

/* ─── Utility: canvas → three texture ───────────────────────────────────── */

function makeTextTexture(text, opts = {}) {
  const {
    size = 22, weight = 500, color = 'rgba(220, 230, 250, 0.9)',
    mono = true, letterSpacing = 0.06, upper = false,
    width = 512, height = 96, padX = 20,
  } = opts;
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  g.clearRect(0, 0, width, height);
  const font = mono
    ? `${weight} ${size}px "SF Mono", "JetBrains Mono", ui-monospace, monospace`
    : `${weight} ${size}px "SF Pro Display", -apple-system, sans-serif`;
  g.font = font;
  g.textBaseline = 'middle';
  g.fillStyle = color;
  const label = upper ? text.toUpperCase() : text;
  // fake letter-spacing (canvas doesn't have it native)
  let x = padX;
  const y = height / 2;
  const gap = size * letterSpacing;
  for (const ch of label) {
    g.fillText(ch, x, y);
    x += g.measureText(ch).width + gap;
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/* ─── Data derivation ────────────────────────────────────────────────────── */

// Deterministic hash from string → [0, 1)
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function deriveConstellation(transactions, netBalance, incomeTotal) {
  if (!transactions || !transactions.length) {
    return null;
  }
  // Only expense-type
  const spend = transactions.filter(t => (t.type || 'expense') !== 'income' && Math.abs(Number(t.amount) || 0) > 0);
  if (!spend.length) return null;

  // Bucket categories by month total, top 6 + "Other"
  const totals = new Map();
  spend.forEach(t => {
    const name = t.category?.name || 'Uncategorized';
    totals.set(name, (totals.get(name) || 0) + Math.abs(Number(t.amount) || 0));
  });
  const sortedCats = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const catList = [...sortedCats.slice(0, 6).map(([n]) => n), 'Other'];
  const catIndex = new Map(catList.map((n, i) => [n, i]));
  const palette = chart.categorical.dark;

  // Category anchors on a ring
  const R = 10.5;
  const anchors = catList.map((_, i) => {
    const a = (i / catList.length) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
  });
  const catColors = catList.map((_, i) => new THREE.Color(palette[i % palette.length]));

  const maxAmt = Math.max(...spend.map(t => Math.abs(Number(t.amount) || 0)), 1);
  const monthDayCount = 31;   // safe upper bound

  // Median per category (for anomaly detection)
  const perCat = new Map();
  spend.forEach(t => {
    const idx = catIndex.get(t.category?.name) ?? catIndex.get('Other');
    if (!perCat.has(idx)) perCat.set(idx, []);
    perCat.get(idx).push(Math.abs(Number(t.amount) || 0));
  });
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const catMedian = new Map();
  perCat.forEach((amts, i) => catMedian.set(i, median(amts)));

  // Star records
  const stars = spend.map((t, i) => {
    const name = t.category?.name || 'Uncategorized';
    const catIdx = catIndex.get(name) ?? catIndex.get('Other');
    const amt = Math.abs(Number(t.amount) || 0);
    const dateStr = typeof t.date === 'string' ? t.date : (t.date instanceof Date ? t.date.toISOString().slice(0, 10) : '');
    const dayOfMonth = parseInt(dateStr.slice(8, 10), 10) || 1;
    const h = hash01(`${dateStr}|${amt}|${i}`);
    const seed = hash01(`${i}|${amt}`);

    // Orbital coords in local (well) space
    const radius = 0.55 + Math.log10(amt + 1) / Math.log10(maxAmt + 1) * 2.8;
    // Angle blends day-of-month (deterministic macro layout) + hash (micro spread)
    const angle = (dayOfMonth / monthDayCount) * Math.PI * 2 * 1.7 + h * 0.8;
    // Vertical: day-of-month drives Y so recent txns rise upward — creates recurring vertical alignment
    const yLocal = ((dayOfMonth - 1) / (monthDayCount - 1)) * 1.6 - 0.8;
    // Very slow orbit — some drift, mostly stable
    const orbitSpeed = 0.02 + seed * 0.05;

    const isAnomaly = amt > 3.0 * (catMedian.get(catIdx) || amt);
    return {
      i,
      catIdx, catName: name,
      amt, dateStr, dayOfMonth,
      description: t.description || t.text || '',
      radius, angle, yLocal, orbitSpeed, seed,
      isAnomaly,
      anchor: anchors[catIdx],
      color: catColors[catIdx],
    };
  });

  // Recurring detection — cluster (catIdx, roundedAmount ±10%) with size ≥ 3
  const recurringGroups = [];
  const groupKey = new Map();       // Map<catIdx, Array<{center, members}>>
  stars.forEach((s) => {
    if (!groupKey.has(s.catIdx)) groupKey.set(s.catIdx, []);
    const groups = groupKey.get(s.catIdx);
    // Find compatible group
    const found = groups.find(g => Math.abs(g.center - s.amt) / g.center < 0.10);
    if (found) {
      found.members.push(s);
      // update center as running mean
      found.center = found.members.reduce((a, m) => a + m.amt, 0) / found.members.length;
    } else {
      groups.push({ center: s.amt, members: [s] });
    }
  });
  const recurringSet = new Set();
  groupKey.forEach((groups) => {
    groups.forEach(g => {
      if (g.members.length >= 3) {
        recurringGroups.push(g);
        g.members.forEach(m => recurringSet.add(m.i));
      }
    });
  });

  // Mark stars
  stars.forEach(s => { s.isRecurring = recurringSet.has(s.i); });

  return {
    stars,
    catList, catIndex, catColors, anchors,
    palette,
    recurringGroups,
    netBalance, incomeTotal,
    totalSpent: spend.reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0),
    transactionCount: spend.length,
  };
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function FinancialConstellation({
  transactions = [],
  net = 0,
  income = 0,
  height,
  onFocusChange,
}) {
  const wrapRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  // Held in a ref so a new callback identity from the parent never tears down
  // and rebuilds the whole WebGL scene.
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const derived = useMemo(() => deriveConstellation(transactions, net, income), [transactions, net, income]);

  useEffect(() => {
    if (!derived) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) { setWebglOk(false); return; }

    /* Renderer / Scene / Camera */
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
    renderer.domElement.style.cursor = 'grab';
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040610, 0.020);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    // Spherical camera state (orbit around origin)
    const camState = { azimuth: 0.9, polar: 1.05, distance: 31 };
    const camTarget = { azimuth: 0.9, polar: 1.05, distance: 31 };
    const updateCamera = () => {
      const { azimuth, polar, distance } = camState;
      camera.position.x = distance * Math.sin(polar) * Math.cos(azimuth);
      camera.position.y = distance * Math.cos(polar);
      camera.position.z = distance * Math.sin(polar) * Math.sin(azimuth);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    /* Sky */
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

    /* Central Sun */
    const netMag = Math.abs(derived.netBalance) || 1;
    // Capped: the sun is the anchor of the composition, not its subject. Past
    // ~1.5 world units it starts eating the stars it is supposed to orbit.
    const sunR = Math.min(0.55 + Math.log10(netMag + 10) * 0.16, 1.35);
    const isPositive = derived.netBalance >= 0;
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTurbulence: { value: 0.5 },
        uCoreCold: { value: new THREE.Color(isPositive ? accents.mint : accents.red).multiplyScalar(0.4) },
        uCoreHot: { value: new THREE.Color(isPositive ? accents.cyan : accents.amber) },
        uFresnelCol: { value: new THREE.Color(accents.violet).multiplyScalar(1.2) },
      },
      vertexShader: SUN_VERT, fragmentShader: SUN_FRAG,
    });
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(sunR, 5), sunMat);
    scene.add(sun);

    // Sun corona plane (billboard for soft outer glow)
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(isPositive ? accents.cyan : accents.amber) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){ vec2 c=vUv-0.5; float d=length(c);
          float a = smoothstep(0.5,0.0,d) * (0.18 + 0.07*sin(uTime*1.4));
          gl_FragColor=vec4(uColor, a*0.32); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(sunR * 3.6, sunR * 3.6), coronaMat);
    scene.add(corona);

    /* Category well discs + label billboards */
    const wellMeshes = [];
    const labelMeshes = [];
    const spokeMeshes = [];
    // Per-category month totals — drive both the gauge sweep and the label.
    const catTotals = derived.anchors.map((_, i) =>
      derived.stars.filter(s => s.catIdx === i).reduce((a, s) => a + s.amt, 0));
    const grandTotal = catTotals.reduce((a, b) => a + b, 0) || 1;

    derived.anchors.forEach((anchor, i) => {
      const share = catTotals[i] / grandTotal;

      // Gravity well — a gauge whose filled arc is this category's share.
      const wellMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: derived.catColors[i] },
          uTime: { value: 0 },
          uShare: { value: share },
        },
        vertexShader: WELL_VERT, fragmentShader: WELL_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const wellGeom = new THREE.PlaneGeometry(6.2, 6.2);
      const well = new THREE.Mesh(wellGeom, wellMat);
      well.position.copy(anchor);
      well.rotation.x = -Math.PI / 2;
      scene.add(well);
      wellMeshes.push({ mesh: well, mat: wellMat, geom: wellGeom });

      // Structural spoke — sun → well. Brightness encodes the same share, so
      // the field reads as a system of relationships rather than scattered dust.
      const spokeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        anchor.clone(),
      ]);
      const spokeMat = new THREE.LineBasicMaterial({
        color: derived.catColors[i],
        transparent: true,
        opacity: 0.08 + share * 0.42,
        depthWrite: false,
      });
      const spoke = new THREE.Line(spokeGeom, spokeMat);
      scene.add(spoke);
      spokeMeshes.push({ mesh: spoke, mat: spokeMat, geom: spokeGeom });

      // Category label — name on top, amount + share beneath, both legible.
      const r255 = Math.round(derived.catColors[i].r * 255);
      const g255 = Math.round(derived.catColors[i].g * 255);
      const b255 = Math.round(derived.catColors[i].b * 255);
      const lc = document.createElement('canvas');
      lc.width = 768; lc.height = 176;
      const lg = lc.getContext('2d');
      lg.textBaseline = 'middle';
      // Name
      lg.font = '600 46px "SF Mono", "JetBrains Mono", ui-monospace, monospace';
      lg.fillStyle = `rgba(${r255}, ${g255}, ${b255}, 0.96)`;
      lg.textAlign = 'center';
      lg.fillText(derived.catList[i].toUpperCase().slice(0, 18), 384, 46);
      // Amount + share
      lg.font = '400 38px "SF Pro Display", -apple-system, sans-serif';
      lg.fillStyle = 'rgba(232, 240, 252, 0.88)';
      lg.fillText(moneySmart(catTotals[i]), 384, 104);
      lg.font = '500 26px "SF Mono", ui-monospace, monospace';
      lg.fillStyle = 'rgba(180, 200, 235, 0.6)';
      lg.fillText(`${(share * 100).toFixed(0)}% OF SPEND`, 384, 148);
      const tex = new THREE.CanvasTexture(lc);
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.19), labelMat);
      labelPlane.position.copy(anchor);
      labelPlane.position.y += 3.1;
      scene.add(labelPlane);
      labelMeshes.push({ mesh: labelPlane, mat: labelMat, tex, geom: labelPlane.geometry });
    });

    /* Stars — one instanced Points cloud */
    const N = derived.stars.length;
    const positions = new Float32Array(N * 3);
    const aAnchor = new Float32Array(N * 3);
    const aRadius = new Float32Array(N);
    const aAngle0 = new Float32Array(N);
    const aOrbitSpeed = new Float32Array(N);
    const aYLocal = new Float32Array(N);
    const aSize = new Float32Array(N);
    const aSeed = new Float32Array(N);
    const aColor = new Float32Array(N * 3);
    const aIsAnomaly = new Float32Array(N);
    const aIsRecurring = new Float32Array(N);

    derived.stars.forEach((s, i) => {
      const a = s.anchor;
      aAnchor[i * 3 + 0] = a.x; aAnchor[i * 3 + 1] = a.y; aAnchor[i * 3 + 2] = a.z;
      aRadius[i] = s.radius;
      aAngle0[i] = s.angle;
      aOrbitSpeed[i] = s.orbitSpeed;
      aYLocal[i] = s.yLocal;
      aSize[i] = 5.5 + Math.log10(s.amt + 1) * 3.0;
      aSeed[i] = s.seed;
      aColor[i * 3 + 0] = s.color.r;
      aColor[i * 3 + 1] = s.color.g;
      aColor[i * 3 + 2] = s.color.b;
      aIsAnomaly[i] = s.isAnomaly ? 1.0 : 0.0;
      aIsRecurring[i] = s.isRecurring ? 1.0 : 0.0;
      positions[i * 3] = a.x; positions[i * 3 + 1] = a.y; positions[i * 3 + 2] = a.z;
    });

    // Anomaly uniforms — up to 6
    const anomalyList = derived.stars.filter(s => s.isAnomaly).slice(0, 6);
    const uAnomalyPos = new Array(6).fill(0).map(() => new THREE.Vector3());
    const uAnomalyStr = new Float32Array(6);
    anomalyList.forEach((s, i) => {
      // Approx position: anchor + orbital at angle0
      const x = s.anchor.x + s.radius * Math.cos(s.angle);
      const z = s.anchor.z + s.radius * Math.sin(s.angle);
      uAnomalyPos[i].set(x, s.yLocal, z);
      uAnomalyStr[i] = Math.log10(s.amt + 1) * 0.35;
    });

    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeom.setAttribute('aAnchor', new THREE.BufferAttribute(aAnchor, 3));
    starGeom.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
    starGeom.setAttribute('aAngle0', new THREE.BufferAttribute(aAngle0, 1));
    starGeom.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(aOrbitSpeed, 1));
    starGeom.setAttribute('aYLocal', new THREE.BufferAttribute(aYLocal, 1));
    starGeom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    starGeom.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    starGeom.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    starGeom.setAttribute('aIsAnomaly', new THREE.BufferAttribute(aIsAnomaly, 1));
    starGeom.setAttribute('aIsRecurring', new THREE.BufferAttribute(aIsRecurring, 1));
    starGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20);

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: dpr },
        uCursor: { value: new THREE.Vector3(0, 0, 0) },
        uCursorPower: { value: 0 },
        uAnomalyPos: { value: uAnomalyPos },
        uAnomalyStr: { value: uAnomalyStr },
      },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeom, starMat);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    /* Recurring constellation lines — one BufferGeometry per group, packed */
    const linePackets = [];
    derived.recurringGroups.forEach((g, gi) => {
      const sorted = [...g.members].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
      const pts = sorted.map(s => {
        // Same computation as vertex shader at t=0 (angle0)
        const x = s.anchor.x + s.radius * Math.cos(s.angle);
        const z = s.anchor.z + s.radius * Math.sin(s.angle);
        return new THREE.Vector3(x, s.yLocal, z);
      });
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const seedAttr = new Float32Array(pts.length);
      seedAttr.fill(gi * 0.29);
      geom.setAttribute('aSeed', new THREE.BufferAttribute(seedAttr, 1));
      const lineMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: derived.catColors[g.members[0].catIdx].clone().multiplyScalar(1.3) }, uTime: { value: 0 } },
        vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geom, lineMat);
      scene.add(line);
      linePackets.push({ line, geom, mat: lineMat });
    });

    /* Orbital metric text-planes around the sun */
    // Positions on a horizontal ring at Y=0 slightly out from sun
    const orbitRing = [
      { text: `NET · ${moneySmart(derived.netBalance)}`, color: isPositive ? '#30D6A5' : '#FF6B6B' },
      { text: `SPENT · ${moneySmart(derived.totalSpent)}`, color: '#BF5AF2' },
      { text: `TXNS · ${derived.transactionCount}`, color: '#64D2FF' },
      { text: `INCOME · ${moneySmart(derived.incomeTotal)}`, color: '#30D6A5' },
      { text: `${derived.stars.filter(s => s.isAnomaly).length} ANOMAL${derived.stars.filter(s => s.isAnomaly).length === 1 ? 'Y' : 'IES'}`, color: '#FF9F0A' },
      { text: `${derived.recurringGroups.length} RECURRING`, color: '#64D2FF' },
    ];
    const orbitTextMeshes = [];
    orbitRing.forEach((it, i) => {
      const tex = makeTextTexture(it.text, {
        size: 22, weight: 500, mono: true,
        color: it.color + 'ee',
        letterSpacing: 0.14, width: 560, height: 46,
      });
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.28), mat);
      const angle = (i / orbitRing.length) * Math.PI * 2;
      const ringR = sunR + 2.7;
      plane.position.set(Math.cos(angle) * ringR, sunR + 0.9 + (i % 2) * 0.3, Math.sin(angle) * ringR);
      plane.userData.angle0 = angle;
      plane.userData.ringR = ringR;
      plane.userData.baseY = plane.position.y;
      scene.add(plane);
      orbitTextMeshes.push({ mesh: plane, mat, tex, geom: plane.geometry });
    });

    /* Focus label — canvas-texture plane that snaps to the focused star */
    const focusCanvas = document.createElement('canvas');
    focusCanvas.width = 512; focusCanvas.height = 200;
    const focusCtx = focusCanvas.getContext('2d');
    const focusTex = new THREE.CanvasTexture(focusCanvas);
    focusTex.anisotropy = 8;
    focusTex.minFilter = THREE.LinearFilter;
    const focusMat = new THREE.MeshBasicMaterial({ map: focusTex, transparent: true, depthWrite: false, opacity: 0 });
    const focusMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.35), focusMat);
    focusMesh.visible = false;
    scene.add(focusMesh);

    function drawFocus(star) {
      const c = focusCtx;
      c.clearRect(0, 0, 512, 200);
      c.strokeStyle = 'rgba(100,210,255,0.5)';
      c.lineWidth = 1.5;
      const brk = 20;
      c.beginPath();
      const paths = [
        [8, 8, brk, 8], [8, 8, 8, brk],
        [504, 8, 504 - brk, 8], [504, 8, 504, brk],
        [8, 192, brk, 192], [8, 192, 8, 192 - brk],
        [504, 192, 504 - brk, 192], [504, 192, 504, 192 - brk],
      ];
      paths.forEach(([x1, y1, x2, y2]) => { c.moveTo(x1, y1); c.lineTo(x2, y2); });
      c.stroke();
      // Header — category
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = `rgba(${Math.round(star.color.r * 255)}, ${Math.round(star.color.g * 255)}, ${Math.round(star.color.b * 255)}, 0.9)`;
      c.textBaseline = 'top';
      c.fillText(`▸ ${star.catName.toUpperCase()}`, 24, 18);
      // Amount, big
      c.font = '300 54px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(star.amt), 22, 40);
      // Date + description
      c.font = '500 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.7)';
      c.fillText(star.dateStr, 24, 116);
      if (star.description) {
        c.font = '400 13px "SF Pro Text", -apple-system, sans-serif';
        c.fillStyle = 'rgba(180, 200, 235, 0.55)';
        const desc = star.description.slice(0, 42);
        c.fillText(desc, 24, 138);
      }
      // Tags
      c.textAlign = 'right';
      const tags = [];
      if (star.isRecurring) tags.push('RECURRING');
      if (star.isAnomaly) tags.push('ANOMALY');
      if (tags.length) {
        c.font = '600 11px "SF Mono", ui-monospace, monospace';
        c.fillStyle = 'rgba(100,210,255,0.85)';
        c.fillText(tags.join(' · '), 488, 18);
      }
      c.textAlign = 'left';
      focusTex.needsUpdate = true;
    }

    /* Interaction state */
    let dragging = false, lastX = 0, lastY = 0;
    let cursorActive = false;
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const mouse = new THREE.Vector2();
    let focusedStar = null;

    // Precompute a helper — current world position of a star at time t
    const starPos = new THREE.Vector3();
    function positionOfStar(s, t) {
      const ang = s.angle + t * s.orbitSpeed;
      starPos.set(
        s.anchor.x + s.radius * Math.cos(ang),
        s.yLocal + Math.sin(t * 0.3 + s.seed * 6.28) * 0.05,
        s.anchor.z + s.radius * Math.sin(ang),
      );
      return starPos;
    }

    function updateCursor(clientX, clientY, t) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
      starMat.uniforms.uCursor.value.copy(hitPoint);
      // Find nearest star within picking radius
      let best = null, bestD = Infinity;
      for (const s of derived.stars) {
        const p = positionOfStar(s, t);
        const dx = p.x - hitPoint.x, dz = p.z - hitPoint.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; best = s; }
      }
      const pickR = 1.4;
      if (best && bestD < pickR * pickR) {
        if (focusedStar !== best) {
          focusedStar = best;
          drawFocus(best);
          focusMesh.visible = true;
          onFocusChangeRef.current?.(best);
        }
        // Position the focus panel next to the star, offset up+right
        const p = positionOfStar(best, t);
        focusMesh.position.set(p.x + 2.4, p.y + 1.4, p.z);
      } else if (focusedStar) {
        focusedStar = null;
        focusMesh.visible = false;
        onFocusChangeRef.current?.(null);
      }
    }

    const onPointerDown = (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      cursorActive = true;
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        camTarget.azimuth -= dx * 0.006;
        camTarget.polar = Math.max(0.4, Math.min(Math.PI - 0.4, camTarget.polar + dy * 0.005));
        lastX = e.clientX; lastY = e.clientY;
      }
    };
    const onPointerMoveCursor = (e) => {
      // Track world cursor (used inside render loop with current t)
      lastPointerX = e.clientX; lastPointerY = e.clientY;
    };
    let lastPointerX = 0, lastPointerY = 0;
    const onPointerUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };
    const onPointerLeave = () => {
      dragging = false;
      cursorActive = false;
      if (focusedStar) { focusedStar = null; focusMesh.visible = false; onFocusChangeRef.current?.(null); }
    };
    const onWheel = (e) => {
      e.preventDefault();
      camTarget.distance = Math.max(9, Math.min(62, camTarget.distance + Math.sign(e.deltaY) * 1.8));
    };
    const onKey = (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= derived.catList.length) {
        // Focus camera on that category — set azimuth toward its anchor
        const anchor = derived.anchors[n - 1];
        const az = Math.atan2(anchor.z, anchor.x);
        camTarget.azimuth = az;
        camTarget.polar = 1.15;
        camTarget.distance = 19;
        e.preventDefault();
      }
      if (e.key === '0' || e.key.toLowerCase() === 'r') {
        camTarget.azimuth = 0.9;
        camTarget.polar = 1.05;
        camTarget.distance = 31;
        e.preventDefault();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointermove', onPointerMoveCursor);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('keydown', onKey);

    /* Post-processing — built before the resize observer, which fires immediately */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.5);
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

    /* Resize */
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

    /* Loop */
    let raf = 0, running = true, tPrev = 0, t = 0;
    const loop = (now) => {
      if (!running) return;
      const dt = tPrev ? Math.min((now - tPrev) / 1000, 0.05) : 0.016;
      tPrev = now; t += dt;

      // Smooth camera toward target
      camState.azimuth += (camTarget.azimuth - camState.azimuth) * 0.09;
      camState.polar += (camTarget.polar - camState.polar) * 0.09;
      camState.distance += (camTarget.distance - camState.distance) * 0.09;
      // idle drift when not dragging
      if (!dragging && !reduce) camTarget.azimuth += dt * 0.02;
      updateCamera();

      // Update world cursor + nearest star each frame using last known pointer
      if (cursorActive) {
        starMat.uniforms.uCursorPower.value += (1 - starMat.uniforms.uCursorPower.value) * 0.12;
        updateCursor(lastPointerX, lastPointerY, t);
      } else {
        starMat.uniforms.uCursorPower.value *= 0.9;
      }

      // Orbit metric labels around sun with a very slow rotation
      const orbitAng = t * 0.06;
      orbitTextMeshes.forEach((it) => {
        const a = it.mesh.userData.angle0 + orbitAng;
        const r = it.mesh.userData.ringR;
        it.mesh.position.set(Math.cos(a) * r, it.mesh.userData.baseY, Math.sin(a) * r);
        it.mesh.lookAt(camera.position);
      });
      // Category label planes billboard toward camera
      labelMeshes.forEach(l => l.mesh.lookAt(camera.position));
      // Focus panel billboard toward camera
      focusMesh.lookAt(camera.position);
      focusMat.opacity += ((focusMesh.visible ? 1 : 0) - focusMat.opacity) * 0.14;
      // Corona always faces camera
      corona.lookAt(camera.position);

      // Uniforms
      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      skyMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;
      finalPass.uniforms.uTime.value = t;
      wellMeshes.forEach(w => { w.mat.uniforms.uTime.value = t; });
      linePackets.forEach(p => { p.mat.uniforms.uTime.value = t; });

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
      renderer.domElement.removeEventListener('pointermove', onPointerMoveCursor);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('keydown', onKey);
      wrap.removeChild(renderer.domElement);
      composer.dispose?.();
      renderer.dispose();
      sunMat.dispose(); sun.geometry.dispose();
      coronaMat.dispose(); corona.geometry.dispose();
      skyMat.dispose(); starMat.dispose(); starGeom.dispose();
      wellMeshes.forEach(w => { w.mat.dispose(); w.geom.dispose(); });
      spokeMeshes.forEach(sp => { sp.mat.dispose(); sp.geom.dispose(); });
      labelMeshes.forEach(l => { l.mat.dispose(); l.tex.dispose(); l.geom.dispose(); });
      linePackets.forEach(p => { p.mat.dispose(); p.geom.dispose(); });
      orbitTextMeshes.forEach(o => { o.mat.dispose(); o.tex.dispose(); o.geom.dispose(); });
      focusMat.dispose(); focusMesh.geometry.dispose(); focusTex.dispose();
    };
  }, [derived, reduce]);

  if (!webglOk) {
    return (
      <Box sx={{ height: height || '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                 bgcolor: '#04050a' }}>
        <Typography sx={{ color: 'rgba(180,200,235,0.6)', fontSize: 13, fontFamily: '"SF Mono", monospace' }}>
          WEBGL DISABLED · CONSTELLATION CANNOT RENDER
        </Typography>
      </Box>
    );
  }
  if (!derived) return null;

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={`Financial constellation. ${derived.stars.length} transactions rendered across ${derived.catList.length} categories.`}
      sx={{
        position: 'relative', width: '100%', height: height || '100vh',
        bgcolor: '#04050a', overflow: 'hidden',
      }}
    />
  );
}
