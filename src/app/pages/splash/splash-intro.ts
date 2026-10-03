// Smooth "hero -> bus -> logo" morph. Every shape is interpolated from a hero pose to a
// bus pose to the EXACT logo geometry, so the last frame is pixel-identical to the real logo
// (no fade, no blur, no cross-dissolve). Pure render(t): drive it from requestAnimationFrame.
const NS = 'http://www.w3.org/2000/svg';
type Row = number[];
interface Rect { k: 'r'; f: [string, string, string]; p: [Row, Row, Row]; d?: number }
interface Poly { k: 'p'; f: [string, string, string]; sc: [string, string, string]; sw: [number, number, number]; get: (i: number, t: number) => { P: Row; C: Row } }
type Item = Rect | Poly;

const N = '#151D48', R = '#DC2626', W = '#F8FAFC', L = '#E2E8F0', Y = '#FBBF24', T = '#0B1030', S = '#F5CBA7';
// timeline (ms)
export const T_FLY = 1700, U0 = 1700, U1 = 2300, V0 = 2750, END = 3350, DONE = END + 900; // END = logo takes over, DONE = last pop-art effect finished

/** One full turn of the real logo's `.logo-burst` (burstSlowSpin in splash.page.scss). */
export const BURST_SPIN_MS = 12000;

/** Rotation (deg) of the background rays on the intro clock. It advances at exactly the speed of the
 *  real logo's burstSlowSpin, and splash.page.ts starts that CSS spin at burstAngleAt(t) on the
 *  hand-off frame, so angle AND angular velocity are continuous across the swap. */
export const burstAngleAt = (t: number) => (t / BURST_SPIN_MS) * 360;

// rect row = x, y, w, h, r ; shapes that vanish shrink to a point (no opacity fades)
const H = (x: number, y: number): Row => [x, y, 0, 0, 0];

// hero head is a 5-point blob, the windshield a 5-point quad, the logo windshield the exact wavy path
const arc = (cx: number, cy: number, r: number) => {
  const A = [-150, -75, 0, 75, 150].map((d) => (d * Math.PI) / 180), pts: number[] = [], ctrl: number[] = [];
  A.forEach((a) => pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  for (let k = 0; k < 4; k++) { const m = (A[k] + A[k + 1]) / 2, q = r / Math.cos((A[k + 1] - A[k]) / 2); ctrl.push(cx + q * Math.cos(m), cy + q * Math.sin(m)); }
  ctrl.push((pts[8] + pts[0]) / 2, (pts[9] + pts[1]) / 2);
  return { pts, ctrl };
};
const HEAD = arc(55, -3, 15);
const WS1 = { pts: [43, -31, 67, -31, 91, -31, 91, -5, 43, -5], ctrl: [55, -31, 79, -31, 91, -18, 67, -5, 43, -18] };
const WS2 = { pts: [-31.875, -18.75, 0, -18.75, 31.875, -18.75, 26.25, -3.75, -26.25, -3.75], ctrl: [-18.75, -26.25, 18.75, -26.25, 29.0625, -11.25, 0, -11.25, -29.0625, -11.25] };

// Cape: 5 anchor points + 5 controls, resampled into 20 segments so it can ripple like a flag in the wind.
// Pose 2 is the logo's red shield (exact geometry), so the wind only acts on the hero/bus poses.
function sub(pts: Row, ctrl: Row, m: number) {
  const n = pts.length / 2, P: number[] = [], C: number[] = [];
  for (let i = 0; i < n; i++) {
    let ax = pts[2 * i], ay = pts[2 * i + 1], cx = ctrl[2 * i], cy = ctrl[2 * i + 1];
    const bx = pts[2 * ((i + 1) % n)], by = pts[2 * ((i + 1) % n) + 1];
    for (let j = 0; j < m; j++) {
      const t = 1 / (m - j), q0x = ax + (cx - ax) * t, q0y = ay + (cy - ay) * t, q1x = cx + (bx - cx) * t, q1y = cy + (by - cy) * t;
      P.push(ax, ay); C.push(q0x, q0y);
      ax = q0x + (q1x - q0x) * t; ay = q0y + (q1y - q0y) * t; cx = q1x; cy = q1y;
    }
  }
  return { P, C };
}
const CAPE_PTS: Row[] = [
  [-42, -14, -150, -30, -122, -2, -152, 22, -42, 12],
  [-80, -32, -160, -46, -138, -23, -164, -5, -80, -8],
  [-37.5, 7.5, 37.5, 7.5, 37.5, 30, 0, 43.125, -37.5, 30], // = the logo's red shield
];
const SHIELD_C = [0, 7.5, 37.5, 18.75, 18.75, 43.125, -18.75, 43.125, -37.5, 18.75];
const baseCtrl = (P: Row, bulge: number) => {
  const o: number[] = [];
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5, dx = P[2 * j] - P[2 * i], dy = P[2 * j + 1] - P[2 * i + 1], l = Math.hypot(dx, dy) || 1, b = i === 4 ? 0 : bulge;
    o.push((P[2 * i] + P[2 * j]) / 2 - (dy / l) * b, (P[2 * i + 1] + P[2 * j + 1]) / 2 + (dx / l) * b);
  }
  return o;
};
const CAPE_RS = [0, 1, 2].map((i) => sub(CAPE_PTS[i], i === 2 ? SHIELD_C : baseCtrl(CAPE_PTS[i], 6), 4));
const CAPE_ROOT = [-42, -94], CAPE_LEN = 110, CAPE_AMP = [20, 18];
function capeGet(i: number, t: number) {
  const b = CAPE_RS[i];
  if (i === 2) return b;
  const gust = 0.85 + 0.15 * Math.sin(t * 0.004), P = b.P.slice(), C = b.C.slice();
  const bend = (A: number[]) => {
    for (let k = 0; k < A.length; k += 2) {
      const d = Math.max(0, Math.min(1.1, (CAPE_ROOT[i] - A[k]) / CAPE_LEN)), ph = t * 0.021 - d * 8.5; // wave travels root -> tail
      A[k + 1] += CAPE_AMP[i] * gust * Math.pow(d, 1.15) * Math.sin(ph);
      A[k] += 0.22 * CAPE_AMP[i] * gust * d * Math.sin(ph + 1.4);
    }
  };
  bend(P); bend(C);
  return { P, C };
}

