/**
 * Drawing parts for recipe illustrations: flat, top-down, 480×320. Each
 * function returns SVG markup. Theme colours (`--bg`, `--plate`…) are CSS
 * variables that `RecipeImage` fills in for light and dark mode; food colours
 * are fixed.
 *
 * Shapes use only lines, quadratic and cubic curves, circles, ellipses and
 * rects: iOS's SVG renderer mangles some arc commands, so there are none.
 */

export const WIDTH = 480;
export const HEIGHT = 320;
/** The plate's centre. The central 320×320 square is what square thumbnails show. */
export const CX = 240;
export const CY = 160;

export type Area = { x: number; y: number; rx: number; ry: number };
export const area = (x: number, y: number, rx: number, ry = rx): Area => ({ x, y, rx, ry });

/** One decimal place keeps the files small. */
export const n = (v: number) => String(Math.round(v * 10) / 10);

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const g = (x: number, y: number, angle: number, body: string, scale = 1) =>
  `<g transform="translate(${n(x)} ${n(y)})${angle ? ` rotate(${n(angle)})` : ''}${
    scale !== 1 ? ` scale(${n(scale)})` : ''
  }">${body}</g>`;

/** A smooth closed curve through points, as a path `d`. */
function smooth(pts: [number, number][]) {
  const k = pts.length;
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % k];
    const p3 = pts[(i + 2) % k];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + 'Z';
}

