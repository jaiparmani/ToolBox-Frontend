/**
 * FinancialConstellation — the Money OS Pulse engine.
 *
 * One financial world, two orthogonal controls:
 *
 *   LENS  — how the field is interpreted. Six lenses rewrite the physics
 *           that positions every transaction. The data never changes; the
 *           interpretation does.
 *   SCALE — how far back you stand. Quarter / Month / Week / Day changes
 *           the horizon; transactions outside the window fade out rather
 *           than disappear, so you feel the window move.
 *
 * Every transaction is a star whose position is a deterministic function of
 * its own (category, amount, date) under the active lens. Switching lens
 * morphs every star from its old position to its new one through a single
 * `uMorph` uniform, so the whole universe reorganises as one motion.
 *
 * Lenses:
 *   GRAVITY    stars orbit their category's well; wells and spokes visible
 *   FLOW       a river through time — x is date, y is amount, z is category
 *   MOMENTUM   a spiral where radius is that day's spending velocity
 *   PATTERNS   recurring groups collapse into concentric rings; one-offs exile
 *   ANOMALIES  ordinary spend collapses to a dim core; outliers fling outward
 *   BALANCE    stars ride the cumulative net trajectory
 *
 * Signature interaction — PROJECTION PULL. Focus a star belonging to a
 * recurring group, then press and drag outward. The group's constellation
 * extends into the future: one ghost star per future occurrence, with a live
 * readout of cumulative cost. Drag further to project further (up to 24
 * periods). Release and it retracts. You are physically pulling a habit into
 * its consequence.
 *
 * Rendering: one instanced Points draw call for every star, a second small
 * one for projection ghosts, canvas-texture planes for all in-world type,
 * and a bloom + grain/vignette post chain. DPR capped at 2, loop paused off
 * screen and on hidden tabs, reduced-motion renders a single frame, and all
 * GPU resources are disposed on unmount.
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

/* ─── Public vocabulary — the page renders its chrome from these ─────────── */

export const LENSES = [
  { id: 'GRAVITY',   label: 'Gravity',   blurb: 'Where money is being pulled' },
  { id: 'FLOW',      label: 'Flow',      blurb: 'How money moves through time' },
  { id: 'MOMENTUM',  label: 'Momentum',  blurb: 'How spending velocity changes' },
  { id: 'PATTERNS',  label: 'Patterns',  blurb: 'Recurring financial behaviour' },
  { id: 'ANOMALIES', label: 'Anomalies', blurb: 'Unexpected financial events' },
  { id: 'BALANCE',   label: 'Balance',   blurb: 'The overall trajectory' },
];

export const SCALES = [
  { id: 'QUARTER', label: 'Quarter', days: 90 },
  { id: 'MONTH',   label: 'Month',   days: 30 },
  { id: 'WEEK',    label: 'Week',    days: 7 },
  { id: 'DAY',     label: 'Day',     days: 1 },
];

const HALF_W = 11;          // world half-width of the field
const MAX_PROJECTION = 24;  // ghost stars in a projection pull

/* ─── Shaders ────────────────────────────────────────────────────────────── */

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

// Stars morph between the previous lens layout and the new one via uMorph.
// Visibility morphs on the same clock so a scale change reads as one motion.
const STAR_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform float uMorph;
uniform vec3  uCursor;
uniform float uCursorPower;
uniform vec3  uAnomalyPos[6];
uniform float uAnomalyStr[6];
uniform float uHighlightGroup;   // -1 = none; else group id to lift
uniform float uFocusIndex;       // -1 = none; else star index under cursor

attribute vec3  aFrom;
attribute vec3  aTo;
attribute float aVisFrom;
attribute float aVisTo;
attribute float aSize;
attribute float aSeed;
attribute vec3  aColor;
attribute float aIsAnomaly;
attribute float aIsRecurring;
attribute float aGroup;
attribute float aIndex;

varying vec3  vColor;
varying float vAlpha;
varying float vIsAnomaly;
varying float vIsRecurring;
varying float vFocus;
varying float vGroupLift;

void main(){
  // Ease the morph so the reorganisation settles rather than snapping.
  float m = uMorph * uMorph * (3.0 - 2.0 * uMorph);
  vec3 pos = mix(aFrom, aTo, m);
  float vis = mix(aVisFrom, aVisTo, m);

  // Idle breathing — the field is alive but holds its reading.
  pos.y += sin(uTime * 0.35 + aSeed * 6.28) * 0.06;
  pos.x += sin(uTime * 0.21 + aSeed * 3.14) * 0.03;

  // Anomalies bend the space around them.
  for (int i = 0; i < 6; i++) {
    vec3 d = pos - uAnomalyPos[i];
    float dl = length(d) + 0.001;
    pos += normalize(d) * (uAnomalyStr[i] * 0.35 / (dl * dl + 0.6));
  }

  // The pointer is a gravity source.
  vec3 toC = uCursor - pos;
  toC.y *= 0.25;
  float d = length(toC);
  pos += normalize(toC + 0.0001) * (1.4 / (d * d + 1.2)) * uCursorPower * 0.35;

  vFocus = smoothstep(2.6, 0.4, d) * uCursorPower;
  // Siblings of the focused recurring group lift together.
  vGroupLift = (uHighlightGroup >= 0.0 && abs(aGroup - uHighlightGroup) < 0.5) ? 1.0 : 0.0;
  // The single focused star gets its own emphasis.
  float isFocus = (uFocusIndex >= 0.0 && abs(aIndex - uFocusIndex) < 0.5) ? 1.0 : 0.0;

  vColor = aColor;
  vAlpha = vis * (0.72 + vFocus * 0.28 + vGroupLift * 0.25);
  vIsAnomaly = aIsAnomaly;
  vIsRecurring = aIsRecurring;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = aSize + vFocus * 6.0 + vGroupLift * 3.5 + isFocus * 7.0;
  gl_PointSize = sz * vis * uDpr * (280.0 / -mv.z);
}
`;

const STAR_FRAG = /* glsl */`
uniform float uTime;
varying vec3  vColor;
varying float vAlpha;
varying float vIsAnomaly;
varying float vIsRecurring;
varying float vFocus;
varying float vGroupLift;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float rr = sqrt(r2);
  float core = exp(-r2 * 5.5);
  float halo = exp(-r2 * 1.5) * 0.35;
  vec3 col = vColor * (core * 3.2 + halo * 1.3);
  float alpha = vAlpha * (core * 1.15 + halo * 0.7);

  if (vIsAnomaly > 0.5) {
    float ring = smoothstep(0.62, 0.88, rr) * (1.0 - smoothstep(0.88, 1.0, rr));
    float pulse = 0.5 + 0.5 * sin(uTime * 2.8);
    col += vec3(1.0, 0.55, 0.35) * ring * (0.9 + 0.6 * pulse);
    alpha = max(alpha, ring * 0.9 * vAlpha);
  }
  if (vIsRecurring > 0.5) {
    float edge = smoothstep(0.55, 0.9, rr) * (1.0 - smoothstep(0.9, 1.0, rr));
    col += vec3(0.15, 0.85, 1.0) * edge * (0.6 + vGroupLift * 1.1);
  }
  col += vColor * vFocus * 0.7;
  gl_FragColor = vec4(col, alpha);
}
`;

// Projection ghosts — future occurrences of a recurring group.
const PROJ_VERT = /* glsl */`
uniform float uTime;
uniform float uDpr;
uniform vec3  uOrigin;
uniform vec3  uDir;
uniform float uCount;     // how many ghosts are live (0..MAX)
uniform float uSpacing;
attribute float aIdx;
varying float vFade;
void main(){
  float live = step(aIdx, uCount - 0.5);
  // Logarithmic spacing — further futures compress, like distance.
  float t = log(1.0 + aIdx) / log(1.0 + ${MAX_PROJECTION}.0);
  vec3 pos = uOrigin + uDir * (t * uSpacing * ${MAX_PROJECTION}.0);
  pos.y += sin(uTime * 1.2 + aIdx * 0.7) * 0.08;
  vFade = live * (1.0 - t * 0.72);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (7.0 - t * 3.4) * live * uDpr * (280.0 / -mv.z);
}
`;
const PROJ_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uTime;
varying float vFade;
void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 4.0);
  float ring = smoothstep(0.55, 0.85, sqrt(r2)) * (1.0 - smoothstep(0.85, 1.0, sqrt(r2)));
  vec3 col = uColor * (core * 1.6 + ring * 1.2);
  gl_FragColor = vec4(col, (core * 0.75 + ring * 0.8) * vFade);
}
`;