const ITEMS: Item[] = [
  { k: 'r', f: [L, L, L], p: [H(0, -20), [-24, -58, 48, 12, 5], H(0, -40)] },                                             // roof unit
  { k: 'r', f: [N, N, N], p: [[-46, -17, 92, 34, 17], [-100, -46, 200, 92, 20], [-37.5, -48.75, 75, 97.5, 18.75]] },      // torso -> bus -> logo body
  { k: 'p', f: [R, R, R], sc: [N, N, N], sw: [3.5, 3.5, 0], get: capeGet },                // cape -> cape -> shield
  { k: 'r', f: [R, R, R], p: [[-46, 6, 92, 9, 0], [-98, 6, 196, 11, 0], [-37.5, 7.5, 75, 0, 0]] },                        // belt -> stripe
  { k: 'r', f: [W, W, W], p: [H(-60, -10), [-90, -36, 28, 34, 7], H(0, -14)], d: 0.3 },                                   // windows
  { k: 'r', f: [W, W, W], p: [H(-30, -10), [-56, -36, 28, 34, 7], H(0, -14)], d: 0.35 },
  { k: 'r', f: [W, W, W], p: [H(0, -10), [-22, -36, 28, 34, 7], H(0, -14)], d: 0.4 },
  { k: 'r', f: [N, N, N], p: [[24, -27, 34, 9, 4.5], H(58, -20), H(58, -20)] },                                            // arm
  { k: 'p', f: [S, W, W], sc: [N, W, W], sw: [3.5, 10, 0], get: (i) => ({ P: [HEAD.pts, WS1.pts, WS2.pts][i], C: [HEAD.ctrl, WS1.ctrl, WS2.ctrl][i] }) }, // head -> windshield -> logo windshield
  { k: 'r', f: [N, N, N], p: [[41, -10, 29, 10, 5], [40, -27, 52, 13, 6], H(0, -16)] },                                    // hero mask
  { k: 'r', f: [W, W, W], p: [[49, -8, 8, 5, 2.5], [48, -25, 12, 8, 4], H(0, -16)] },                                      // eyes
  { k: 'r', f: [W, W, W], p: [[60, -8, 8, 5, 2.5], [68, -25, 12, 8, 4], H(0, -16)] },
  { k: 'r', f: [N, T, N], p: [[-88, 4, 44, 10, 5], [-84, 22, 40, 40, 20], [-1.5, 52.5, 3, 15, 1.5]] },                    // leg -> wheel -> logo stem
  { k: 'r', f: [T, T, T], p: [[-86, -6, 44, 10, 5], [44, 22, 40, 40, 20], H(0, 60)] },                                     // leg -> wheel
  { k: 'r', f: [R, L, L], p: [[-100, 1, 14, 15, 6], [-74, 32, 20, 20, 10], H(0, 58)] },                                    // boots -> hubs
  { k: 'r', f: [R, L, L], p: [[-98, -9, 14, 15, 6], [54, 32, 20, 20, 10], H(0, 58)] },
  { k: 'r', f: [R, Y, W], p: [[52, -30, 15, 15, 7.5], [90, 2, 14, 14, 7], [-6.75, 17.625, 13.5, 13.5, 6.75]] },            // glove -> headlight -> logo dot
  { k: 'r', f: [N, N, N], p: [H(59, -22), H(97, 9), [-3, 21.375, 6, 6, 3]] },                                             // logo dot centre
  { k: 'r', f: [W, W, W], p: [[-14, -9, 14, 14, 7], H(-7, -2), H(-7, -2)] },                                              // chest emblem
];