/** A smooth open curve through points, as a path `d`. */
function curve(pts: [number, number][]) {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

export type Kit = ReturnType<typeof makeKit>;

/** The drawing parts, sharing one seeded random source so each recipe always draws the same. */
export function makeKit(rand: () => number) {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
  const angle = () => rand() * 360;

  /** A random point in an ellipse. */
  const point = (a: Area): [number, number] => {
    const t = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    return [a.x + Math.cos(t) * a.rx * d, a.y + Math.sin(t) * a.ry * d];
  };

  /** `count` points in an area, kept roughly `gap` apart where possible. */
  const spots = (a: Area, count: number, gap = 0): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      let best = point(a);
      for (let tries = 0; tries < 12 && gap > 0; tries++) {
        if (out.every(([x, y]) => Math.hypot(x - best[0], y - best[1]) >= gap)) break;
        best = point(a);
      }
      out.push(best);
    }
    return out;
  };

  const blobD = (a: Area, wobble = 0.12, k = 9) => {
    const pts: [number, number][] = [];
    const turn = rand() * Math.PI * 2;
    for (let i = 0; i < k; i++) {
      const t = turn + (i / k) * Math.PI * 2;
      const f = 1 + (rand() * 2 - 1) * wobble;
      pts.push([a.x + Math.cos(t) * a.rx * f, a.y + Math.sin(t) * a.ry * f]);
    }
    return smooth(pts);
  };

  type BlobOptions = {
    wobble?: number;
    k?: number;
    stroke?: string;
    width?: number;
    opacity?: number;
  };
  const blob = (a: Area, fill: string, o: BlobOptions = {}) =>
    `<path d="${blobD(a, o.wobble ?? 0.12, o.k ?? 9)}" fill="${fill}"` +
    (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width ?? 1.5}"` : '') +
    (o.opacity !== undefined ? ` opacity="${o.opacity}"` : '') +
    '/>';

  const each = (pts: [number, number][], draw: (x: number, y: number, i: number) => string) =>
    pts.map(([x, y], i) => draw(x, y, i)).join('');

  const kit = {
    between,
    pick,
    angle,
    spots,
    blob,

    // ---- Table and vessels ----

    /** Napkin on the left, fork on the right: outside the central square. */
    setting({ fork = true, napkin = true } = {}) {
      let s = '';
      if (napkin)
        s +=
          `<g transform="rotate(-8 40 160)"><rect x="-10" y="70" width="80" height="190" rx="6" fill="var(--napkin, #FFFFFF)" opacity="0.85"/>` +
          `<rect x="-10" y="92" width="80" height="6" fill="var(--accent, #E07A5F)" opacity="0.6"/>` +
          `<rect x="-10" y="104" width="80" height="3" fill="var(--accent, #E07A5F)" opacity="0.6"/></g>`;
      if (fork)
        s +=
          `<g fill="var(--cutlery, #B8BEC4)"><rect x="428" y="128" width="9" height="150" rx="4.5"/>` +
          `<path d="M418 60h4v52h4V60h4v52h4V60h4v52h4V60h4v58c0 9-7 14-15 14s-15-5-15-14Z"/></g>`;
      return s;
    },

    shadow: (x: number, y: number, rx: number, ry = rx) =>
      `<ellipse cx="${n(x + 6)}" cy="${n(y + 8)}" rx="${n(rx + 4)}" ry="${n(ry + 4)}" fill="#000000" opacity="0.08"/>`,

    plate(x = CX, y = CY, r = 134, well = 104) {
      return (
        kit.shadow(x, y, r) +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="var(--plate, #FFFFFF)"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${well}" fill="var(--plate-well, #F4F0EA)"/>`
      );
    },

    /** A deep bowl: narrow rim and a shaded well. */
    bowl(x = CX, y = CY, r = 134) {
      const well = r - 22;
      return (
        kit.shadow(x, y, r) +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="var(--plate, #FFFFFF)"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${well}" fill="var(--plate-well, #F4F0EA)"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${well - 4}" fill="none" stroke="#000000" stroke-width="8" opacity="0.05"/>`
      );
    },

    /** A rimmed sheet pan lined with parchment. */
    pan() {
      return (
        `<rect x="72" y="44" width="350" height="244" rx="16" fill="#000000" opacity="0.08"/>` +
        `<rect x="62" y="34" width="356" height="252" rx="16" fill="#9AA3AB"/>` +
        `<rect x="72" y="44" width="336" height="232" rx="10" fill="#C3CAD0"/>` +
        `<path d="M84 52L398 50L402 266L80 270Z" fill="#F4ECDD"/>`
      );
    },

    /** A cast-iron skillet with its handle to the upper right. */
    skillet() {
      return (
        kit.shadow(CX, CY, 132) +
        `<g transform="rotate(-35 240 160)"><rect x="362" y="148" width="96" height="24" rx="12" fill="#2B2B2D"/></g>` +
        `<circle cx="240" cy="160" r="132" fill="#2B2B2D"/><circle cx="240" cy="160" r="118" fill="#3A3A3D"/>`
      );
    },

    /** A wooden board. */
    board(x: number, y: number, w: number, h: number) {
      let s = `<rect x="${x + 6}" y="${y + 8}" width="${w}" height="${h}" rx="18" fill="#000000" opacity="0.08"/>`;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#C99A68"/>`;
      for (let i = 1; i < 5; i++) {
        const yy = y + (h * i) / 5 + between(-6, 6);
        s += `<path d="M${x + 20} ${n(yy)}Q${n(x + w / 2)} ${n(yy + between(-8, 8))} ${x + w - 20} ${n(yy)}" fill="none" stroke="#B5844F" stroke-width="2" opacity="0.6"/>`;
      }
      return s;
    },

    /** A small dip bowl (salsa, sour cream, hummus…). */
    dip(x: number, y: number, r: number, fill: string, bits?: () => string) {
      return (
        kit.shadow(x, y, r, r) +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="var(--plate, #FFFFFF)"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r - 6}" fill="${fill}"/>` +
        (bits ? bits() : '')
      );
    },

    // ---- Bases ----

    /** A sauce or bed: a darker outline blob with a lighter one on top. */
    sauce(a: Area, fill: string, edge: string, wobble = 0.08) {
      return (
        blob(a, edge, { wobble }) +
        blob(area(a.x - 2, a.y - 2, a.rx - 8, a.ry - 8), fill, { wobble })
      );
    },

    rice(
      a: Area,
      o: { base?: string; grain?: string; edge?: string; count?: number; size?: number } = {},
    ) {
      const base = o.base ?? '#FBF8F2';
      const grain = o.grain ?? '#FFFFFF';
      const edge = o.edge ?? '#E6DDCB';
      const size = o.size ?? 1;
      let s = blob(a, base, { wobble: 0.08, stroke: edge });
      const count = o.count ?? Math.round((a.rx * a.ry) / 40);
      for (const [x, y] of spots(area(a.x, a.y, a.rx - 7, a.ry - 7), count)) {
        s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(5 * size)}" ry="${n(2.1 * size)}" transform="rotate(${n(angle())} ${n(x)} ${n(y)})" fill="${grain}" stroke="${edge}" stroke-width="0.8"/>`;
      }
      return s;
    },

    /** Small irregular bits: quinoa, cauliflower rice, ground meat, feta. */
    crumbs(a: Area, count: number, colors: string[], size = 4) {
      return each(spots(a, count), (x, y) =>
        blob(area(x, y, size * between(0.7, 1.2), size * between(0.6, 1)), pick(colors), {
          wobble: 0.3,
          k: 6,
        }),
      );
    },

    // ---- Scattered bits ----

    chunks(
      a: Area,
      count: number,
      o: { w?: number; h?: number; fill: string; hi: string; gap?: number },
    ) {
      const w = o.w ?? 28;
      const h = o.h ?? 21;
      return each(spots(a, count, o.gap ?? w * 0.8), (x, y) =>
        g(
          x,
          y,
          between(-40, 40),
          `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${w}" height="${h}" rx="${n(h * 0.38)}" fill="${o.fill}"/>` +
            `<rect x="${n(-w / 2 + 3)}" y="${n(-h / 2 + 2)}" width="${n(w - 8)}" height="${n(h * 0.42)}" rx="${n(h * 0.2)}" fill="${o.hi}"/>`,
        ),
      );
    },

    /** Thick curved strokes: pepper and onion strips, beef strips, cabbage. */
    strips(
      a: Area,
      count: number,
      o: { len?: number; width?: number; colors: string[]; bend?: number },
    ) {
      const len = o.len ?? 34;
      const width = o.width ?? 6;
      const bend = o.bend ?? 8;
      return each(spots(a, count), (x, y) => {
        const c = pick(o.colors);
        const b = between(-bend, bend);
        return g(
          x,
          y,
          angle(),
          `<path d="M${n(-len / 2)} 0Q0 ${n(b)} ${n(len / 2)} 0" fill="none" stroke="${c}" stroke-width="${width}" stroke-linecap="round"/>`,
        );
      });
    },

    dots(a: Area, count: number, o: { r?: number; colors: string[]; hi?: string; gap?: number }) {
      const r = o.r ?? 4;
      return each(spots(a, count, o.gap ?? 0), (x, y) => {
        const rr = r * between(0.85, 1.1);
        return (
          `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${pick(o.colors)}"/>` +
          (o.hi
            ? `<circle cx="${n(x - rr * 0.35)}" cy="${n(y - rr * 0.35)}" r="${n(rr * 0.35)}" fill="${o.hi}" opacity="0.7"/>`
            : '')
        );
      });
    },

    ovals(
      a: Area,
      count: number,
      o: { rx?: number; ry?: number; colors: string[]; hi?: string; gap?: number },
    ) {
      const rx = o.rx ?? 6;
      const ry = o.ry ?? 4;
      return each(spots(a, count, o.gap ?? 0), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<ellipse rx="${rx}" ry="${ry}" fill="${pick(o.colors)}"/>` +
            (o.hi
              ? `<ellipse cx="${n(-rx * 0.3)}" cy="${n(-ry * 0.35)}" rx="${n(rx * 0.35)}" ry="${n(ry * 0.3)}" fill="${o.hi}" opacity="0.7"/>`
              : ''),
        ),
      );
    },

    dice(a: Area, count: number, o: { s?: number; colors: string[]; gap?: number }) {
      const s = o.s ?? 8;
      return each(spots(a, count, o.gap ?? 0), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="${n(-s / 2)}" y="${n(-s / 2)}" width="${s}" height="${s}" rx="${n(s * 0.22)}" fill="${pick(o.colors)}"/>`,
        ),
      );
    },

    leaf(x: number, y: number, len: number, w: number, rot: number, fill: string, rib?: string) {
      return g(
        x,
        y,
        rot,
        `<path d="M0 0Q${n(len / 2)} ${n(-w)} ${len} 0Q${n(len / 2)} ${n(w)} 0 0Z" fill="${fill}"/>` +
          (rib
            ? `<path d="M2 0L${n(len - 3)} 0" stroke="${rib}" stroke-width="1.2" stroke-linecap="round"/>`
            : ''),
      );
    },

    /** Basil, spinach and other whole leaves. */
    leaves(
      a: Area,
      count: number,
      o: { len?: number; w?: number; fill?: string; rib?: string } = {},
    ) {
      return each(spots(a, count), (x, y) =>
        kit.leaf(x, y, o.len ?? 24, o.w ?? 9, angle(), o.fill ?? '#3E8E3A', o.rib ?? '#2C6B29'),
      );
    },

    spinach(a: Area, count: number) {
      return kit.leaves(a, count, { len: 30, w: 13, fill: '#2F7A34', rib: '#4E9A4F' });
    },

    /** Chopped cilantro or parsley: little three-leaf sprigs. */
    herbs(a: Area, count: number, fill = '#3F8E3D') {
      return each(spots(a, count), (x, y) => {
        let s = '';
        for (let k = 0; k < 3; k++) s += kit.leaf(x, y, 10, 5, angle(), fill);
        return s;
      });
    },

    /** Sliced green onion. */
    scallions(a: Area, count: number) {
      return each(spots(a, count), (x, y) => {
        const c = rand() < 0.6 ? '#5DA03A' : '#B7D98A';
        return `<circle cx="${n(x)}" cy="${n(y)}" r="3.4" fill="none" stroke="${c}" stroke-width="2.2"/>`;
      });
    },

    seeds(a: Area, count: number, color = '#F6EBCF') {
      return each(
        spots(a, count),
        (x, y) =>
          `<ellipse cx="${n(x)}" cy="${n(y)}" rx="2.2" ry="1.2" transform="rotate(${n(angle())} ${n(x)} ${n(y)})" fill="${color}"/>`,
      );
    },

    specks(a: Area, count: number, colors: string[], size = 2.4) {
      return each(
        spots(a, count),
        (x, y) =>
          `<rect x="${n(x)}" y="${n(y)}" width="${n(size * 1.4)}" height="${n(size)}" fill="${pick(colors)}"/>`,
      );
    },

    /** Grated or shredded cheese, cabbage, carrot. */
    shreds(a: Area, count: number, colors: string[], len = 14, width = 3.2) {
      return each(spots(a, count), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="${n(-len / 2)}" y="${n(-width / 2)}" width="${len}" height="${width}" rx="${n(width / 2)}" fill="${pick(colors)}"/>`,
        ),
      );
    },

    parmesan(a: Area, count = 24) {
      return kit.specks(a, count, ['#FFF3C9', '#FBE7A6']);
    },

    pepperFlakes(a: Area, count = 10) {
      return kit.specks(a, count, ['#A8261B', '#C8402B'], 2);
    },

    blackPepper(a: Area, count = 14) {
      return kit.specks(a, count, ['#3B3430'], 1.6);
    },

    feta(a: Area, count: number) {
      return each(spots(a, count), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="-5" y="-4" width="${n(between(8, 11))}" height="${n(between(7, 9))}" rx="2" fill="#FFFFFF" stroke="#E7E1D3" stroke-width="0.8"/>`,
        ),
      );
    },

    olives(a: Area, count: number) {
      return kit.ovals(a, count, {
        rx: 7,
        ry: 5.5,
        colors: ['#4A2C3D', '#5B3A4C'],
        hi: '#8C6A7C',
        gap: 12,
      });
    },

    /** Florets; cauliflower passes its own colours. */
    broccoli(
      a: Area,
      count: number,
      r = 12,
      colors = ['#9CC46A', '#3E8A3A', '#4C9C45', '#6DB35C'],
    ) {
      const [stem, dark, mid, light] = colors;
      return each(spots(a, count, r * 1.6), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-3 4L-3 ${n(r + 4)}Q0 ${n(r + 7)} 3 ${n(r + 4)}L3 4Z" fill="${stem}"/>` +
            `<circle cx="${n(-r * 0.45)}" cy="0" r="${n(r * 0.6)}" fill="${dark}"/>` +
            `<circle cx="${n(r * 0.45)}" cy="0" r="${n(r * 0.6)}" fill="${dark}"/>` +
            `<circle cx="0" cy="${n(-r * 0.45)}" r="${n(r * 0.62)}" fill="${mid}"/>` +
            `<circle cx="${n(-r * 0.15)}" cy="${n(-r * 0.6)}" r="${n(r * 0.25)}" fill="${light}"/>`,
        ),
      );
    },

    cherryTomatoes(a: Area, count: number, o: { r?: number; halved?: boolean } = {}) {
      const r = o.r ?? 10;
      return each(spots(a, count, r * 1.7), (x, y) =>
        o.halved
          ? g(
              x,
              y,
              angle(),
              `<circle r="${r}" fill="#E2402F"/><circle r="${n(r * 0.72)}" fill="#F26B4E"/>` +
                `<circle cx="${n(-r * 0.3)}" cy="${n(-r * 0.15)}" r="${n(r * 0.18)}" fill="#F7D36B"/>` +
                `<circle cx="${n(r * 0.3)}" cy="${n(-r * 0.15)}" r="${n(r * 0.18)}" fill="#F7D36B"/>` +
                `<circle cx="0" cy="${n(r * 0.32)}" r="${n(r * 0.18)}" fill="#F7D36B"/>`,
            )
          : `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#E2402F"/>` +
            `<ellipse cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.35)}" rx="${n(r * 0.32)}" ry="${n(r * 0.2)}" fill="#FFFFFF" opacity="0.55"/>`,
      );
    },

    cucumbers(a: Area, count: number, r = 10) {
      return each(
        spots(a, count, r * 1.6),
        (x, y) =>
          `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#4F8A3E"/>` +
          `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r - 2)}" fill="#DDEDC0"/>` +
          `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.42)}" fill="#C4DE9C"/>`,
      );
    },

    zucchini(a: Area, count: number, o: { r?: number; grilled?: boolean } = {}) {
      const r = o.r ?? 12;
      return each(spots(a, count, r * 1.6), (x, y) => {
        let s = `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#3F7A32"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r - 2.5)}" fill="#E7EFC6"/>`;
        if (o.grilled) {
          const t = angle();
          s += g(
            x,
            y,
            t,
            `<path d="M${n(-r * 0.7)} -4H${n(r * 0.7)}M${n(-r * 0.7)} 4H${n(r * 0.7)}" stroke="#8C6B3A" stroke-width="2.4" stroke-linecap="round"/>`,
          );
        } else {
          s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.35)}" fill="#D7E4AE"/>`;
        }
        return s;
      });
    },

    redOnion(a: Area, count: number) {
      return kit.strips(a, count, { len: 22, width: 3, colors: ['#9C3D7A', '#B85C93'], bend: 7 });
    },

    peppers(a: Area, count: number, colors = ['#E2402F', '#F2B630', '#4E9A3A']) {
      return kit.strips(a, count, { len: 36, width: 7, colors, bend: 9 });
    },

    avocado(x: number, y: number, rot: number, count = 4) {
      let s = '';
      for (let i = 0; i < count; i++) {
        s += g(
          (i - (count - 1) / 2) * 9,
          0,
          (i - (count - 1) / 2) * 10,
          `<path d="M-6 -22Q8 0 -6 22Q4 24 8 18Q16 0 8 -18Q4 -24 -6 -22Z" fill="#7BA23F"/>` +
            `<path d="M-5 -19Q7 0 -5 19Q3 20 6 15Q12 0 6 -15Q3 -20 -5 -19Z" fill="#C9DE7E"/>`,
        );
      }
      return g(x, y, rot, s);
    },

    avocadoDice(a: Area, count: number) {
      return kit.dice(a, count, { s: 10, colors: ['#B9D36A', '#C9DE7E'], gap: 10 });
    },

    /** A lemon or lime wedge. */
    wedge(x: number, y: number, rot: number, kind: 'lemon' | 'lime' = 'lemon') {
      const [rind, pulp, line] =
        kind === 'lemon' ? ['#F2C230', '#FBE88A', '#F5D150'] : ['#689F38', '#D4E9B5', '#9CCC65'];
      return g(
        x,
        y,
        rot,
        `<path d="M-26 0Q0 32 26 0Z" fill="${rind}"/><path d="M-22 1Q0 26 22 1Z" fill="${pulp}"/>` +
          `<path d="M0 2L0 18M0 2L-12 13M0 2L12 13" stroke="${line}" stroke-width="1.5" stroke-linecap="round"/>`,
      );
    },

    citrusSlice(x: number, y: number, r: number, kind: 'lemon' | 'lime' = 'lemon') {
      const [rind, pulp, line] =
        kind === 'lemon' ? ['#F2C230', '#FBE88A', '#F5D150'] : ['#689F38', '#D4E9B5', '#9CCC65'];
      let s = `<circle r="${r}" fill="${rind}"/><circle r="${n(r - 3)}" fill="${pulp}"/>`;
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        s += `<path d="M0 0L${n(Math.cos(t) * (r - 4))} ${n(Math.sin(t) * (r - 4))}" stroke="${line}" stroke-width="1.4"/>`;
      }
      return g(x, y, angle(), s);
    },

    /** Sour cream, yogurt or hummus: a soft swirl. */
    dollop(x: number, y: number, r: number, fill = '#FFFDF6', edge = '#EDE5D2') {
      return (
        blob(area(x, y, r, r * 0.9), fill, { wobble: 0.12, stroke: edge, width: 1.2 }) +
        `<path d="M${n(x - r * 0.5)} ${n(y)}Q${n(x)} ${n(y - r * 0.6)} ${n(x + r * 0.45)} ${n(y - r * 0.05)}Q${n(x + r * 0.1)} ${n(y + r * 0.35)} ${n(x - r * 0.1)} ${n(y + r * 0.05)}" fill="none" stroke="${edge}" stroke-width="1.6" stroke-linecap="round"/>`
      );
    },

    drizzle(pts: [number, number][], color: string, width = 4) {
      return `<path d="${curve(pts)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    },

    /** A zigzag drizzle across an area. */
    zigzag(a: Area, color: string, width = 3.5, turns = 5) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= turns; i++) {
        pts.push([
          a.x - a.rx + (2 * a.rx * i) / turns,
          a.y + (i % 2 ? a.ry : -a.ry) * between(0.6, 1),
        ]);
      }
      return kit.drizzle(pts, color, width);
    },

    // ---- Pasta and noodles ----

    penne(a: Area, count: number, o: { fill?: string; edge?: string; end?: string } = {}) {
      const fill = o.fill ?? '#F1C66B';
      const edge = o.edge ?? '#D2A34C';
      const end = o.end ?? '#C9963F';
      return each(spots(a, count, 14), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="-17" y="-6.5" width="34" height="13" rx="5" fill="${fill}" stroke="${edge}" stroke-width="1"/>` +
            `<path d="M-10 -3H10M-10 1H10" stroke="${edge}" stroke-width="1" opacity="0.7"/>` +
            `<ellipse cx="15" cy="0" rx="2.5" ry="5" fill="${end}"/>`,
        ),
      );
    },

    gnocchi(a: Area, count: number) {
      return each(spots(a, count, 18), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<ellipse rx="13" ry="9" fill="#F3D99A" stroke="#D9B66C" stroke-width="1"/>` +
            `<path d="M-6 -7Q-8 0 -6 7M0 -8Q-2 0 0 8M6 -7Q4 0 6 7" fill="none" stroke="#D9B66C" stroke-width="1.2"/>` +
            `<ellipse cx="-3" cy="-4" rx="5" ry="2" fill="#E6B464" opacity="0.6"/>`,
        ),
      );
    },

    /** A nest of long noodles: loops of strokes. */
    noodles(a: Area, o: { fill?: string; edge?: string; width?: number; loops?: number } = {}) {
      const fill = o.fill ?? '#EFCB76';
      const edge = o.edge ?? '#D3A951';
      const width = o.width ?? 4.5;
      let s = '';
      for (let i = 0; i < (o.loops ?? 34); i++) {
        const f = between(0.25, 1);
        const d = blobD(
          area(a.x + between(-8, 8), a.y + between(-8, 8), a.rx * f, a.ry * f * between(0.7, 1)),
          0.18,
          7,
        );
        s += `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${n(width + 1.6)}"/>`;
        s += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${width}"/>`;
      }
      return s;
    },

    // ---- Proteins ----

    shrimp(x: number, y: number, rot: number, scale = 1) {
      return g(
        x,
        y,
        rot,
        `<path d="M-12 -4Q-14 -16 0 -16Q16 -15 15 0Q14 14 1 14" fill="none" stroke="#E8734F" stroke-width="11" stroke-linecap="round"/>` +
          `<path d="M-12 -4Q-14 -16 0 -16Q16 -15 15 0Q14 14 1 14" fill="none" stroke="#F7A07E" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M-3 -10L-1 -21M7 -8L12 -17M11 3L20 4" stroke="#E8734F" stroke-width="2.5" stroke-linecap="round"/>` +
          `<path d="M1 14L-7 20L-5 11Z" fill="#E05A3A"/>`,
        scale,
      );
    },

    shrimps(a: Area, count: number, scale = 1) {
      return each(spots(a, count, 26 * scale), (x, y) => kit.shrimp(x, y, angle(), scale));
    },

    mushrooms(a: Area, count: number) {
      return each(spots(a, count, 16), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-12 0Q-12 -12 0 -12Q12 -12 12 0Q6 1 4 2L4 11Q0 13 -4 11L-4 2Q-6 1 -12 0Z" fill="#9C7451"/>` +
            `<path d="M-9 -1Q-9 -9 0 -9Q9 -9 9 -1Q4 0 2 1L2 9Q0 10 -2 9L-2 1Q-4 0 -9 -1Z" fill="#E3CDAE"/>`,
        ),
      );
    },

    potatoes(a: Area, count: number, r = 15) {
      return each(spots(a, count, r * 1.6), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<ellipse rx="${r}" ry="${n(r * 0.82)}" fill="#B9853F"/>` +
            `<ellipse rx="${n(r - 3)}" ry="${n(r * 0.82 - 3)}" fill="#F3D27A"/>` +
            `<ellipse cx="${n(r * 0.25)}" cy="${n(r * 0.2)}" rx="${n(r * 0.45)}" ry="${n(r * 0.3)}" fill="#E2AF4E" opacity="0.7"/>`,
        ),
      );
    },

    sweetPotatoCubes(a: Area, count: number) {
      return kit.dice(a, count, { s: 13, colors: ['#E8893A', '#F09B4A'], gap: 12 });
    },

    /** A fish fillet seen from above. */
    fillet(x: number, y: number, rot: number, kind: 'salmon' | 'cod' | 'glazed', w = 120, h = 62) {
      const [fill, line, edge] =
        kind === 'salmon'
          ? ['#F08A5D', '#FBD3BE', '#D9693E']
          : kind === 'glazed'
            ? ['#D9743A', '#F2A56C', '#B4521F']
            : ['#F7F1E6', '#E5DACA', '#E2C9A0'];
      let s = `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${w}" height="${h}" rx="${n(h * 0.42)}" fill="${edge}"/>`;
      s += `<rect x="${n(-w / 2 + 4)}" y="${n(-h / 2 + 3)}" width="${n(w - 8)}" height="${n(h - 8)}" rx="${n(h * 0.38)}" fill="${fill}"/>`;
      for (let i = 1; i < 6; i++) {
        const xx = -w / 2 + (w * i) / 6;
        s += `<path d="M${n(xx - 6)} ${n(-h / 2 + 8)}Q${n(xx + 6)} 0 ${n(xx - 6)} ${n(h / 2 - 9)}" fill="none" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>`;
      }
      return g(x, y, rot, s);
    },

    /** Sliced steak: overlapping slices, pink inside. */
    steak(x: number, y: number, rot: number, slices = 6, scale = 1) {
      let s = '';
      for (let i = 0; i < slices; i++) {
        s += g(
          (i - (slices - 1) / 2) * 17,
          (i % 2) * 3,
          0,
          `<rect x="-10" y="-34" width="22" height="68" rx="8" fill="#6B3A22"/>` +
            `<rect x="-6" y="-29" width="14" height="58" rx="6" fill="#D46A6A"/>` +
            `<rect x="-3" y="-22" width="7" height="44" rx="3.5" fill="#E58C84"/>`,
        );
      }
      return g(x, y, rot, s, scale);
    },

    chop(x: number, y: number, rot: number) {
      return g(
        x,
        y,
        rot,
        `<path d="M-52 -10Q-56 -34 -24 -38Q12 -42 40 -26Q60 -12 50 14Q38 38 4 36Q-30 34 -46 18Q-50 8 -52 -10Z" fill="#A9682F"/>` +
          `<path d="M-46 -10Q-48 -28 -22 -32Q10 -36 34 -22Q50 -10 44 12Q34 30 4 30Q-26 28 -40 16Q-44 6 -46 -10Z" fill="#D9A15F"/>` +
          `<path d="M-30 -20L22 -24M-36 0L36 -6M-26 18L30 14" stroke="#8E5222" stroke-width="5" stroke-linecap="round" opacity="0.7"/>` +
          `<path d="M-50 -14Q-56 -26 -46 -30" fill="none" stroke="#F3E6CF" stroke-width="7" stroke-linecap="round"/>`,
      );
    },

    /** A roasted chicken thigh or breast. */
    chicken(
      x: number,
      y: number,
      rot: number,
      o: { w?: number; h?: number; fill?: string; edge?: string; marks?: string } = {},
    ) {
      const w = o.w ?? 70;
      const h = o.h ?? 48;
      const fill = o.fill ?? '#E2A55A';
      const edge = o.edge ?? '#B9722F';
      let s = blob(area(0, 0, w / 2, h / 2), edge, { wobble: 0.1, k: 8 });
      s += blob(area(-2, -2, w / 2 - 5, h / 2 - 5), fill, { wobble: 0.1, k: 8 });
      if (o.marks)
        s += `<path d="M${n(-w * 0.3)} ${n(-h * 0.2)}L${n(w * 0.25)} ${n(-h * 0.28)}M${n(-w * 0.32)} ${n(h * 0.12)}L${n(w * 0.3)} ${n(h * 0.04)}" stroke="${o.marks}" stroke-width="4" stroke-linecap="round" opacity="0.65"/>`;
      return g(x, y, rot, s);
    },

    /** Sausage links; kofta pass their own colours and length. */
    sausages(a: Area, count: number, colors = ['#8A4A2B', '#B06A42', '#6E3820'], len = 60) {
      const [fill, hi, line] = colors;
      const h = len / 2;
      return each(spots(a, count, 40), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="${-h}" y="-10" width="${len}" height="20" rx="10" fill="${fill}"/>` +
            `<rect x="${-h + 4}" y="-7" width="${len - 12}" height="6" rx="3" fill="${hi}"/>` +
            `<path d="M-14 -9L-10 9M4 -9L8 9" stroke="${line}" stroke-width="2.5" opacity="0.6"/>`,
        ),
      );
    },

    meatballs(a: Area, count: number, r = 15) {
      return each(
        spots(a, count, r * 1.9),
        (x, y) =>
          `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#7A4630"/>` +
          `<circle cx="${n(x - 2)}" cy="${n(y - 2)}" r="${n(r - 3)}" fill="#9A5B3E"/>` +
          `<circle cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.4)}" r="${n(r * 0.28)}" fill="#B8785A"/>`,
      );
    },

    bacon(a: Area, count: number) {
      return each(spots(a, count), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="-7" y="-4" width="${n(between(11, 15))}" height="8" rx="2.5" fill="#9E3B2A"/><rect x="-5" y="-1" width="8" height="2.5" rx="1" fill="#E8B49A"/>`,
        ),
      );
    },

    eggHalf(x: number, y: number, rot: number, r = 18) {
      return g(
        x,
        y,
        rot,
        `<ellipse rx="${r}" ry="${n(r * 0.75)}" fill="#FFFFFF" stroke="#E9E2D3" stroke-width="1"/><circle cx="1" r="${n(r * 0.42)}" fill="#F6B42C"/>`,
      );
    },

    friedEgg(x: number, y: number, r = 30) {
      return (
        blob(area(x, y, r, r * 0.9), '#FFFFFF', { wobble: 0.14, stroke: '#ECE4D4', k: 8 }) +
        `<circle cx="${n(x + 3)}" cy="${n(y - 2)}" r="${n(r * 0.38)}" fill="#F7A823"/>` +
        `<circle cx="${n(x)}" cy="${n(y - 5)}" r="${n(r * 0.1)}" fill="#FFFFFF" opacity="0.6"/>`
      );
    },

    // ---- Vegetables ----

    /** Green beans; snap peas pass their own colours. */
    greenBeans(a: Area, count: number, len = 50, colors = ['#3F8A35', '#6DB04F'], width = 7) {
      return each(spots(a, count), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M${n(-len / 2)} 0Q0 ${n(between(-5, 5))} ${n(len / 2)} 0" fill="none" stroke="${colors[0]}" stroke-width="${width}" stroke-linecap="round"/>` +
            `<path d="M${n(-len / 2 + 4)} -1Q0 ${n(between(-4, 3))} ${n(len / 2 - 4)} -1" fill="none" stroke="${colors[1]}" stroke-width="2.5" stroke-linecap="round"/>`,
        ),
      );
    },

    asparagus(x: number, y: number, rot: number, count = 5) {
      let s = '';
      for (let i = 0; i < count; i++) {
        const yy = (i - (count - 1) / 2) * 11;
        s +=
          `<path d="M-60 ${n(yy)}L48 ${n(yy)}" stroke="#5E9A3A" stroke-width="8" stroke-linecap="round"/>` +
          `<path d="M40 ${n(yy)}Q50 ${n(yy - 6)} 62 ${n(yy)}Q50 ${n(yy + 6)} 40 ${n(yy)}Z" fill="#3E7A2C"/>` +
          `<path d="M-30 ${n(yy)}L-26 ${n(yy - 3)}M0 ${n(yy)}L4 ${n(yy - 3)}M24 ${n(yy)}L28 ${n(yy - 3)}" stroke="#3E7A2C" stroke-width="1.5"/>`;
      }
      return g(x, y, rot, s);
    },

    bokChoy(x: number, y: number, rot: number, scale = 1) {
      return g(
        x,
        y,
        rot,
        `<path d="M-6 -6Q-30 -40 -4 -58Q22 -44 8 -6Z" fill="#3E8A3A"/>` +
          `<path d="M-4 -12Q-14 -36 -2 -50Q10 -36 4 -12Z" fill="#5DA04A"/>` +
          `<path d="M-10 -8Q-14 16 -6 28Q0 32 6 28Q14 16 10 -8Z" fill="#E6EFD2"/>` +
          `<path d="M0 -50L0 26" stroke="#CFE2B4" stroke-width="2"/>`,
        scale,
      );
    },

    carrots(a: Area, count: number) {
      return each(spots(a, count), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-34 -6Q0 -9 36 -2Q40 0 36 2Q0 9 -34 6Q-38 0 -34 -6Z" fill="#E87A2A"/>` +
            `<path d="M-20 -3L20 -2M-10 3L16 2" stroke="#C9601C" stroke-width="1.5" opacity="0.7"/>` +
            `<path d="M-30 -4Q-10 -6 10 -4" stroke="#F4A55E" stroke-width="2" fill="none" stroke-linecap="round"/>`,
        ),
      );
    },

    corn(x: number, y: number, rot: number) {
      let s = `<rect x="-26" y="-17" width="52" height="34" rx="14" fill="#E7B53A"/>`;
      for (let i = -2; i <= 2; i++) {
        for (let j = -1; j <= 1; j++)
          s += `<rect x="${i * 9 - 3.5}" y="${j * 9 - 3.5}" width="7" height="7" rx="2.5" fill="#F7D35C"/>`;
      }
      s += `<path d="M-8 -14L4 -10M10 8L20 12" stroke="#B5762A" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`;
      return g(x, y, rot, s);
    },

    lettuce(a: Area, fill = '#9CCB63', vein = '#C6E39A') {
      let s = blob(a, '#7FB548', { wobble: 0.16, k: 12 });
      for (let i = 0; i < 6; i++) {
        const [x, y] = point(area(a.x, a.y, a.rx * 0.7, a.ry * 0.7));
        s += blob(area(x, y, a.rx * 0.38, a.ry * 0.32), rand() < 0.5 ? fill : '#B3D97A', {
          wobble: 0.2,
          k: 7,
        });
        s += g(
          x,
          y,
          angle(),
          `<path d="M-14 0Q0 -4 14 0" fill="none" stroke="${vein}" stroke-width="1.5"/>`,
        );
      }
      return s;
    },

    // ---- Breads, wraps and other whole dishes ----

    bread(x: number, y: number, rot: number, scale = 1) {
      return g(
        x,
        y,
        rot,
        `<path d="M-44 10Q-50 -24 -18 -30Q0 -40 20 -30Q50 -26 44 8Q42 30 0 30Q-40 30 -44 10Z" fill="#B9783E"/>` +
          `<path d="M-37 9Q-42 -18 -15 -23Q0 -32 18 -23Q42 -20 37 8Q35 23 0 23Q-34 23 -37 9Z" fill="#F1DDAE"/>` +
          `<ellipse cx="-14" cy="-4" rx="4" ry="2.5" fill="#E2C788"/><ellipse cx="10" cy="6" rx="5" ry="3" fill="#E2C788"/><ellipse cx="18" cy="-10" rx="3" ry="2" fill="#E2C788"/>`,
        scale,
      );
    },

    /** A taco seen from the side, standing on the plate. */
    taco(
      cx: number,
      cy: number,
      tilt: number,
      o: { shell?: 'corn' | 'flour'; filling: string[]; toppings: () => string },
    ) {
      const [back, front, spot] =
        o.shell === 'flour' ? ['#E6D2A6', '#F6E9C9', '#D9B97C'] : ['#DDA944', '#F2C766', '#DDA944'];
      let t = `<path d="M-56 -2Q-54 44 0 44Q54 44 56 -2Q0 -30 -56 -2Z" fill="${back}"/>`;
      t += blob(area(0, -6, 50, 14), o.filling[0], { wobble: 0.18, k: 10 });
      for (const [x, y] of spots(area(0, -8, 44, 8), 8))
        t += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(between(3, 6))}" fill="${pick(o.filling)}"/>`;
      t += o.toppings();
      t += `<path d="M-58 0Q-56 48 0 48Q56 48 58 0Q34 18 0 18Q-34 18 -58 0Z" fill="${front}"/>`;
      for (let i = 0; i < 9; i++)
        t += `<circle cx="${n(between(-38, 38))}" cy="${n(between(24, 42))}" r="1.6" fill="${spot}"/>`;
      return g(cx, cy, tilt, t);
    },

    /** Lettuce for a taco top: ruffles along the rim. */
    tacoLettuce(colors = ['#8BC34A', '#A5D46A']) {
      let s = '';
      for (let i = 0; i < 8; i++) {
        const x = -46 + i * 13 + between(0, 4);
        s += `<path d="M${n(x - 9)} -2Q${n(x - 6)} ${n(-24 - between(0, 6))} ${n(x)} -18Q${n(x + 6)} ${n(-26 - between(0, 6))} ${n(x + 9)} -2Z" fill="${colors[i % colors.length]}"/>`;
      }
      return s;
    },

    /** A wrap cut in half, seen end-on so the filling shows. */
    wrapHalf(x: number, y: number, rot: number, fillings: string[], tortilla = '#F3E1B8') {
      let s = `<rect x="-62" y="-30" width="96" height="60" rx="26" fill="#E3C78F"/>`;
      s += `<rect x="-58" y="-26" width="88" height="52" rx="22" fill="${tortilla}"/>`;
      s += `<path d="M-40 -20Q-46 0 -40 20M-20 -22Q-26 0 -20 22" fill="none" stroke="#E3C78F" stroke-width="2"/>`;
      s += `<ellipse cx="38" cy="0" rx="24" ry="30" fill="#E3C78F"/><ellipse cx="38" cy="0" rx="20" ry="26" fill="${tortilla}"/>`;
      fillings.forEach((c, i) => {
        s += blob(area(38 + between(-3, 3), between(-4, 4), 16 - i * 3.5, 21 - i * 4.5), c, {
          wobble: 0.2,
          k: 7,
        });
      });
      return g(x, y, rot, s);
    },

    /** A burger from the side. */
    burger(x: number, y: number, o: { patty: string; layers: string[] }) {
      let s = `<rect x="-60" y="18" width="120" height="24" rx="11" fill="#D9963F"/>`;
      s += `<rect x="-64" y="2" width="128" height="22" rx="10" fill="${o.patty}"/>`;
      for (let i = 0; i < 8; i++)
        s += `<circle cx="${n(-54 + i * 15)}" cy="${n(between(6, 18))}" r="2" fill="#2C1D16" opacity="0.5"/>`;
      o.layers.forEach((c, i) => {
        const yy = -4 - i * 8;
        s += `<path d="M-66 ${yy + 6}Q-50 ${yy - 4} -34 ${yy + 4}Q-18 ${yy - 4} 0 ${yy + 4}Q18 ${yy - 4} 34 ${yy + 4}Q50 ${yy - 4} 66 ${yy + 6}L64 ${yy + 10}L-64 ${yy + 10}Z" fill="${c}"/>`;
      });
      const top = -4 - o.layers.length * 8;
      s += `<path d="M-62 ${top + 4}Q-62 ${top - 58} 0 ${top - 58}Q62 ${top - 58} 62 ${top + 4}Z" fill="#DE9A42"/>`;
      s += `<path d="M-48 ${top - 20}Q-36 ${top - 46} 0 ${top - 48}" fill="none" stroke="#EDB868" stroke-width="7" stroke-linecap="round"/>`;
      for (let i = 0; i < 9; i++)
        s += `<ellipse cx="${n(between(-40, 40))}" cy="${n(top - between(14, 44))}" rx="2.6" ry="1.4" transform="rotate(${n(angle())})" fill="#FFF3D6"/>`;
      return g(x, y, 0, s);
    },

    /** A round flatbread or pita pizza from above. */
    pizza(x: number, y: number, r: number, base: string, toppings: () => string) {
      return (
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#D49A4A"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r - 3)}" fill="#E9BE74"/>` +
        blob(area(x, y, r - 11, r - 11), base, { wobble: 0.06 }) +
        toppings()
      );
    },

    /** A halved baked sweet potato with its filling. */
    /** A halved baked potato; russets pass their own skin and flesh colours. */
    sweetPotato(
      x: number,
      y: number,
      rot: number,
      fill: () => string,
      colors = ['#8A4B3A', '#F08A3C'],
    ) {
      return g(
        x,
        y,
        rot,
        `<path d="M-70 0Q-64 -34 0 -36Q64 -34 70 0Q64 34 0 36Q-64 34 -70 0Z" fill="${colors[0]}"/>` +
          `<path d="M-62 0Q-56 -27 0 -29Q56 -27 62 0Q56 27 0 29Q-56 27 -62 0Z" fill="${colors[1]}"/>` +
          fill(),
      );
    },

    quesadilla(x: number, y: number, rot: number, scale = 1) {
      return g(
        x,
        y,
        rot,
        `<path d="M0 0L78 -30Q90 0 78 30Z" fill="#D9A85A"/>` +
          `<path d="M4 0L74 -26Q84 0 74 26Z" fill="#F0D08C"/>` +
          `<path d="M76 -28Q88 0 76 28" fill="none" stroke="#F2B53A" stroke-width="6"/>` +
          `<circle cx="80" cy="-12" r="4" fill="#3A2A2A"/><circle cx="82" cy="8" r="3.5" fill="#7A5A44"/>` +
          `<ellipse cx="40" cy="-6" rx="7" ry="4" fill="#C98E46" opacity="0.6"/><ellipse cx="56" cy="10" rx="6" ry="3.5" fill="#C98E46" opacity="0.6"/><ellipse cx="28" cy="8" rx="4" ry="2.5" fill="#C98E46" opacity="0.6"/>`,
        scale,
      );
    },

    omelette(x: number, y: number, rot: number) {
      return g(
        x,
        y,
        rot,
        `<path d="M-80 10Q-76 -50 0 -52Q76 -50 80 10Z" fill="#E9B83A"/>` +
          `<path d="M-74 6Q-70 -44 0 -46Q70 -44 74 6Z" fill="#F7D35C"/>` +
          `<ellipse cx="-30" cy="-22" rx="10" ry="5" fill="#EFC24A" opacity="0.7"/><ellipse cx="22" cy="-30" rx="8" ry="4" fill="#EFC24A" opacity="0.7"/>` +
          `<path d="M-80 10Q0 22 80 10L78 16Q0 28 -78 16Z" fill="#D9A52E"/>`,
      );
    },

    /** A grilled-cheese half: a triangle with melted cheese at the cut. */
    grilledCheese(x: number, y: number, rot: number) {
      return g(
        x,
        y,
        rot,
        `<path d="M-50 -48L50 -48L-50 52Z" fill="#B87A36"/>` +
          `<path d="M-44 -42L38 -42L-44 40Z" fill="#E2A44E"/>` +
          `<path d="M-30 -30L10 -34M-38 -6L-6 -14" stroke="#C98A3E" stroke-width="3" stroke-linecap="round" opacity="0.6"/>` +
          `<path d="M50 -48L-50 52L-44 56L56 -44Z" fill="#F6B92F"/>`,
      );
    },

    /** A butter lettuce cup with filling. */
    lettuceCup(x: number, y: number, rot: number, fill: () => string) {
      return g(
        x,
        y,
        rot,
        `<path d="M-58 0Q-56 -42 0 -44Q56 -42 58 0Q54 40 0 42Q-54 40 -58 0Z" fill="#8DC05A"/>` +
          `<path d="M-50 0Q-48 -34 0 -36Q48 -34 50 0Q46 32 0 34Q-46 32 -50 0Z" fill="#C7E39A"/>` +
          `<path d="M-40 0L40 0M-20 -26L0 0L-20 26M20 -26L0 0L20 26" stroke="#E6F3CF" stroke-width="2" fill="none"/>` +
          fill(),
      );
    },

    tortillaStack(x: number, y: number, r = 40) {
      return (
        `<circle cx="${n(x + 4)}" cy="${n(y + 4)}" r="${r}" fill="#E3C78F"/>` +
        `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#F6E9C9" stroke="#E3C78F" stroke-width="2"/>` +
        `<circle cx="${n(x - 10)}" cy="${n(y - 6)}" r="5" fill="#E6CB92" opacity="0.7"/><circle cx="${n(x + 12)}" cy="${n(y + 8)}" r="4" fill="#E6CB92" opacity="0.7"/>`
      );
    },

    // ---- Added for the second batch of recipes ----

    /** A stack of pancakes from above, with syrup. */
    pancakes(x: number, y: number, r = 66) {
      let s = '';
      [
        [8, 10],
        [4, 5],
        [0, 0],
      ].forEach(([dx, dy]) => {
        s += `<circle cx="${n(x + dx)}" cy="${n(y + dy)}" r="${r}" fill="#B9773A"/>`;
        s += `<circle cx="${n(x + dx - 2)}" cy="${n(y + dy - 2)}" r="${r - 5}" fill="#E0A458"/>`;
      });
      s += `<circle cx="${n(x - 2)}" cy="${n(y - 2)}" r="${r - 16}" fill="#D38E44" opacity="0.6"/>`;
      s += blob(area(x + 4, y - 2, r * 0.5, r * 0.42), '#9A5A1E', {
        wobble: 0.25,
        k: 8,
        opacity: 0.75,
      });
      s += `<rect x="${n(x - 12)}" y="${n(y - 16)}" width="22" height="16" rx="3" fill="#FFF3D6"/>`;
      return s;
    },

    bananaSlices(a: Area, count: number) {
      return each(
        spots(a, count, 18),
        (x, y) =>
          `<circle cx="${n(x)}" cy="${n(y)}" r="10" fill="#F3E3A2" stroke="#E2C66A" stroke-width="1.5"/>` +
          `<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="#E2C66A" opacity="0.7"/>`,
      );
    },

    /** A frittata filling a skillet. */
    frittata(r = 110) {
      return (
        `<circle cx="${CX}" cy="${CY}" r="${r}" fill="#D9A52E"/>` +
        blob(area(CX, CY, r - 8, r - 8), '#F4CC50', { wobble: 0.03, k: 12 }) +
        each(spots(area(CX, CY, r - 30, r - 30), 7), (x, y) =>
          blob(area(x, y, 14, 9), '#E9B83A', { wobble: 0.3, k: 6, opacity: 0.7 }),
        )
      );
    },

    /** A bell pepper half, cut side up, with its filling. */
    pepperHalf(x: number, y: number, rot: number, color: string, fill: () => string) {
      return g(
        x,
        y,
        rot,
        `<path d="M-46 0Q-46 -36 -10 -40Q0 -48 10 -40Q46 -36 46 0Q44 38 0 40Q-44 38 -46 0Z" fill="${color}"/>` +
          `<path d="M-38 0Q-38 -28 0 -32Q38 -28 38 0Q36 30 0 32Q-36 30 -38 0Z" fill="#000000" opacity="0.18"/>` +
          `<path d="M-8 -42Q0 -56 6 -50" fill="none" stroke="#4E7A2C" stroke-width="6" stroke-linecap="round"/>` +
          fill(),
      );
    },

    fritters(a: Area, count: number, r = 24) {
      return each(
        spots(a, count, r * 1.9),
        (x, y) =>
          blob(area(x, y, r, r * 0.9), '#B9782E', { wobble: 0.12, k: 8 }) +
          blob(area(x - 1, y - 1, r - 4, r * 0.9 - 4), '#E2A84E', { wobble: 0.12, k: 8 }) +
          kit.specks(area(x, y, r - 8, r - 8), 9, ['#5E8E34', '#3E7A2C', '#F7F0DE'], 2.6),
      );
    },

    /** A sandwich half cut on the diagonal, showing its filling. */
    sandwichHalf(x: number, y: number, rot: number, filling: string, extra = '#7FB548') {
      return g(
        x,
        y,
        rot,
        `<path d="M-50 -48L50 -48L-50 52Z" fill="#C9935A"/>` +
          `<path d="M-44 -42L38 -42L-44 40Z" fill="#F3DEB0"/>` +
          `<path d="M58 -42L-46 62L-36 64L64 -34Z" fill="${extra}"/>` +
          `<path d="M50 -48L-50 52L-42 60L58 -40Z" fill="${filling}"/>`,
      );
    },

    /** An open-faced toast with melted cheese. */
    toast(x: number, y: number, rot: number, cheese = '#F2B53A') {
      return g(
        x,
        y,
        rot,
        `<rect x="-42" y="-40" width="84" height="80" rx="16" fill="#B9783E"/>` +
          `<rect x="-36" y="-34" width="72" height="68" rx="12" fill="#EDCB8A"/>` +
          blob(area(0, 0, 36, 34), cheese, { wobble: 0.14, k: 9 }) +
          `<ellipse cx="-10" cy="-8" rx="8" ry="4" fill="#C9781E" opacity="0.5"/><ellipse cx="12" cy="10" rx="6" ry="3" fill="#C9781E" opacity="0.5"/>`,
      );
    },

    /** A teardrop naan or flatbread, with toppings drawn in its own frame. */
    naan(x: number, y: number, rot: number, base: string, toppings: () => string) {
      return g(
        x,
        y,
        rot,
        `<path d="M-80 0Q-74 -44 0 -46Q70 -40 84 0Q70 40 0 46Q-74 44 -80 0Z" fill="#C98A3E"/>` +
          `<path d="M-72 0Q-66 -36 0 -38Q62 -32 74 0Q62 32 0 38Q-66 36 -72 0Z" fill="#EBC27E"/>` +
          blob(area(0, 0, 62, 30), base, { wobble: 0.08 }) +
          toppings(),
      );
    },

    /** Macaroni elbows. */
    elbows(a: Area, count: number, fill = '#F4C64E', edge = '#D9A52E') {
      return each(spots(a, count, 12), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-9 -6Q-9 8 6 8" fill="none" stroke="${edge}" stroke-width="9" stroke-linecap="round"/>` +
            `<path d="M-9 -6Q-9 8 6 8" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/>`,
        ),
      );
    },

    /** Roasted potato wedges. */
    wedges(a: Area, count: number, colors = ['#8A4B3A', '#F08A3C']) {
      return each(spots(a, count, 16), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-30 4Q0 -18 30 4Q0 10 -30 4Z" fill="${colors[0]}"/>` +
            `<path d="M-26 3Q0 -13 26 3Q0 7 -26 3Z" fill="${colors[1]}"/>`,
        ),
      );
    },

    appleSlices(a: Area, count: number) {
      return each(spots(a, count, 14), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<path d="M-18 4Q0 -16 18 4Q0 9 -18 4Z" fill="#C0392B"/><path d="M-15 4Q0 -11 15 4Q0 7 -15 4Z" fill="#F4E3B5"/>`,
        ),
      );
    },

    /** Eggplant (or similar) batons: skin on one side. */
    batons(a: Area, count: number, colors = ['#4B2A4E', '#E7D7A8']) {
      return each(spots(a, count, 12), (x, y) =>
        g(
          x,
          y,
          angle(),
          `<rect x="-18" y="-6" width="36" height="12" rx="4" fill="${colors[0]}"/><rect x="-16" y="-3" width="32" height="8" rx="3" fill="${colors[1]}"/>`,
        ),
      );
    },
  };
  return kit;
}