const LINE_VERT = /* glsl */`
attribute float aSeed;
varying float vSeed;
void main(){
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const LINE_FRAG = /* glsl */`
uniform vec3  uColor;
uniform float uTime;
uniform float uOpacity;
varying float vSeed;
void main(){
  float pulse = 0.55 + 0.45 * sin(uTime * 1.6 + vSeed * 6.28);
  gl_FragColor = vec4(uColor * (0.65 + 0.35 * pulse), (0.5 + 0.3 * pulse) * uOpacity);
}
`;

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
  vDisp = disp;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p + normal * disp, 1.0);
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
  base += uCoreHot * smoothstep(0.02, 0.09, vDisp) * 0.55;
  vec3 col = base * (0.55 + 0.45 * ndv) + uFresnelCol * fresnel * (1.3 + 0.4 * sin(uTime * 1.4));
  gl_FragColor = vec4(col, 1.0);
}
`;

// Gravity well = a gauge. The filled arc is the category's share of spend.
const WELL_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const WELL_FRAG = /* glsl */`
#define PI 3.14159265
uniform vec3  uColor;
uniform float uTime;
uniform float uShare;
uniform float uOpacity;
varying vec2  vUv;
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float a01 = fract((atan(c.x, c.y)) / (2.0 * PI) + 1.0);

  float track  = smoothstep(0.60, 0.635, r) * (1.0 - smoothstep(0.695, 0.73, r));
  float filled = step(a01, uShare);
  float head   = smoothstep(0.02, 0.0, abs(a01 - uShare)) * track;

  float tphase = fract(a01 * 10.0);
  float ticks  = smoothstep(0.06, 0.0, min(tphase, 1.0 - tphase))
               * smoothstep(0.72, 0.745, r) * (1.0 - smoothstep(0.79, 0.815, r));

  float basin  = exp(-pow(r, 2.0) * 3.2) * 0.30;
  float infall = (sin(r * 16.0 - uTime * 0.9) * 0.5 + 0.5) * smoothstep(0.60, 0.20, r) * 0.10;

  vec3 col = uColor * (track * (filled * 0.85 + 0.10) + head * 1.6 + ticks * 0.45 + basin + infall);
  float alpha = track * (filled * 0.85 + 0.14) + head * 0.9 + ticks * 0.4 + basin * 0.85 + infall;
  gl_FragColor = vec4(col, alpha * uOpacity);
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
  float h = hash21(id); if(h < 0.987) return 0.0;
  float s = smoothstep(0.06, 0.0, length(g)) * (h - 0.987) * 77.0;
  return s * (0.6 + 0.4 * sin(uTime * (1.0 + h*4.0) + h * 20.0));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec3 col = vec3(0.005, 0.007, 0.016);
  col += uNebulaA * pow(snoise(vec3(uv*1.3, uTime*0.025))*0.5 + 0.5, 2.8) * 0.11;
  col += uNebulaB * pow(snoise(vec3(uv*2.6 + 8.0, uTime*0.018))*0.5 + 0.5, 3.5) * 0.075;
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
  col.rgb *= clamp(1.0 - dot(v,v) * 1.15, 0.32, 1.0);
  col.rgb += (hash(vUv * uRes + uTime) - 0.5) * 0.018;
  col.rgb *= 1.0 - 0.035 * step(0.5, fract(gl_FragCoord.y * 0.5));
  gl_FragColor = col;
}
`;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function dayNumber(dateStr) {
  // days since epoch — safe integer ordering without timezone drift
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Build every derived fact the lenses need. Runs once per transaction set. */
export function deriveField(transactions, netBalance, incomeTotal) {
  const spend = (transactions || []).filter(
    t => (t.type || 'expense') !== 'income' && Math.abs(Number(t.amount) || 0) > 0 && t.date);
  if (!spend.length) return null;

  const palette = chart.categorical.dark;

  // Categories: top 6 by spend, everything else folded into Other.
  const totals = new Map();
  spend.forEach(t => {
    const n = t.category?.name || 'Uncategorized';
    totals.set(n, (totals.get(n) || 0) + Math.abs(Number(t.amount) || 0));
  });
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const catList = [...ranked.slice(0, 6).map(([n]) => n), 'Other'];
  const catIndex = new Map(catList.map((n, i) => [n, i]));
  const catColors = catList.map((_, i) => new THREE.Color(palette[i % palette.length]));
  const anchors = catList.map((_, i) => {
    const a = (i / catList.length) * Math.PI * 2 - Math.PI / 2;
    return new THREE.Vector3(Math.cos(a) * 10.5, 0, Math.sin(a) * 10.5);
  });

  const maxAmt = Math.max(...spend.map(t => Math.abs(Number(t.amount) || 0)), 1);

  // Per-category medians drive the anomaly test and its explanation.
  const byCat = new Map();
  spend.forEach(t => {
    const i = catIndex.get(t.category?.name) ?? catIndex.get('Other');
    if (!byCat.has(i)) byCat.set(i, []);
    byCat.get(i).push(Math.abs(Number(t.amount) || 0));
  });
  const catMedian = new Map();
  byCat.forEach((amts, i) => catMedian.set(i, median(amts)));

  // Daily aggregates → spending velocity per day.
  const dayTotals = new Map();
  spend.forEach(t => {
    const dn = dayNumber(t.date);
    dayTotals.set(dn, (dayTotals.get(dn) || 0) + Math.abs(Number(t.amount) || 0));
  });
  const dayNums = [...dayTotals.keys()].sort((a, b) => a - b);
  const minDay = dayNums[0], maxDay = dayNums[dayNums.length - 1];
  const dayVelocity = new Map();
  let maxVel = 1;
  dayNums.forEach((dn, i) => {
    const prev = i > 0 ? (dayTotals.get(dayNums[i - 1]) || 0) : 0;
    const v = Math.abs((dayTotals.get(dn) || 0) - prev);
    dayVelocity.set(dn, v);
    if (v > maxVel) maxVel = v;
  });

  // Cumulative net across the whole span (income spread evenly per day).
  const spanDays = Math.max(maxDay - minDay + 1, 1);
  const perDayIncome = (incomeTotal || 0) / spanDays;
  const cumNet = new Map();
  let running = 0;
  for (let dn = minDay; dn <= maxDay; dn++) {
    running += perDayIncome - (dayTotals.get(dn) || 0);
    cumNet.set(dn, running);
  }
  const maxAbsCum = Math.max(...[...cumNet.values()].map(Math.abs), 1);

  // Stars.
  const stars = spend.map((t, i) => {
    const name = t.category?.name || 'Uncategorized';
    const catIdx = catIndex.get(name) ?? catIndex.get('Other');
    const amt = Math.abs(Number(t.amount) || 0);
    const dn = dayNumber(t.date);
    const seed = hash01(`${t.date}|${amt}|${i}`);
    const seed2 = hash01(`b${i}|${amt}`);
    const seed3 = hash01(`c${t.date}|${i}`);
    const med = catMedian.get(catIdx) || amt;
    const ratio = med > 0 ? amt / med : 1;
    return {
      i, catIdx, catName: name, amt, date: t.date, dayNum: dn,
      description: t.description || '',
      seed, seed2, seed3,
      // Gravity-lens orbital placement
      orbR: 0.55 + (Math.log10(amt + 1) / Math.log10(maxAmt + 1)) * 2.8,
      orbA: ((dn - minDay) / spanDays) * Math.PI * 2 * 1.7 + seed * 0.8,
      yLocal: ((dn - minDay) / spanDays) * 1.6 - 0.8,
      logAmtNorm: Math.log10(amt + 1) / Math.log10(maxAmt + 1),
      velocityNorm: (dayVelocity.get(dn) || 0) / maxVel,
      cumNetNorm: (cumNet.get(dn) || 0) / maxAbsCum,
      isAnomaly: ratio > 3.0,
      anomalyRatio: ratio,
      catMedian: med,
      groupId: -1, groupRank: -1, groupPos: 0, groupCount: 0, groupCenter: 0,
      color: catColors[catIdx],
    };
  });

  // Recurring detection — per category, cluster amounts within 10%.
  const groupsByCat = new Map();
  stars.forEach(s => {
    if (!groupsByCat.has(s.catIdx)) groupsByCat.set(s.catIdx, []);
    const gs = groupsByCat.get(s.catIdx);
    const hit = gs.find(g => Math.abs(g.center - s.amt) / g.center < 0.10);
    if (hit) {
      hit.members.push(s);
      hit.center = hit.members.reduce((a, m) => a + m.amt, 0) / hit.members.length;
    } else {
      gs.push({ center: s.amt, members: [s] });
    }
  });
  const recurringGroups = [];
  groupsByCat.forEach((gs) => gs.forEach(g => { if (g.members.length >= 3) recurringGroups.push(g); }));
  recurringGroups.sort((a, b) => b.center * b.members.length - a.center * a.members.length);
  recurringGroups.forEach((g, gi) => {
    g.id = gi;
    g.members.sort((a, b) => a.dayNum - b.dayNum);
    // Median gap between occurrences → the cadence we project forward with.
    const gaps = [];
    for (let k = 1; k < g.members.length; k++) gaps.push(g.members[k].dayNum - g.members[k - 1].dayNum);
    g.periodDays = Math.max(1, Math.round(median(gaps) || 30));
    g.catIdx = g.members[0].catIdx;
    g.label = g.members[0].catName;
    g.members.forEach((m, k) => {
      m.groupId = gi; m.groupRank = gi; m.groupPos = k;
      m.groupCount = g.members.length; m.groupCenter = g.center;
      m.isRecurring = true;
    });
  });

  return {
    stars, catList, catIndex, catColors, anchors, palette,
    recurringGroups, catMedian,
    minDay, maxDay, spanDays,
    netBalance, incomeTotal,
    totalSpent: spend.reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0),
  };
}