// comic sound-effect bursts (pop in/out with a scale, never a fade)
const BURST = 'M50 0 34.8 9.3 43.3 25 25.5 25.5 25 43.3 9.3 34.8 0 50-9.3 34.8-25 43.3-25.5 25.5-43.3 25-34.8 9.3-50 0-34.8-9.3-43.3-25-25.5-25.5-25-43.3-9.3-34.8 0-50 9.3-34.8 25-43.3 25.5-25.5 43.3-25 34.8-9.3Z';
const FONT = "'Plus Jakarta Sans','Arial Black',Impact,sans-serif";
interface Fx { text: string; x: number; y: number; rot: number; t0: number; t1: number; fill: string; tc: string; s: number; fs: number }
const FX: Fx[] = [
  { text: 'WHOOSH!', x: -85, y: -72, rot: -8, t0: 350, t1: 1050, fill: Y, tc: R, s: 1.05, fs: 11.5 },
  { text: 'ZAP!', x: -85, y: -88, rot: -8, t0: U0 + 120, t1: U1 + 250, fill: W, tc: R, s: 1.0, fs: 19 },
  { text: 'VROOM!', x: 80, y: -112, rot: 7, t0: U1 + 100, t1: V0 + 150, fill: Y, tc: R, s: 1.05, fs: 13 },
  { text: 'TA-DA!', x: 86, y: -78, rot: 8, t0: END - 150, t1: END + 850, fill: R, tc: W, s: 1.0, fs: 14 },
];
const eb = (a: number) => (a < 1 ? 1 + 2.70158 * Math.pow(a - 1, 3) + 1.70158 * Math.pow(a - 1, 2) : 1);
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const mx = (a: number, b: number, c: number, u: number, v: number) => { const m = a + (b - a) * u; return m + (c - m) * v; };
const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const cm = (f: string[], u: number, v: number) => { const c = f.map(hx); return '#' + [0, 1, 2].map((k) => Math.round(mx(c[0][k], c[1][k], c[2][k], u, v)).toString(16).padStart(2, '0')).join(''); };
const pd = (P: number[], C: number[]) => { const n = P.length / 2; let d = `M${P[0]} ${P[1]}`; for (let i = 0; i < n; i++) { const j = (i + 1) % n; d += `Q${C[2 * i]} ${C[2 * i + 1]} ${P[2 * j]} ${P[2 * j + 1]}`; } return d + 'Z'; };

// The hero starts far away (tiny, near the horizon) and flies toward the viewer in a swooping S-curve,
// growing as he gets nearer. He banks (never spins), makes one U-turn at the far left (a quick sprite
// flip, like turning to face the other way) and lands at full size at the logo's centre.
// Kept inside +/-150 so .splash-container (overflow: hidden) never cuts it on 360px phones.
const WP = [[120, -182], [80, -168], [20, -158], [-48, -162], [-72, -118], [-68, -50], [-40, -14], [0, 0]];
const PATH: number[][] = [], CUM: number[] = [];
(() => {
  const P = [WP[0], ...WP, WP[WP.length - 1]];
  for (let i = 0; i < WP.length - 1; i++) {
    const [a, b, c, d] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    for (let k = 0; k < 40; k++) { const u = k / 40; PATH.push([0, 1].map((j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u * u * u))); }
  }
  PATH.push(WP[WP.length - 1]);
  CUM.push(0);
  for (let i = 1; i < PATH.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
  const tot = CUM[CUM.length - 1];
  for (let i = 0; i < CUM.length; i++) CUM[i] /= tot;
})();
const SF = (() => { for (let i = 0; i < PATH.length - 1; i++) if (PATH[i + 1][0] > PATH[i][0]) return CUM[i]; return 1; })();
const at = (s: number) => {
  let lo = 0, hi = CUM.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (CUM[m] <= s) lo = m; else hi = m; }
  const f = (s - CUM[lo]) / (CUM[hi] - CUM[lo] || 1);
  return [PATH[lo][0] + (PATH[hi][0] - PATH[lo][0]) * f, PATH[lo][1] + (PATH[hi][1] - PATH[lo][1]) * f];
};
function flight(t: number) {
  const s = 1 - Math.pow(1 - cl(t / T_FLY), 1.5), p = at(s), q = at(Math.min(1, s + 0.01)), o = at(Math.max(0, s - 0.01));
  const face = s < SF ? -1 : 1, dl = 0.05;
  let sx = s < SF - dl ? -1 : s > SF + dl ? 1 : -Math.cos((Math.PI * (s - (SF - dl))) / (2 * dl));
  if (Math.abs(sx) < 0.03) sx = sx < 0 ? -0.03 : 0.03;
  let a = (Math.atan2((q[1] - o[1]) * face, (q[0] - o[0]) * face) * 180) / Math.PI;
  a = Math.max(-26, Math.min(26, a)) * (1 - cl((s - 0.88) / 0.12));
  return { x: p[0], y: p[1], a, sx, k: 0.1 + 0.9 * Math.pow(s, 1.3) }; // k = size: far -> near
}