/** Positions every star under a given lens. Pure — no THREE, no side effects. */
function lensPosition(lens, s, ctx) {
  const { anchors, nCats, windowStart, windowSpan } = ctx;
  const frac = windowSpan > 0 ? Math.min(Math.max((s.dayNum - windowStart) / windowSpan, 0), 1) : 0.5;

  switch (lens) {
    case 'FLOW': {
      return [
        -HALF_W + frac * 2 * HALF_W,
        0.3 + s.logAmtNorm * 4.2,
        (s.catIdx - (nCats - 1) / 2) * 1.7 + (s.seed - 0.5) * 0.5,
      ];
    }
    case 'MOMENTUM': {
      const ang = frac * Math.PI * 4;
      const rad = 2.2 + s.velocityNorm * 9.5;
      return [Math.cos(ang) * rad, s.logAmtNorm * 2.4, Math.sin(ang) * rad];
    }
    case 'PATTERNS': {
      if (s.groupId >= 0) {
        const ringR = 3.2 + s.groupRank * 2.3;
        const ang = (s.groupPos / Math.max(s.groupCount, 1)) * Math.PI * 2;
        return [Math.cos(ang) * ringR, 0.2 + s.groupRank * 0.15, Math.sin(ang) * ringR];
      }
      const ang = s.seed * Math.PI * 2;
      const rad = 15 + s.seed2 * 4;
      return [Math.cos(ang) * rad, (s.seed2 - 0.5) * 3, Math.sin(ang) * rad];
    }
    case 'ANOMALIES': {
      if (s.isAnomaly) {
        const ang = s.seed * Math.PI * 2;
        const rad = 8.5 + Math.min(s.anomalyRatio, 8) * 0.8;
        return [Math.cos(ang) * rad, 1.5 + s.seed2 * 2.5, Math.sin(ang) * rad];
      }
      const ang = s.seed * Math.PI * 2, ph = s.seed2 * Math.PI;
      const rad = 1.4 + s.seed3 * 1.4;
      return [Math.cos(ang) * Math.sin(ph) * rad, Math.cos(ph) * rad * 0.6, Math.sin(ang) * Math.sin(ph) * rad];
    }
    case 'BALANCE': {
      return [-HALF_W + frac * 2 * HALF_W, s.cumNetNorm * 4.6, (s.seed - 0.5) * 1.2];
    }
    case 'GRAVITY':
    default: {
      const a = anchors[s.catIdx];
      return [a.x + s.orbR * Math.cos(s.orbA), s.yLocal, a.z + s.orbR * Math.sin(s.orbA)];
    }
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function FinancialConstellation({
  field,                 // output of deriveField
  lens = 'GRAVITY',
  scale = 'MONTH',
  onFocusChange,
  onProjectionChange,
  height,
}) {
  const wrapRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const apiRef = useRef(null);

  const onFocusRef = useRef(onFocusChange);   onFocusRef.current = onFocusChange;
  const onProjRef  = useRef(onProjectionChange); onProjRef.current = onProjectionChange;

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

    const N = field.stars.length;
    const nCats = field.catList.length;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    Object.assign(renderer.domElement.style, {
      display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab', outline: 'none',
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

    /* Sun — the net position */
    const isPositive = field.netBalance >= 0;
    const sunR = Math.min(0.55 + Math.log10(Math.abs(field.netBalance) + 10) * 0.16, 1.35);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uTurbulence: { value: 0.5 },
        uCoreCold: { value: new THREE.Color(isPositive ? accents.mint : accents.red).multiplyScalar(0.4) },
        uCoreHot: { value: new THREE.Color(isPositive ? accents.cyan : accents.amber) },
        uFresnelCol: { value: new THREE.Color(accents.violet).multiplyScalar(1.2) },
      },
      vertexShader: SUN_VERT, fragmentShader: SUN_FRAG,
    });
    const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(sunR, 5), sunMat);
    scene.add(sun);

    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(isPositive ? accents.cyan : accents.amber) }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){ float d=length(vUv-0.5);
          gl_FragColor=vec4(uColor, smoothstep(0.5,0.0,d)*(0.18+0.07*sin(uTime*1.4))*0.32); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const corona = new THREE.Mesh(new THREE.PlaneGeometry(sunR * 3.6, sunR * 3.6), coronaMat);
    scene.add(corona);

    /* Category wells + spokes + labels — prominent only under GRAVITY */
    const catTotals = field.catList.map((_, i) =>
      field.stars.filter(s => s.catIdx === i).reduce((a, s) => a + s.amt, 0));
    const grand = catTotals.reduce((a, b) => a + b, 0) || 1;

    const wells = [], spokes = [], catLabels = [];
    field.anchors.forEach((anchor, i) => {
      const share = catTotals[i] / grand;

      const wellMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: field.catColors[i] }, uTime: { value: 0 },
          uShare: { value: share }, uOpacity: { value: 1 },
        },
        vertexShader: WELL_VERT, fragmentShader: WELL_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const wellGeom = new THREE.PlaneGeometry(6.2, 6.2);
      const well = new THREE.Mesh(wellGeom, wellMat);
      well.position.copy(anchor);
      well.rotation.x = -Math.PI / 2;
      scene.add(well);
      wells.push({ mesh: well, mat: wellMat, geom: wellGeom });

      const spokeGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), anchor.clone()]);
      const spokeMat = new THREE.LineBasicMaterial({
        color: field.catColors[i], transparent: true,
        opacity: 0.08 + share * 0.42, depthWrite: false,
      });
      const spoke = new THREE.Line(spokeGeom, spokeMat);
      spoke.userData.base = 0.08 + share * 0.42;
      scene.add(spoke);
      spokes.push({ mesh: spoke, mat: spokeMat, geom: spokeGeom });

      // Category label plate
      const c = field.catColors[i];
      const lc = document.createElement('canvas');
      lc.width = 768; lc.height = 176;
      const lg = lc.getContext('2d');
      lg.textBaseline = 'middle'; lg.textAlign = 'center';
      lg.font = '600 46px "SF Mono", "JetBrains Mono", ui-monospace, monospace';
      lg.fillStyle = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0.96)`;
      lg.fillText(field.catList[i].toUpperCase().slice(0, 18), 384, 46);
      lg.font = '400 38px "SF Pro Display", -apple-system, sans-serif';
      lg.fillStyle = 'rgba(232, 240, 252, 0.88)';
      lg.fillText(moneySmart(catTotals[i]), 384, 104);
      lg.font = '500 26px "SF Mono", ui-monospace, monospace';
      lg.fillStyle = 'rgba(180, 200, 235, 0.6)';
      lg.fillText(`${(share * 100).toFixed(0)}% OF SPEND`, 384, 148);
      const tex = new THREE.CanvasTexture(lc);
      tex.anisotropy = 8; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.19), labelMat);
      plate.position.copy(anchor); plate.position.y += 3.1;
      scene.add(plate);
      catLabels.push({ mesh: plate, mat: labelMat, tex, geom: plate.geometry });
    });

    /* Stars */
    const positions   = new Float32Array(N * 3);
    const aFrom       = new Float32Array(N * 3);
    const aTo         = new Float32Array(N * 3);
    const aVisFrom    = new Float32Array(N);
    const aVisTo      = new Float32Array(N);
    const aSize       = new Float32Array(N);
    const aSeed       = new Float32Array(N);
    const aColor      = new Float32Array(N * 3);
    const aIsAnomaly  = new Float32Array(N);
    const aIsRecurring= new Float32Array(N);
    const aGroup      = new Float32Array(N);
    const aIndex      = new Float32Array(N);

    field.stars.forEach((s, i) => {
      aSize[i] = 5.5 + Math.log10(s.amt + 1) * 3.0;
      aSeed[i] = s.seed;
      aColor[i * 3] = s.color.r; aColor[i * 3 + 1] = s.color.g; aColor[i * 3 + 2] = s.color.b;
      aIsAnomaly[i] = s.isAnomaly ? 1 : 0;
      aIsRecurring[i] = s.groupId >= 0 ? 1 : 0;
      aGroup[i] = s.groupId;
      aIndex[i] = i;
    });

    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeom.setAttribute('aFrom', new THREE.BufferAttribute(aFrom, 3));
    starGeom.setAttribute('aTo', new THREE.BufferAttribute(aTo, 3));
    starGeom.setAttribute('aVisFrom', new THREE.BufferAttribute(aVisFrom, 1));
    starGeom.setAttribute('aVisTo', new THREE.BufferAttribute(aVisTo, 1));
    starGeom.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    starGeom.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    starGeom.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    starGeom.setAttribute('aIsAnomaly', new THREE.BufferAttribute(aIsAnomaly, 1));
    starGeom.setAttribute('aIsRecurring', new THREE.BufferAttribute(aIsRecurring, 1));
    starGeom.setAttribute('aGroup', new THREE.BufferAttribute(aGroup, 1));
    starGeom.setAttribute('aIndex', new THREE.BufferAttribute(aIndex, 1));
    starGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

    const uAnomalyPos = Array.from({ length: 6 }, () => new THREE.Vector3());
    const uAnomalyStr = new Float32Array(6);

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uDpr: { value: dpr }, uMorph: { value: 1 },
        uCursor: { value: new THREE.Vector3() }, uCursorPower: { value: 0 },
        uAnomalyPos: { value: uAnomalyPos }, uAnomalyStr: { value: uAnomalyStr },
        uHighlightGroup: { value: -1 }, uFocusIndex: { value: -1 },
      },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeom, starMat);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    /* Recurring constellation lines — one per group, rebuilt on lens change */
    const groupLines = field.recurringGroups.map((g, gi) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(g.members.length * 3), 3));
      const seeds = new Float32Array(g.members.length); seeds.fill(gi * 0.29);
      geom.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: field.catColors[g.catIdx].clone().multiplyScalar(1.3) },
          uTime: { value: 0 }, uOpacity: { value: 1 },
        },
        vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geom, mat);
      line.frustumCulled = false;
      scene.add(line);
      return { line, geom, mat, group: g };
    });

    /* Balance trajectory — a path through the cumulative net, BALANCE lens only */
    const balGeom = new THREE.BufferGeometry();
    const balCount = Math.min(field.spanDays, 400);
    balGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(balCount * 3), 3));
    balGeom.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(balCount), 1));
    balGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
    const balMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isPositive ? accents.mint : accents.red) },
        uTime: { value: 0 }, uOpacity: { value: 0 },
      },
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const balLine = new THREE.Line(balGeom, balMat);
    balLine.frustumCulled = false;
    scene.add(balLine);

    /* Projection ghosts */
    const projGeom = new THREE.BufferGeometry();
    projGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PROJECTION * 3), 3));
    const projIdx = new Float32Array(MAX_PROJECTION);
    for (let i = 0; i < MAX_PROJECTION; i++) projIdx[i] = i;
    projGeom.setAttribute('aIdx', new THREE.BufferAttribute(projIdx, 1));
    projGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    const projMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uDpr: { value: dpr },
        uOrigin: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(1, 0, 0) },
        uCount: { value: 0 }, uSpacing: { value: 0.9 },
        uColor: { value: new THREE.Color(accents.cyan) },
      },
      vertexShader: PROJ_VERT, fragmentShader: PROJ_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const projPoints = new THREE.Points(projGeom, projMat);
    projPoints.frustumCulled = false;
    scene.add(projPoints);

    // Projection trail line
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    trailGeom.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(2), 1));
    trailGeom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
    const trailMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(accents.cyan) }, uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const trailLine = new THREE.Line(trailGeom, trailMat);
    trailLine.frustumCulled = false;
    scene.add(trailLine);

    /* Focus receipt — canvas plane anchored in world space */
    const fc = document.createElement('canvas');
    fc.width = 560; fc.height = 250;
    const fctx = fc.getContext('2d');
    const focusTex = new THREE.CanvasTexture(fc);
    focusTex.anisotropy = 8; focusTex.minFilter = THREE.LinearFilter;
    const focusMat = new THREE.MeshBasicMaterial({ map: focusTex, transparent: true, depthWrite: false, opacity: 0 });
    const focusMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.74), focusMat);
    focusMesh.visible = false;
    scene.add(focusMesh);

    function drawReceipt(s) {
      const c = fctx;
      c.clearRect(0, 0, 560, 250);
      c.strokeStyle = 'rgba(100,210,255,0.5)'; c.lineWidth = 1.5;
      const b = 20;
      c.beginPath();
      [[8,8,b,8],[8,8,8,b],[552,8,552-b,8],[552,8,552,b],
       [8,242,b,242],[8,242,8,242-b],[552,242,552-b,242],[552,242,552,242-b]]
        .forEach(([x1,y1,x2,y2]) => { c.moveTo(x1,y1); c.lineTo(x2,y2); });
      c.stroke();

      c.textBaseline = 'top'; c.textAlign = 'left';
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = `rgba(${Math.round(s.color.r*255)}, ${Math.round(s.color.g*255)}, ${Math.round(s.color.b*255)}, 0.92)`;
      c.fillText(`▸ ${s.catName.toUpperCase()}`, 24, 18);

      c.font = '300 54px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(s.amt), 22, 40);

      c.font = '500 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.7)';
      c.fillText(s.date, 24, 112);
      if (s.description) {
        c.font = '400 13px "SF Pro Text", -apple-system, sans-serif';
        c.fillStyle = 'rgba(180, 200, 235, 0.5)';
        c.fillText(s.description.slice(0, 46), 24, 134);
      }

      // Why it is unusual — the anomaly explains itself.
      let y = 166;
      if (s.isAnomaly) {
        c.fillStyle = 'rgba(255, 159, 10, 0.14)';
        c.fillRect(22, y - 4, 516, 30);
        c.font = '600 15px "SF Mono", ui-monospace, monospace';
        c.fillStyle = '#FF9F0A';
        c.fillText(`${s.anomalyRatio.toFixed(1)}× YOUR USUAL ${s.catName.toUpperCase().slice(0, 14)} SPEND`, 30, y + 3);
        y += 38;
      }
      if (s.groupId >= 0) {
        c.font = '600 13px "SF Mono", ui-monospace, monospace';
        c.fillStyle = 'rgba(100, 210, 255, 0.9)';
        c.fillText(`RECURRING · ${s.groupCount} SEEN · DRAG OUTWARD TO PROJECT`, 24, y + 4);
      }
      focusTex.needsUpdate = true;
    }

    /* Projection readout — its own plate that trails the ghosts */
    const pc = document.createElement('canvas');
    pc.width = 620; pc.height = 190;
    const pctx = pc.getContext('2d');
    const projTex = new THREE.CanvasTexture(pc);
    projTex.anisotropy = 8; projTex.minFilter = THREE.LinearFilter;
    const projLabelMat = new THREE.MeshBasicMaterial({ map: projTex, transparent: true, depthWrite: false, opacity: 0 });
    const projLabel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.41), projLabelMat);
    projLabel.visible = false;
    scene.add(projLabel);

    function drawProjection(group, periods, total) {
      const c = pctx;
      c.clearRect(0, 0, 620, 190);
      c.strokeStyle = 'rgba(100,210,255,0.55)'; c.lineWidth = 1.5;
      const b = 22;
      c.beginPath();
      [[8,8,b,8],[8,8,8,b],[612,8,612-b,8],[612,8,612,b],
       [8,182,b,182],[8,182,8,182-b],[612,182,612-b,182],[612,182,612,182-b]]
        .forEach(([x1,y1,x2,y2]) => { c.moveTo(x1,y1); c.lineTo(x2,y2); });
      c.stroke();

      c.textBaseline = 'top'; c.textAlign = 'left';
      c.font = '600 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(100,210,255,0.95)';
      c.fillText('▸ PROJECTION', 26, 18);

      c.font = '500 15px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(200, 216, 240, 0.85)';
      const every = group.periodDays === 1 ? 'DAY'
        : group.periodDays <= 8 ? `${group.periodDays} DAYS`
        : group.periodDays <= 45 ? 'MONTH' : `${group.periodDays} DAYS`;
      c.fillText(`${group.label.toUpperCase().slice(0,16)} · ${moneySmart(group.center)} / ${every}`, 26, 44);

      c.font = '300 52px "SF Pro Display", -apple-system, sans-serif';
      c.fillStyle = '#eef2fa';
      c.fillText(moneySmart(total), 24, 76);

      c.font = '500 14px "SF Mono", ui-monospace, monospace';
      c.fillStyle = 'rgba(180, 200, 235, 0.65)';
      const spanDays = periods * group.periodDays;
      const spanTxt = spanDays >= 365 ? `${(spanDays / 365).toFixed(1)} YEARS`
        : spanDays >= 60 ? `${Math.round(spanDays / 30)} MONTHS` : `${spanDays} DAYS`;
      c.fillText(`OVER THE NEXT ${spanTxt}  ·  ${periods} OCCURRENCES`, 26, 146);
      projTex.needsUpdate = true;
    }

    /* ── Lens / scale state ─────────────────────────────────────────────── */
    const cur = new Float32Array(N * 3);   // live positions, for picking
    let morph = 1, morphing = false;
    let activeLens = lens, activeScale = scale;
    let wellOpacity = 1, wellOpacityTarget = 1;
    let balOpacity = 0, balOpacityTarget = 0;
    let groupLineTarget = 1;

    function windowFor(scaleId) {
      const s = SCALES.find(x => x.id === scaleId) || SCALES[1];
      const start = field.maxDay - (s.days - 1);
      return { start, span: Math.max(s.days - 1, 1) };
    }

    function applyLayout(lensId, scaleId, immediate) {
      const { start, span } = windowFor(scaleId);
      const ctx = { anchors: field.anchors, nCats, windowStart: start, windowSpan: span };
      // Current becomes the "from" so a switch mid-morph stays continuous.
      for (let i = 0; i < N * 3; i++) aFrom[i] = cur[i];
      for (let i = 0; i < N; i++) aVisFrom[i] = aVisTo[i];

      field.stars.forEach((s, i) => {
        const p = lensPosition(lensId, s, ctx);
        aTo[i * 3] = p[0]; aTo[i * 3 + 1] = p[1]; aTo[i * 3 + 2] = p[2];
        aVisTo[i] = s.dayNum >= start ? 1 : 0;
      });

      starGeom.attributes.aFrom.needsUpdate = true;
      starGeom.attributes.aTo.needsUpdate = true;
      starGeom.attributes.aVisFrom.needsUpdate = true;
      starGeom.attributes.aVisTo.needsUpdate = true;

      morph = immediate ? 1 : 0;
      morphing = !immediate;
      starMat.uniforms.uMorph.value = morph;

      // Which scaffolding belongs to this lens
      wellOpacityTarget = lensId === 'GRAVITY' ? 1 : 0.06;
      balOpacityTarget  = lensId === 'BALANCE' ? 0.85 : 0;
      groupLineTarget   = (lensId === 'PATTERNS' || lensId === 'GRAVITY') ? 1 : 0.12;

      activeLens = lensId; activeScale = scaleId;
      if (immediate) writeLivePositions(1);
      refreshAnomalyUniforms();
    }

    // Interpolate from→to into `cur` for CPU-side picking and line rebuilds.
    function writeLivePositions(m) {
      const e = m * m * (3 - 2 * m);
      for (let i = 0; i < N * 3; i++) cur[i] = aFrom[i] + (aTo[i] - aFrom[i]) * e;
      // Recurring lines follow their members
      groupLines.forEach(({ geom, group }) => {
        const arr = geom.attributes.position.array;
        group.members.forEach((m2, k) => {
          arr[k * 3] = cur[m2.i * 3];
          arr[k * 3 + 1] = cur[m2.i * 3 + 1];
          arr[k * 3 + 2] = cur[m2.i * 3 + 2];
        });
        geom.attributes.position.needsUpdate = true;
      });
      // Balance trajectory follows the cumulative path across the window
      if (balOpacity > 0.01) {
        const { start, span } = windowFor(activeScale);
        const arr = balGeom.attributes.position.array;
        for (let k = 0; k < balCount; k++) {
          const f = balCount > 1 ? k / (balCount - 1) : 0;
          const dn = Math.round(start + f * span);
          const nearest = field.stars.reduce((best, s) =>
            (best === null || Math.abs(s.dayNum - dn) < Math.abs(best.dayNum - dn)) ? s : best, null);
          arr[k * 3] = -HALF_W + f * 2 * HALF_W;
          arr[k * 3 + 1] = (nearest ? nearest.cumNetNorm : 0) * 4.6;
          arr[k * 3 + 2] = 0;
        }
        balGeom.attributes.position.needsUpdate = true;
      }
    }

    function refreshAnomalyUniforms() {
      const list = field.stars.filter(s => s.isAnomaly).slice(0, 6);
      for (let i = 0; i < 6; i++) {
        if (i < list.length) {
          const idx = list[i].i;
          uAnomalyPos[i].set(cur[idx * 3], cur[idx * 3 + 1], cur[idx * 3 + 2]);
          uAnomalyStr[i] = Math.log10(list[i].amt + 1) * 0.35;
        } else {
          uAnomalyPos[i].set(999, 999, 999);
          uAnomalyStr[i] = 0;
        }
      }
    }

    // Initial layout, applied instantly.
    for (let i = 0; i < N; i++) aVisTo[i] = 1;
    applyLayout(lens, scale, true);
    applyLayout(lens, scale, true);   // second pass seeds `from` == `to`

    /* ── Interaction ─────────────────────────────────────────────────────── */
    let dragging = false, lastX = 0, lastY = 0, pointerX = 0, pointerY = 0;
    let cursorActive = false;
    let focusedStar = null;
    // Projection pull
    let projecting = false, projStartX = 0, projStartY = 0, projGroup = null;
    let projAmount = 0, projAmountTarget = 0;

    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    function worldCursor(cx, cy) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((cx - r.left) / r.width) * 2 - 1;
      ndc.y = -((cy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(ground, hit) ? hit : null;
    }

    function updateFocus() {
      const p = worldCursor(pointerX, pointerY);
      if (!p) return;
      starMat.uniforms.uCursor.value.copy(p);
      let best = null, bestD = Infinity;
      for (let i = 0; i < N; i++) {
        if (aVisTo[i] < 0.5) continue;
        const dx = cur[i * 3] - p.x, dz = cur[i * 3 + 2] - p.z;
        const d = dx * dx + dz * dz;
        if (d < bestD) { bestD = d; best = field.stars[i]; }
      }
      const R = 1.5;
      if (best && bestD < R * R) {
        if (focusedStar !== best) {
          focusedStar = best;
          drawReceipt(best);
          focusMesh.visible = true;
          starMat.uniforms.uFocusIndex.value = best.i;
          starMat.uniforms.uHighlightGroup.value = best.groupId >= 0 ? best.groupId : -1;
          onFocusRef.current?.({
            amount: best.amt, category: best.catName, date: best.date,
            description: best.description, isAnomaly: best.isAnomaly,
            anomalyRatio: best.anomalyRatio, isRecurring: best.groupId >= 0,
            occurrences: best.groupCount,
          });
        }
        focusMesh.position.set(cur[best.i * 3] + 2.6, cur[best.i * 3 + 1] + 1.5, cur[best.i * 3 + 2]);
      } else if (focusedStar) {
        focusedStar = null;
        focusMesh.visible = false;
        starMat.uniforms.uFocusIndex.value = -1;
        if (!projecting) starMat.uniforms.uHighlightGroup.value = -1;
        onFocusRef.current?.(null);
      }
    }

    const onPointerDown = (e) => {
      renderer.domElement.focus?.();
      // A focused recurring star turns the drag into a projection pull.
      if (focusedStar && focusedStar.groupId >= 0) {
        projecting = true;
        projGroup = field.recurringGroups[focusedStar.groupId];
        projStartX = e.clientX; projStartY = e.clientY;
        projAmountTarget = 0;
        const idx = focusedStar.i;
        projMat.uniforms.uOrigin.value.set(cur[idx * 3], cur[idx * 3 + 1], cur[idx * 3 + 2]);
        const dir = new THREE.Vector3(cur[idx * 3], cur[idx * 3 + 1] + 0.6, cur[idx * 3 + 2]);
        if (dir.lengthSq() < 0.001) dir.set(1, 0.3, 0);
        dir.normalize();
        projMat.uniforms.uDir.value.copy(dir);
        projMat.uniforms.uColor.value.copy(field.catColors[projGroup.catIdx]).multiplyScalar(1.25);
        trailMat.uniforms.uColor.value.copy(projMat.uniforms.uColor.value);
        projPoints.visible = true; projLabel.visible = true;
        renderer.domElement.style.cursor = 'ew-resize';
        return;
      }
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      cursorActive = true;
      pointerX = e.clientX; pointerY = e.clientY;
      if (projecting) {
        const dx = e.clientX - projStartX, dy = e.clientY - projStartY;
        projAmountTarget = Math.min(Math.sqrt(dx * dx + dy * dy) / 260, 1);
        return;
      }
      if (dragging) {
        camTarget.azimuth -= (e.clientX - lastX) * 0.006;
        camTarget.polar = Math.max(0.4, Math.min(Math.PI - 0.4, camTarget.polar + (e.clientY - lastY) * 0.005));
        lastX = e.clientX; lastY = e.clientY;
      }
    };

    const endProjection = () => {
      projecting = false; projAmountTarget = 0;
      renderer.domElement.style.cursor = 'grab';
      onProjRef.current?.(null);
    };
    const onPointerUp = () => {
      if (projecting) endProjection();
      dragging = false;
      renderer.domElement.style.cursor = 'grab';
    };
    const onPointerLeave = () => {
      dragging = false; cursorActive = false;
      if (projecting) endProjection();
      if (focusedStar) {
        focusedStar = null; focusMesh.visible = false;
        starMat.uniforms.uFocusIndex.value = -1;
        starMat.uniforms.uHighlightGroup.value = -1;
        onFocusRef.current?.(null);
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      camTarget.distance = Math.max(9, Math.min(62, camTarget.distance + Math.sign(e.deltaY) * 1.8));
    };
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        camTarget.azimuth = 0.9; camTarget.polar = 1.05; camTarget.distance = 31;
        e.preventDefault();
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

    /* Post chain */
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

    /* Expose imperative controls so prop changes never rebuild the scene */
    apiRef.current = {
      setLens: (id) => { if (id !== activeLens) applyLayout(id, activeScale, false); },
      setScale: (id) => { if (id !== activeScale) applyLayout(activeLens, id, false); },
    };

    /* Loop */
    let raf = 0, running = true, tPrev = 0, t = 0;
    const loop = (now) => {
      if (!running) return;
      const dt = tPrev ? Math.min((now - tPrev) / 1000, 0.05) : 0.016;
      tPrev = now; t += dt;

      camState.azimuth  += (camTarget.azimuth  - camState.azimuth)  * 0.09;
      camState.polar    += (camTarget.polar    - camState.polar)    * 0.09;
      camState.distance += (camTarget.distance - camState.distance) * 0.09;
      if (!dragging && !projecting && !reduce) camTarget.azimuth += dt * 0.02;
      updateCamera();

      // Lens/scale morph
      if (morphing) {
        morph = Math.min(1, morph + dt * 0.9);
        starMat.uniforms.uMorph.value = morph;
        if (morph >= 1) { morphing = false; refreshAnomalyUniforms(); }
      }
      writeLivePositions(morph);

      // Scaffolding cross-fades follow the active lens
      wellOpacity += (wellOpacityTarget - wellOpacity) * 0.08;
      balOpacity  += (balOpacityTarget  - balOpacity)  * 0.08;
      wells.forEach(wl => { wl.mat.uniforms.uOpacity.value = wellOpacity; });
      spokes.forEach(sp => { sp.mat.opacity = sp.mesh.userData.base * wellOpacity; });
      catLabels.forEach(l => { l.mat.opacity = wellOpacity; l.mesh.lookAt(camera.position); });
      balMat.uniforms.uOpacity.value = balOpacity;
      groupLines.forEach(gl => {
        const lifted = starMat.uniforms.uHighlightGroup.value === gl.group.id;
        const target = lifted ? 1.5 : groupLineTarget;
        gl.mat.uniforms.uOpacity.value += (target - gl.mat.uniforms.uOpacity.value) * 0.12;
        gl.mat.uniforms.uTime.value = t;
      });

      // Projection pull
      projAmount += (projAmountTarget - projAmount) * 0.16;
      if (projAmount > 0.01 && projGroup) {
        const periods = Math.max(1, Math.round(projAmount * MAX_PROJECTION));
        projMat.uniforms.uCount.value = periods;
        projMat.uniforms.uSpacing.value = 0.62;
        const total = projGroup.center * periods;
        drawProjection(projGroup, periods, total);
        // Trail from the source star out to the furthest ghost
        const o = projMat.uniforms.uOrigin.value, d = projMat.uniforms.uDir.value;
        const far = Math.log(1 + periods - 1) / Math.log(1 + MAX_PROJECTION) * 0.62 * MAX_PROJECTION;
        const ta = trailGeom.attributes.position.array;
        ta[0] = o.x; ta[1] = o.y; ta[2] = o.z;
        ta[3] = o.x + d.x * far; ta[4] = o.y + d.y * far; ta[5] = o.z + d.z * far;
        trailGeom.attributes.position.needsUpdate = true;
        trailMat.uniforms.uOpacity.value = Math.min(projAmount * 1.4, 1);
        projLabel.position.set(o.x + d.x * (far + 2.4), o.y + d.y * (far + 2.4) + 1.1, o.z + d.z * (far + 2.4));
        projLabel.lookAt(camera.position);
        projLabelMat.opacity = Math.min(projAmount * 1.6, 1);
        projPoints.visible = true; projLabel.visible = true;
        onProjRef.current?.({
          label: projGroup.label, per: projGroup.center,
          periodDays: projGroup.periodDays, periods, total,
        });
      } else {
        projMat.uniforms.uCount.value = 0;
        trailMat.uniforms.uOpacity.value = 0;
        projLabelMat.opacity = 0;
        if (projAmount <= 0.01) {
          projPoints.visible = false; projLabel.visible = false;
          if (!projecting && projGroup) {
            // The pull has fully retracted. Emit the clear here rather than on
            // pointerup — during the decay the branch above keeps re-reporting
            // live values, which would immediately overwrite an earlier null.
            projGroup = null;
            onProjRef.current?.(null);
          }
        }
      }

      // Cursor gravity + focus
      if (cursorActive) {
        starMat.uniforms.uCursorPower.value += (1 - starMat.uniforms.uCursorPower.value) * 0.12;
        if (!projecting) updateFocus();
      } else {
        starMat.uniforms.uCursorPower.value *= 0.9;
      }
      focusMat.opacity += ((focusMesh.visible ? 1 : 0) - focusMat.opacity) * 0.16;
      if (focusMesh.visible) focusMesh.lookAt(camera.position);
      corona.lookAt(camera.position);

      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      skyMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;
      projMat.uniforms.uTime.value = t;
      trailMat.uniforms.uTime.value = t;
      balMat.uniforms.uTime.value = t;
      finalPass.uniforms.uTime.value = t;
      wells.forEach(wl => { wl.mat.uniforms.uTime.value = t; });

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
      [sunMat, coronaMat, skyMat, starMat, projMat, trailMat, balMat, focusMat, projLabelMat]
        .forEach(m => m.dispose());
      [sun.geometry, corona.geometry, starGeom, projGeom, trailGeom, balGeom,
       focusMesh.geometry, projLabel.geometry].forEach(g => g.dispose());
      wells.forEach(x => { x.mat.dispose(); x.geom.dispose(); });
      spokes.forEach(x => { x.mat.dispose(); x.geom.dispose(); });
      catLabels.forEach(x => { x.mat.dispose(); x.tex.dispose(); x.geom.dispose(); });
      groupLines.forEach(x => { x.mat.dispose(); x.geom.dispose(); });
      focusTex.dispose(); projTex.dispose();
    };
    // lens/scale are applied imperatively below — including them here would
    // tear down and rebuild the entire scene on every control change.
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
      aria-label={`Financial field. ${field.stars.length} transactions across ${field.catList.length} categories, viewed through the ${lens.toLowerCase()} lens at ${scale.toLowerCase()} scale.`}
      sx={{ position: 'relative', width: '100%', height: height || '100%', bgcolor: '#04050a', overflow: 'hidden' }}
    />
  );
}