export function createIntro(svg: SVGSVGElement) {
  svg.innerHTML = '';
  const mk = (tag: string, at: Record<string, string> = {}, parent: Element = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    parent.appendChild(e);
    return e;
  };
  const defs = mk('defs');
  const flt = mk('filter', { id: 'i-ds', filterUnits: 'userSpaceOnUse', x: '-195', y: '-200', width: '390', height: '400' }, defs);
  // The real logo's CSS `drop-shadow(0 12px 24px rgba(30,58,138,.15))` blends in sRGB and treats the 24px as the
  // Gaussian sigma. The hero keeps sigma 12 (unchanged); it eases to 24 with the bus->logo morph (see render).
  const shadow = mk('feDropShadow', { dx: '0', dy: '12', stdDeviation: '12', 'flood-color': '#1E3A8A', 'flood-opacity': '.15', 'color-interpolation-filters': 'sRGB' }, flt);
  const pat = mk('pattern', { id: 'i-dots', width: '9', height: '9', patternUnits: 'userSpaceOnUse' }, defs);
  mk('circle', { cx: '4.5', cy: '4.5', r: '2.1', fill: R }, pat);
  // pop-art backdrop: comic sunburst + Ben-Day dots, behind the characters
  const deco = mk('g');
  const sun = mk('g', {}, deco);
  const rays = mk('circle', { r: '150', fill: 'none', stroke: R, 'stroke-opacity': '.1', 'stroke-width': '300', 'stroke-dasharray': '39.27 39.27' }, sun);
  mk('circle', { r: '118', fill: 'url(#i-dots)', 'fill-opacity': '.35' }, sun);
  // End-state burst (background hand-off only): a 1:1 copy of the real logo's `.logo-burst`
  // (splash.page.html, viewBox 220 drawn at 210px -> PX px per unit): same centre (0,0), same 8 navy +
  // 8 red rays with the same radii, stroke widths, linecaps, colours and group opacities. It grows out
  // of the centre while the sunburst shrinks, rotating on the real spin's clock, so the frame at END
  // already IS the logo's background and the swap changes nothing.
  const PX = 210 / 220;
  const burstG = mk('g', {}, deco);
  const ray = (parent: Element, ang: number, ro: number, ri: number) => {
    const a = (ang * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
    mk('line', { x1: String(ro * PX * s), y1: String(-ro * PX * c), x2: String(ri * PX * s), y2: String(-ri * PX * c) }, parent);
  };
  const navyG = mk('g', { stroke: N, 'stroke-width': String(3 * PX), opacity: '0.16', 'stroke-linecap': 'round' }, burstG);
  // the logo's axis rays run r 104 -> 82; its diagonal rays are (34,34)->(50,50) i.e. r 107.5 -> 84.9
  [0, 90, 180, 270].forEach((a) => ray(navyG, a, 104, 82));
  [45, 135, 225, 315].forEach((a) => ray(navyG, a, 76 * Math.SQRT2, 60 * Math.SQRT2));
  const redG = mk('g', { stroke: R, 'stroke-width': String(2 * PX), opacity: '0.12', 'stroke-linecap': 'round' }, burstG);
  [22, 67, 112, 157, 202, 247, 292, 337].forEach((a) => ray(redG, a, 94, 76));
  const stage = mk('g', { filter: 'url(#i-ds)' });
  const ch = mk('g', { stroke: N, 'stroke-linejoin': 'round' }, stage);
  const lines = mk('path', { d: 'M-150-14H-118M-162 4H-124M-148 22H-118', stroke: N, 'stroke-opacity': '.18', 'stroke-width': '4', 'stroke-linecap': 'round', fill: 'none' }, ch);
  const els = ITEMS.map((it) => mk(it.k === 'r' ? 'rect' : 'path', {}, ch));
  const spokes = [mk('circle', { fill: T, stroke: 'none' }, ch), mk('circle', { fill: T, stroke: 'none' }, ch)];
  const spPos = [[-72, -54], [76, -46], [70, 62], [-70, 54]];
  const sp = spPos.map(() => mk('path', { d: 'M0-9L2.5-2.5 9 0 2.5 2.5 0 9-2.5 2.5-9 0-2.5-2.5Z', fill: Y, stroke: N, 'stroke-width': '2', 'stroke-linejoin': 'round' }, stage));

  // pop-art overlay: sound-effect bursts + a comic caption box
  const fx = mk('g');
  const fxEls = FX.map((f) => {
    const g = mk('g', {}, fx);
    mk('path', { d: BURST, fill: N, transform: `translate(3 4) scale(${f.s})` }, g);
    mk('path', { d: BURST, fill: f.fill, stroke: N, 'stroke-width': '3', 'stroke-linejoin': 'round', transform: `scale(${f.s})` }, g);
    mk('text', { y: String(f.fs * 0.35), 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': '800', 'font-size': String(f.fs), fill: f.tc, stroke: N, 'stroke-width': '.8', 'paint-order': 'stroke' }, g).textContent = f.text;
    return g;
  });
  const cap = mk('g', {}, fx);
  mk('rect', { x: '3', y: '3', width: '176', height: '26', rx: '3', fill: N }, cap);
  mk('rect', { width: '176', height: '26', rx: '3', fill: Y, stroke: N, 'stroke-width': '3' }, cap);
  mk('text', { x: '88', y: '17.5', 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': '800', 'font-size': '10.5', fill: N, 'letter-spacing': '.4' }, cap).textContent = 'MEANWHILE... ON THE ROAD!';

  function render(t: number) {
    // The TS finale IS the end card: keep the morphed logo + burst on screen
    // past END instead of hiding them for an HTML handoff.
    stage.setAttribute('visibility', 'visible');
    const r01 = cl((t - U0) / (U1 - U0)), r12 = cl((t - V0) / (END - V0)), u = ease(r01), v = ease(r12), bus = u - v;
    shadow.setAttribute('stdDeviation', String(12 + 12 * v)); // 12 (hero) -> 24 (real logo's drop-shadow)
    const f = flight(Math.min(t, T_FLY)), bob = -2.5 * Math.abs(Math.sin(t * 0.014)) * bus;
    ch.setAttribute('transform', `translate(${f.x + 30 * bus * f.sx * f.k} ${f.y - 8 * bus * f.k + bob}) rotate(${f.a}) scale(${f.sx * f.k} ${f.k})`);
    lines.setAttribute('transform', `translate(-166 0) scale(${Math.max(0, 1 - u * 1.6)} 1) translate(166 0)`);
    ITEMS.forEach((it, i) => {
      const el = els[i], d = it.k === 'r' ? it.d || 0 : 0, a = ease(cl((r01 - d) / (1 - d)));
      if (it.k === 'r') {
        const row = it.p[0].map((_, k) => mx(it.p[0][k], it.p[1][k], it.p[2][k], a, v));
        el.setAttribute('x', String(row[0])); el.setAttribute('y', String(row[1]));
        el.setAttribute('width', String(Math.max(0, row[2]))); el.setAttribute('height', String(Math.max(0, row[3])));
        el.setAttribute('rx', String(Math.max(0, row[4]))); el.setAttribute('fill', cm(it.f, a, v));
        el.setAttribute('stroke-width', String(3.5 * (1 - v)));
      } else {
        const g = [0, 1, 2].map((j) => it.get(j, t));
        const pts = g[0].P.map((_, k) => mx(g[0].P[k], g[1].P[k], g[2].P[k], a, v));
        const cs = g[0].C.map((_, k) => mx(g[0].C[k], g[1].C[k], g[2].C[k], a, v));
        el.setAttribute('d', pd(pts, cs)); el.setAttribute('fill', cm(it.f, a, v)); el.setAttribute('stroke', cm(it.sc, a, v));
        el.setAttribute('stroke-width', String(mx(it.sw[0], it.sw[1], it.sw[2], a, v)));
      }
    });
    const th = t * 0.03, so = cl((u - 0.8) / 0.2) * (1 - cl(v * 3));
    [-64, 64].forEach((cx, k) => { spokes[k].setAttribute('cx', String(cx + 7 * Math.cos(th))); spokes[k].setAttribute('cy', String(42 + 7 * Math.sin(th))); spokes[k].setAttribute('r', String(3 * so)); });
    const sc = Math.pow(Math.max(Math.sin(Math.PI * r01), Math.sin(Math.PI * r12)), 2);
    sp.forEach((s, k) => s.setAttribute('transform', `translate(${spPos[k][0]} ${spPos[k][1]}) scale(${1.4 * sc}) rotate(${t * 0.12 + k * 30})`));
    // Keep the end-state burst visible past END; only the comic sunburst goes away.
    deco.setAttribute('visibility', 'visible');
    sun.setAttribute('visibility', t >= END ? 'hidden' : 'visible');
    sun.setAttribute('transform', `scale(${Math.max(0.0001, ease(cl((t - U0 + 250) / 450)) * (1 - v))})`);
    rays.setAttribute('transform', `rotate(${t * 0.02})`); // sunburst spin: unchanged
    burstG.setAttribute('transform', `scale(${Math.max(0.0001, Math.max(v, t >= END ? 1 : 0))}) rotate(${burstAngleAt(Math.min(t, END))})`);
    FX.forEach((f, i) => {
      const k = Math.max(0.0001, eb(cl((t - f.t0) / 170)) * cl((f.t1 - t) / 130));
      fxEls[i].setAttribute('transform', `translate(${f.x} ${f.y}) rotate(${f.rot + 3 * Math.sin(t * 0.02 + i)}) scale(${k})`);
    });
    cap.setAttribute('transform', `translate(-150 -260) rotate(-2) scale(${Math.max(0.0001, eb(cl((t - 150) / 170)) * cl((1500 - t) / 130))})`);
  }
  render(0);
  return { render };
}