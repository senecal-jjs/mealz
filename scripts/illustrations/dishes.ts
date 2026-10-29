/**
 * What each bundled recipe's illustration shows, built from the parts in
 * kit.ts. Every recipe in src/catalog/data/recipes needs an entry.
 */
import { area, CX, CY, type Area, type Kit } from './kit';

type Dish = (k: Kit) => string;

// ---- Shared pieces ----

/** Areas around the middle of a bowl, for toppings arranged in sections. */
function zone(
  i: number,
  count: number,
  o: { start?: number; dist?: number; r?: number } = {},
): Area {
  const t = (((o.start ?? -90) + (360 * i) / count) * Math.PI) / 180;
  const dist = o.dist ?? 54;
  return area(CX + Math.cos(t) * dist, CY + Math.sin(t) * dist, o.r ?? 32);
}

function mozzarella(k: Kit, a: Area, count: number, size = 13) {
  return k
    .spots(a, count, size * 1.8)
    .map(([x, y]) =>
      k.blob(area(x, y, size, size * 0.85), '#FFFDF5', {
        wobble: 0.25,
        k: 7,
        stroke: '#ECE2CC',
        width: 1,
      }),
    )
    .join('');
}

function scrambledEgg(k: Kit, a: Area, count: number) {
  return k
    .spots(a, count, 10)
    .map(([x, y]) =>
      k.blob(area(x, y, 8, 6), k.pick(['#F7D35C', '#FBE38A']), { wobble: 0.35, k: 6 }),
    )
    .join('');
}

/** Rice on the left of a plate and a saucy dish on the right, like a curry plate. */
function riceAndSauce(k: Kit, sauce: string, edge: string, toppings: (a: Area) => string) {
  const a = area(282, 160, 66, 78);
  return (
    k.plate() +
    k.rice(area(186, 162, 60, 70)) +
    k.sauce(a, sauce, edge) +
    toppings(area(a.x, a.y, a.rx - 16, a.ry - 16))
  );
}

/** A bowl filled with a sauce, with a scoop of rice at the upper left. */
function curryBowl(k: Kit, sauce: string, edge: string, toppings: (a: Area) => string) {
  return (
    k.bowl() +
    k.sauce(area(CX, CY, 108, 108), sauce, edge, 0.04) +
    k.rice(area(198, 128, 44, 38)) +
    toppings(area(262, 186, 58, 52))
  );
}

/** Three tacos standing on a plate. */
function tacoPlate(
  k: Kit,
  filling: string[],
  toppings: () => string,
  shell: 'corn' | 'flour' = 'corn',
  lime = true,
) {
  return (
    k.plate() +
    (lime ? k.wedge(330, 112, -25, 'lime') : '') +
    k.taco(240, 100, 0, { shell, filling, toppings }) +
    k.taco(184, 176, -8, { shell, filling, toppings }) +
    k.taco(298, 176, 8, { shell, filling, toppings })
  );
}

function spaghettiPlate(k: Kit, toppings: string) {
  return k.plate() + k.noodles(area(CX, CY + 2, 88, 84)) + toppings;
}

// ---- The recipes ----

/** Dishes that spread past the plate on the right, where the fork would go. */
export const NO_FORK = new Set(['tomato-soup-grilled-cheese']);

export const dishes: Record<string, Dish> = {
  'bbq-chicken-sheet-pan': (k) =>
    k.pan() +
    k.potatoes(area(132, 104, 36, 36), 5) +
    k.potatoes(area(352, 232, 32, 24), 3) +
    k.potatoes(area(350, 92, 30, 26), 3) +
    k.corn(128, 222, -15) +
    k.corn(362, 162, 80) +
    [
      [222, 112, -10],
      [292, 168, 15],
      [204, 204, 5],
    ]
      .map(([x, y, r]) =>
        k.chicken(x, y, r, { w: 78, h: 54, fill: '#A2401F', edge: '#6E2614', marks: '#5A1E10' }),
      )
      .join('') +
    k.scallions(area(240, 160, 100, 80), 22) +
    k.blackPepper(area(240, 160, 140, 100), 20),

  'beef-broccoli-stir-fry': (k) =>
    riceAndSauce(
      k,
      '#7A4426',
      '#5C2F18',
      (a) =>
        k.strips(a, 12, { len: 34, width: 9, colors: ['#5A3020', '#6E3B26'] }) +
        k.broccoli(a, 6, 12) +
        k.scallions(a, 10),
    ),

  'black-bean-burgers': (k) =>
    k.plate() +
    k.cherryTomatoes(area(322, 248, 20, 10), 3, { r: 8, halved: true }) +
    k.burger(236, 186, { patty: '#3E2A26', layers: ['#7FB548', '#E2402F', '#B9D36A'] }),

  'black-bean-tacos-lime-slaw': (k) =>
    tacoPlate(
      k,
      ['#2B2230', '#3A2E3E', '#4A3A4C'],
      () =>
        k.shreds(area(0, -18, 44, 8), 14, ['#C9E3A2', '#9C5BA8', '#EDF5DC'], 14, 3) +
        k.avocadoDice(area(0, -14, 36, 6), 4) +
        k.herbs(area(0, -20, 40, 6), 4),
    ),

  'caprese-pasta': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 94, 90), '#D9472F', { wobble: 0.07, k: 11 }) +
    k.penne(area(CX, CY, 80, 76), 44) +
    k.cherryTomatoes(area(CX, CY, 78, 74), 10, { r: 11 }) +
    mozzarella(k, area(CX, CY, 70, 66), 7) +
    k.leaves(area(CX, CY, 72, 68), 7) +
    k.parmesan(area(CX, CY, 80, 76), 20) +
    k.pepperFlakes(area(CX, CY, 80, 76), 8),

  'cauliflower-fried-rice': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 104, 104), '#F2EBDD', { wobble: 0.04 }) +
    k.crumbs(area(CX, CY, 96, 96), 150, ['#FFFFFF', '#F5F0E4', '#EDE3CF'], 3.6) +
    k.dots(area(CX, CY, 88, 88), 22, { r: 4, colors: ['#6DB04F', '#5E9E42'], hi: '#A7D47F' }) +
    k.dice(area(CX, CY, 88, 88), 16, { s: 6, colors: ['#F08A3A', '#F49B4E'] }) +
    k.chunks(area(CX, CY, 74, 74), 9, { w: 22, h: 22, fill: '#D9A653', hi: '#F5E2B0' }) +
    k.scallions(area(CX, CY, 86, 86), 16),

  'chana-masala': (k) =>
    riceAndSauce(
      k,
      '#C65A2A',
      '#9E4120',
      (a) =>
        k.dots(a, 22, { r: 6, colors: ['#E3B86A', '#D9A955'], hi: '#F3D9A0', gap: 10 }) +
        k.herbs(a, 6),
    ) + k.wedge(320, 248, -150, 'lemon'),

  'cheesy-broccoli-orzo': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 104, 104), '#F2CD6A', { wobble: 0.04 }) +
    k.rice(area(CX, CY, 100, 100), {
      base: '#F2CD6A',
      grain: '#F8DE8E',
      edge: '#D9B05A',
      size: 1.4,
      count: 150,
    }) +
    k.broccoli(area(CX, CY, 76, 76), 7, 11) +
    k.parmesan(area(CX, CY, 84, 84), 24) +
    k.blackPepper(area(CX, CY, 84, 84), 12) +
    k.wedge(330, 92, -30, 'lemon'),

  'chicken-broccoli-alfredo': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 96, 92), '#F6EBD2', { wobble: 0.07, k: 11, stroke: '#E6D3AE' }) +
    k.penne(area(CX, CY, 80, 76), 38, { fill: '#F4D58A' }) +
    k.chunks(area(CX, CY, 72, 70), 8, { w: 26, h: 18, fill: '#D9A562', hi: '#F2D3A0' }) +
    k.broccoli(area(CX, CY, 74, 72), 6, 11) +
    k.parmesan(area(CX, CY, 80, 76), 24) +
    k.blackPepper(area(CX, CY, 80, 76), 12),

  'chicken-caesar-wraps': (k) =>
    k.board(108, 62, 264, 196) +
    k.wrapHalf(214, 118, -8, ['#6FA83E', '#E2B77A', '#F4ECD6']) +
    k.wrapHalf(226, 204, 8, ['#6FA83E', '#E2B77A', '#F4ECD6']) +
    k.wedge(326, 94, 20, 'lemon') +
    k.parmesan(area(320, 160, 20, 30), 10),

  'chicken-pesto-pasta': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 94, 90), '#7DA53A', { wobble: 0.07, k: 11 }) +
    k.penne(area(CX, CY, 80, 76), 40, { fill: '#E3D67C', edge: '#B5B04E', end: '#A8A043' }) +
    k.spinach(area(CX, CY, 74, 70), 5) +
    k.chunks(area(CX, CY, 72, 70), 7, { w: 26, h: 18, fill: '#D9A562', hi: '#F2D3A0' }) +
    k.cherryTomatoes(area(CX, CY, 76, 72), 6, { r: 9, halved: true }) +
    k.parmesan(area(CX, CY, 80, 76), 22),

  'chicken-shawarma-bowls': (k) =>
    k.bowl() +
    k.rice(area(CX, CY, 104, 104)) +
    k.strips(zone(0, 4, { start: -135 }), 9, {
      len: 30,
      width: 10,
      colors: ['#C8752F', '#B5631F'],
    }) +
    k.cucumbers(zone(1, 4, { start: -135 }), 5, 10) +
    k.cherryTomatoes(zone(2, 4, { start: -135 }), 5, { r: 9, halved: true }) +
    k.redOnion(zone(3, 4, { start: -135 }), 8) +
    k.dollop(CX, CY, 22) +
    k.herbs(area(CX, CY, 90, 90), 10),

  'chicken-tikka-masala': (k) =>
    riceAndSauce(
      k,
      '#E1802F',
      '#C9621F',
      (a) =>
        k.chunks(a, 9, { fill: '#B4521F', hi: '#D07A43' }) +
        k.drizzle(
          [
            [252, 168],
            [272, 142],
            [310, 148],
            [314, 178],
            [290, 202],
            [268, 186],
            [284, 168],
            [294, 178],
          ],
          '#FFF4E4',
          5,
        ) +
        k.herbs(a, 6),
    ),

  'chickpea-coconut-curry': (k) =>
    curryBowl(
      k,
      '#E9A84C',
      '#D08A30',
      (a) =>
        k.dots(a, 18, { r: 6, colors: ['#E3B86A', '#D9A955'], hi: '#F3D9A0', gap: 10 }) +
        k.dice(a, 8, { s: 7, colors: ['#D9472F', '#E85A3E'] }) +
        k.spinach(a, 4),
    ) + k.wedge(330, 98, -35, 'lime'),

  'classic-beef-tacos': (k) =>
    tacoPlate(
      k,
      ['#6E3F27', '#8A5234'],
      () =>
        k.tacoLettuce() +
        k.dice(area(0, -16, 42, 6), 5, { s: 8, colors: ['#E2463A'] }) +
        k.shreds(area(0, -18, 44, 6), 7, ['#F4A93A']),
    ),

  'cobb-salad': (k) => {
    const row = (i: number) => {
      const dy = (i - 2.5) * 30;
      return area(CX, CY + dy, Math.sqrt(96 * 96 - dy * dy) * 0.75, 11);
    };
    return (
      k.bowl() +
      k.lettuce(area(CX, CY, 100, 100)) +
      k.chunks(row(0), 4, { w: 20, h: 15, fill: '#D9A562', hi: '#F2D3A0' }) +
      k.bacon(row(1), 7) +
      [-50, -16, 18, 52].map((x) => k.eggHalf(CX + x, CY - 15, 0, 15)).join('') +
      k.cherryTomatoes(row(3), 5, { r: 9, halved: true }) +
      k.avocadoDice(row(4), 7) +
      k.shreds(row(5), 12, ['#F4A93A', '#F7B955'], 12, 3)
    );
  },

  'coconut-red-lentil-dal': (k) =>
    curryBowl(
      k,
      '#E9A23B',
      '#D9862A',
      (a) =>
        k.dots(area(CX, CY, 96, 96), 60, { r: 2.4, colors: ['#F2B64F', '#DB8A2E'] }) +
        k.drizzle(
          [
            [236, 196],
            [262, 172],
            [296, 180],
            [300, 206],
            [272, 220],
          ],
          '#FFF6E6',
          5,
        ) +
        k.spinach(a, 4) +
        k.herbs(a, 6),
    ) + k.wedge(332, 96, -35, 'lime'),

  'cod-tomatoes-olives': (k) =>
    k.plate() +
    k.blob(area(CX, CY + 4, 92, 86), '#E46A4A', { opacity: 0.3 }) +
    k.fillet(234, 148, -10, 'cod', 124, 66) +
    k.cherryTomatoes(area(CX, CY + 10, 92, 84), 8, { r: 10 }) +
    k.olives(area(CX, CY + 10, 90, 84), 7) +
    k.herbs(area(CX, CY, 80, 70), 10) +
    k.wedge(318, 236, -140, 'lemon') +
    k.bread(166, 226, -20, 0.75),

  'creamy-mushroom-gnocchi': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 96, 92), '#EFDDB8', { wobble: 0.07, k: 11, stroke: '#DCC193' }) +
    k.gnocchi(area(CX, CY, 80, 76), 20) +
    k.mushrooms(area(CX, CY, 78, 74), 8) +
    k.spinach(area(CX, CY, 74, 70), 5) +
    k.parmesan(area(CX, CY, 80, 76), 18) +
    k.blackPepper(area(CX, CY, 80, 76), 12),

  'fajita-cauliflower-rice-bowls': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 104, 104), '#F2EBDD', { wobble: 0.04 }) +
    k.crumbs(area(CX, CY, 96, 96), 130, ['#FFFFFF', '#F5F0E4', '#EDE3CF'], 3.6) +
    k.peppers(area(208, 136, 50, 40), 12) +
    k.redOnion(area(208, 136, 46, 36), 7) +
    k.avocado(282, 132, 70, 4) +
    k.blob(area(250, 214, 30, 24), '#D9472F', { wobble: 0.2 }) +
    k.dice(area(250, 214, 22, 16), 8, { s: 6, colors: ['#F2614A', '#F7E3C0', '#5DA03A'] }) +
    k.herbs(area(CX, CY, 80, 80), 8) +
    k.wedge(334, 96, -35, 'lime'),

  'garlic-butter-shrimp-zucchini': (k) =>
    k.plate() +
    k.noodles(area(CX, CY + 2, 86, 82), { fill: '#C4DB86', edge: '#5E8E34', width: 4 }) +
    k.shrimps(area(CX, CY, 62, 58), 6, 0.9) +
    k.herbs(area(CX, CY, 76, 72), 10) +
    k.parmesan(area(CX, CY, 76, 72), 14) +
    k.pepperFlakes(area(CX, CY, 76, 72), 8) +
    k.wedge(322, 236, -140, 'lemon'),

  'greek-hummus-wraps': (k) =>
    k.board(108, 62, 264, 196) +
    k.wrapHalf(206, 118, -8, ['#2F7A34', '#E2402F', '#E8D2A0']) +
    k.wrapHalf(218, 204, 8, ['#2F7A34', '#E2402F', '#E8D2A0']) +
    k.dip(330, 104, 26, '#E8D2A0', () => k.specks(area(330, 104, 10, 10), 6, ['#C8402B'])) +
    k.olives(area(330, 214, 18, 24), 4),

  'greek-lemon-chicken-potatoes': (k) =>
    k.pan() +
    k.potatoes(area(240, 160, 140, 90), 12, 15) +
    [
      [180, 120, -15],
      [292, 108, 10],
      [250, 210, 0],
    ]
      .map(([x, y, r]) => k.chicken(x, y, r, { marks: '#B9722F' }))
      .join('') +
    k.redOnion(area(240, 160, 140, 90), 12) +
    k.citrusSlice(330, 200, 15) +
    k.citrusSlice(150, 210, 15) +
    k.feta(area(240, 160, 120, 80), 12) +
    k.specks(area(240, 160, 140, 90), 30, ['#4E6B2E', '#6B7F3A'], 1.8),

  'green-curry-vegetables': (k) =>
    curryBowl(
      k,
      '#9DBF5A',
      '#7FA23F',
      (a) =>
        k.chunks(a, 6, { w: 22, h: 22, fill: '#E8CB86', hi: '#F7EACA' }) +
        k.peppers(a, 6, ['#E2402F']) +
        k.greenBeans(a, 6, 30) +
        k.leaves(a, 5),
    ) + k.wedge(332, 96, -35, 'lime'),

  'honey-mustard-pork-chops': (k) =>
    k.plate() +
    k.chop(214, 140, -15) +
    k.zigzag(area(214, 140, 34, 14), '#E6B530', 4, 5) +
    k.carrots(area(290, 218, 40, 30), 5) +
    k.specks(area(240, 170, 80, 70), 20, ['#4E6B2E'], 1.8),

  'korean-beef-bowls': (k) =>
    k.bowl() +
    k.rice(area(CX, CY, 104, 104)) +
    k.crumbs(area(262, 140, 56, 50), 70, ['#5A3020', '#6E3B26', '#7E4630'], 5) +
    k.cucumbers(area(194, 206, 32, 26), 5, 9) +
    k.scallions(area(250, 150, 70, 66), 14) +
    k.seeds(area(250, 150, 70, 66), 30) +
    k.pepperFlakes(area(262, 140, 50, 44), 8),

  'kung-pao-chicken': (k) =>
    riceAndSauce(
      k,
      '#8E3B1E',
      '#6A2814',
      (a) =>
        k.chunks(a, 8, { w: 22, h: 18, fill: '#B85C2E', hi: '#D9844E' }) +
        k.peppers(a, 6, ['#E2402F', '#4E9A3A']) +
        k.ovals(a, 12, { rx: 5.5, ry: 4, colors: ['#D9A15F', '#E2B070'], hi: '#F2D3A0' }) +
        k.strips(a, 5, { len: 16, width: 4, colors: ['#B3261E'] }) +
        k.scallions(a, 8),
    ),

  'lemon-garlic-salmon-green-beans': (k) =>
    k.plate() +
    k.greenBeans(area(268, 214, 58, 28), 10, 46) +
    k.fillet(224, 132, -12, 'salmon') +
    k.citrusSlice(214, 128, 13) +
    k.citrusSlice(248, 122, 13) +
    k.herbs(area(230, 140, 60, 30), 8) +
    k.wedge(170, 222, 160, 'lemon'),

  'lemon-herb-chicken-asparagus': (k) =>
    k.plate() +
    k.blob(area(216, 138, 66, 48), '#F1D592', { opacity: 0.5 }) +
    k.chicken(214, 134, -10, {
      w: 104,
      h: 64,
      fill: '#E7B56A',
      edge: '#C08040',
      marks: '#9A5E2A',
    }) +
    k.asparagus(256, 214, -8, 5) +
    k.citrusSlice(290, 116, 14) +
    k.herbs(area(214, 134, 44, 26), 9),

  'lentil-sloppy-joes': (k) =>
    k.plate() +
    k.shreds(area(318, 236, 30, 18), 26, ['#C9E3A2', '#EDF5DC', '#B4D58A'], 14, 3) +
    k.burger(224, 186, { patty: '#7A3A22', layers: ['#8E4426'] }),

  'lentil-spinach-soup': (k) =>
    k.bowl(226, 156, 124) +
    k.sauce(area(226, 156, 98, 98), '#8A6A3A', '#6E5230', 0.04) +
    k.dots(area(226, 156, 88, 88), 70, { r: 3, colors: ['#6E5434', '#5A4428', '#8A6E44'] }) +
    k.dice(area(226, 156, 84, 84), 10, { s: 7, colors: ['#F08A3A'] }) +
    k.dice(area(226, 156, 84, 84), 8, { s: 6, colors: ['#A9C97A'] }) +
    k.spinach(area(226, 156, 76, 76), 6) +
    k.citrusSlice(260, 120, 13) +
    k.blackPepper(area(226, 156, 84, 84), 12) +
    k.bread(364, 250, -25, 0.75),

  'loaded-sweet-potatoes': (k) => {
    const fill = () =>
      k.dots(area(0, 0, 48, 18), 12, { r: 4.5, colors: ['#2B2230', '#3A2E3E'] }) +
      k.dice(area(0, 0, 44, 16), 6, { s: 7, colors: ['#D9472F', '#F2614A'] }) +
      k.avocadoDice(area(0, 0, 40, 14), 4) +
      k.herbs(area(0, 0, 44, 16), 4);
    return (
      k.plate() +
      k.sweetPotato(232, 114, -10, fill) +
      k.sweetPotato(248, 206, -6, fill) +
      k.wedge(338, 166, 90, 'lime')
    );
  },

  'margherita-pita-pizzas': (k) =>
    k.board(112, 34, 256, 252) +
    k.pizza(
      CX,
      CY,
      104,
      '#D9472F',
      () =>
        mozzarella(k, area(CX, CY, 70, 70), 8, 15) +
        k.leaves(area(CX, CY, 70, 70), 6, { len: 26, w: 10 }) +
        k.specks(area(CX, CY, 80, 80), 16, ['#4E6B2E'], 1.8),
    ),

  'mediterranean-quinoa-bowls': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 104, 104), '#E8D5A6', { wobble: 0.04 }) +
    k.crumbs(area(CX, CY, 98, 98), 220, ['#F1E2BA', '#D9C08A', '#C9A86E'], 2.6) +
    k.dots(zone(0, 5), 9, { r: 6, colors: ['#E3B86A', '#D9A955'], hi: '#F3D9A0', gap: 10 }) +
    k.cucumbers(zone(1, 5, { r: 28 }), 4, 9) +
    k.cherryTomatoes(zone(2, 5, { r: 28 }), 4, { r: 9, halved: true }) +
    k.olives(zone(3, 5, { r: 26 }), 5) +
    k.redOnion(zone(4, 5, { r: 28 }), 7) +
    k.feta(area(CX, CY, 18, 18), 6) +
    k.herbs(area(CX, CY, 90, 90), 10),

  'miso-salmon-bok-choy': (k) =>
    k.plate() +
    k.bokChoy(300, 208, 60, 1.25) +
    k.bokChoy(206, 226, 110, 1.25) +
    k.fillet(226, 128, -10, 'glazed') +
    k.seeds(area(226, 128, 50, 22), 20),

  'mushroom-black-bean-quesadillas': (k) =>
    k.plate() +
    [-30, 90, 210]
      .map((r) => {
        const t = (r * Math.PI) / 180;
        return k.quesadilla(CX + Math.cos(t) * 12, CY + Math.sin(t) * 12, r, 1.25);
      })
      .join('') +
    k.dip(CX, CY, 26, '#D9472F', () =>
      k.dice(area(CX, CY, 12, 12), 6, { s: 5, colors: ['#F2614A', '#F7E3C0'] }),
    ) +
    k.dollop(300, 220, 13),

  'mushroom-stroganoff': (k) =>
    k.bowl() +
    k.blob(area(CX, CY, 96, 92), '#D9B48A', { wobble: 0.07, k: 11, stroke: '#C29766' }) +
    k.penne(area(CX, CY, 80, 76), 36, { fill: '#F0CF85' }) +
    k.mushrooms(area(CX, CY, 78, 74), 10) +
    k.dollop(CX + 6, CY - 4, 18) +
    k.herbs(area(CX, CY, 80, 76), 10) +
    k.blackPepper(area(CX, CY, 80, 76), 12),

  'peanut-noodles': (k) =>
    k.bowl() +
    k.noodles(area(CX, CY, 92, 90), { fill: '#F3E3C2', edge: '#DCC59A', width: 3.5, loops: 40 }) +
    k.zigzag(area(CX, CY, 60, 30), '#C98A4A', 4, 6) +
    k.ovals(zone(0, 4, { start: -45, r: 26 }), 8, {
      rx: 6,
      ry: 4,
      colors: ['#7DB342', '#8BC34A'],
      hi: '#C5E1A5',
    }) +
    k.shreds(zone(1, 4, { start: -45, r: 26 }), 12, ['#F08A3A', '#F49B4E']) +
    k.shreds(zone(2, 4, { start: -45, r: 26 }), 12, ['#8E4A9E', '#A865B5']) +
    k.cucumbers(zone(3, 4, { start: -45, r: 24 }), 3, 9) +
    k.ovals(area(CX, CY, 40, 40), 10, { rx: 4, ry: 3, colors: ['#D9A15F', '#E2B070'] }) +
    k.herbs(area(CX, CY, 80, 80), 8) +
    k.wedge(334, 96, -35, 'lime'),

  'pesto-veggie-flatbreads': (k) => {
    const top = (x: number, y: number) => () =>
      k.zucchini(area(x, y, 46, 46), 4, { r: 10, grilled: true }) +
      k.cherryTomatoes(area(x, y, 46, 46), 4, { r: 8, halved: true }) +
      k.redOnion(area(x, y, 46, 46), 5) +
      k.shreds(area(x, y, 48, 48), 14, ['#FFFDF5', '#F7F0DE'], 10, 3) +
      k.leaves(area(x, y, 44, 44), 3, { len: 18, w: 7 }) +
      k.pepperFlakes(area(x, y, 48, 48), 6);
    return (
      k.board(70, 52, 340, 216) +
      k.pizza(176, 148, 72, '#6E9A35', top(176, 148)) +
      k.pizza(304, 172, 72, '#6E9A35', top(304, 172))
    );
  },

  'pork-green-bean-stir-fry': (k) =>
    k.plate() +
    k.blob(area(CX, CY, 88, 84), '#9A6436', { opacity: 0.45 }) +
    k.greenBeans(area(CX, CY, 74, 70), 16, 42) +
    k.strips(area(CX, CY, 68, 64), 12, { len: 30, width: 9, colors: ['#C99A6A', '#B5845A'] }) +
    k.scallions(area(CX, CY, 74, 70), 14),

  'quick-bolognese': (k) =>
    spaghettiPlate(
      k,
      k.blob(area(CX, CY - 6, 52, 46), '#A63A24', { wobble: 0.15, k: 10 }) +
        k.crumbs(area(CX, CY - 6, 44, 38), 40, ['#7E2A1A', '#8E3A24', '#C04A2E'], 4.5) +
        k.parmesan(area(CX, CY - 6, 50, 44), 22),
    ),

  'quick-minestrone': (k) =>
    k.bowl() +
    k.sauce(area(CX, CY, 108, 108), '#D9733E', '#BF5A2A', 0.04) +
    k.ovals(area(CX, CY, 90, 90), 10, { rx: 7, ry: 4.5, colors: ['#F3EBDD'], hi: '#FFFFFF' }) +
    k.ovals(area(CX, CY, 90, 90), 10, { rx: 6, ry: 3, colors: ['#F1C66B'] }) +
    k.dice(area(CX, CY, 88, 88), 10, { s: 7, colors: ['#F08A3A'] }) +
    k.dice(area(CX, CY, 88, 88), 8, { s: 6, colors: ['#A9C97A'] }) +
    k.zucchini(area(CX, CY, 80, 80), 5, { r: 9 }) +
    k.spinach(area(CX, CY, 78, 78), 5) +
    k.parmesan(area(CX, CY, 70, 70), 16),

  'salmon-teriyaki-bowls': (k) =>
    k.bowl() +
    k.rice(area(CX, CY, 104, 104)) +
    k.chunks(area(256, 132, 46, 38), 7, { w: 24, h: 22, fill: '#D9743A', hi: '#F2A56C' }) +
    k.zigzag(area(256, 132, 36, 16), '#6B3418', 3.5, 5) +
    k.ovals(area(196, 196, 30, 24), 12, {
      rx: 6,
      ry: 4,
      colors: ['#7DB342', '#8BC34A'],
      hi: '#C5E1A5',
    }) +
    k.cucumbers(area(282, 210, 28, 22), 4, 9) +
    k.scallions(area(CX, CY, 80, 80), 12) +
    k.seeds(area(CX, CY, 80, 80), 26),

  'sausage-peppers-sheet-pan': (k) =>
    k.pan() +
    k.peppers(area(240, 160, 140, 92), 26) +
    k.redOnion(area(240, 160, 140, 92), 14) +
    k.zucchini(area(240, 160, 140, 92), 6, { r: 11 }) +
    k.sausages(area(240, 160, 120, 84), 6) +
    k.herbs(area(240, 160, 130, 90), 12),

  shakshuka: (k) =>
    k.skillet() +
    k.sauce(area(CX, CY, 112, 112), '#C8402B', '#A3301F', 0.04) +
    k.peppers(area(CX, CY, 96, 96), 10, ['#A3301F', '#E2402F']) +
    [
      [196, 124],
      [282, 118],
      [300, 196],
      [214, 210],
      [246, 162],
    ]
      .map(([x, y]) => k.friedEgg(x, y, 24))
      .join('') +
    k.feta(area(CX, CY, 92, 92), 10) +
    k.herbs(area(CX, CY, 92, 92), 12),

  'sheet-pan-chicken-fajitas': (k) =>
    k.pan() +
    k.peppers(area(240, 160, 140, 92), 26) +
    k.redOnion(area(240, 160, 140, 92), 14) +
    k.strips(area(240, 160, 130, 86), 14, { len: 34, width: 11, colors: ['#D99A52', '#C4843E'] }) +
    k.herbs(area(240, 160, 130, 86), 10) +
    k.wedge(370, 84, -40, 'lime') +
    k.wedge(110, 240, 140, 'lime'),

  'shrimp-fried-rice': (k) =>
    k.bowl() +
    k.rice(area(CX, CY, 104, 104), { base: '#EBCB8A', grain: '#F5DFA6', edge: '#D9B46A' }) +
    k.dots(area(CX, CY, 88, 88), 20, { r: 4, colors: ['#6DB04F', '#5E9E42'], hi: '#A7D47F' }) +
    k.dice(area(CX, CY, 88, 88), 14, { s: 6, colors: ['#F08A3A', '#F49B4E'] }) +
    scrambledEgg(k, area(CX, CY, 84, 84), 10) +
    k.shrimps(area(CX, CY, 64, 64), 5, 0.8) +
    k.scallions(area(CX, CY, 86, 86), 14),

  'shrimp-scampi-pasta': (k) =>
    spaghettiPlate(
      k,
      k.shrimps(area(CX, CY, 60, 56), 6, 0.85) +
        k.herbs(area(CX, CY, 76, 72), 12) +
        k.pepperFlakes(area(CX, CY, 76, 72), 8) +
        k.wedge(322, 238, -140, 'lemon'),
    ),

  'shrimp-tacos-mango-salsa': (k) =>
    tacoPlate(
      k,
      ['#9C5BA8', '#C9E3A2', '#EDF5DC'],
      () =>
        k.shrimp(-16, -18, -20, 0.55) +
        k.shrimp(16, -18, 20, 0.55) +
        k.dice(area(0, -14, 40, 6), 7, { s: 7, colors: ['#F7B32B', '#F59E1B'] }) +
        k.dice(area(0, -14, 40, 6), 3, { s: 5, colors: ['#9C3D7A'] }) +
        k.zigzag(area(0, -16, 34, 4), '#FFFDF6', 3, 5) +
        k.herbs(area(0, -20, 40, 6), 3),
    ),

  'spaghetti-aglio-olio-spinach': (k) =>
    spaghettiPlate(
      k,
      k.spinach(area(CX, CY, 70, 66), 8) +
        k.ovals(area(CX, CY, 70, 66), 10, { rx: 4, ry: 2.5, colors: ['#F6E7B8'], hi: '#FFFFFF' }) +
        k.pepperFlakes(area(CX, CY, 76, 72), 12) +
        k.parmesan(area(CX, CY, 76, 72), 18) +
        k.wedge(322, 238, -140, 'lemon'),
    ),

  'spinach-feta-omelette': (k) =>
    k.plate() +
    k.cherryTomatoes(area(240, 228, 50, 12), 4, { r: 10, halved: true }) +
    k.omelette(236, 168, -6) +
    k.spinach(area(232, 182, 62, 6), 7) +
    k.feta(area(232, 184, 56, 6), 6) +
    k.feta(area(236, 140, 44, 16), 3) +
    k.blackPepper(area(236, 150, 60, 30), 12),

  'steak-chimichurri-zucchini': (k) =>
    k.plate() +
    k.zucchini(area(270, 222, 62, 26), 7, { r: 14, grilled: true }) +
    k.steak(220, 132, -15, 7, 1.3) +
    k.blob(area(220, 132, 62, 22), '#3E7A2C', { wobble: 0.3, opacity: 0.75 }) +
    k.herbs(area(220, 132, 66, 28), 18, '#2E6B2A') +
    k.pepperFlakes(area(220, 132, 60, 24), 8),

  'sweet-potato-black-bean-chili': (k) =>
    k.bowl() +
    k.sauce(area(CX, CY, 108, 108), '#8E3420', '#6E2414', 0.04) +
    k.ovals(area(CX, CY, 90, 90), 18, {
      rx: 6,
      ry: 4,
      colors: ['#2B2230', '#3A2E3E'],
      hi: '#6A5A6E',
    }) +
    k.sweetPotatoCubes(area(CX, CY, 88, 88), 10) +
    k.avocado(274, 130, 60, 4) +
    k.dollop(206, 196, 15) +
    k.herbs(area(CX, CY, 84, 84), 10) +
    k.wedge(334, 96, -35, 'lime'),

  'teriyaki-tofu-bok-choy': (k) =>
    k.plate() +
    k.rice(area(184, 156, 58, 66)) +
    k.bokChoy(310, 214, 35, 1.15) +
    k.bokChoy(250, 236, -15, 1.15) +
    k.chunks(area(282, 132, 40, 34), 7, { w: 24, h: 22, fill: '#B86A2A', hi: '#E09A55' }) +
    k.zigzag(area(282, 132, 32, 14), '#6B3418', 3, 5) +
    k.seeds(area(250, 150, 70, 60), 26),

  'thai-basil-chicken': (k) =>
    riceAndSauce(
      k,
      '#7A4A26',
      '#5C3418',
      (a) =>
        k.crumbs(a, 50, ['#A86E3E', '#8E5A30', '#C08250'], 5) +
        k.greenBeans(a, 6, 28) +
        k.dots(a, 8, { r: 3.5, colors: ['#D9301E'] }) +
        k.leaves(a, 6),
    ) + k.friedEgg(186, 150, 30),

  'tofu-scramble-tacos': (k) =>
    tacoPlate(
      k,
      ['#F2CC4A', '#E8B93A', '#2B2230'],
      () =>
        k.avocadoDice(area(0, -16, 40, 6), 5) +
        k.dice(area(0, -16, 40, 6), 6, { s: 7, colors: ['#D9472F', '#F2614A'] }) +
        k.herbs(area(0, -20, 40, 6), 3),
      'flour',
      false,
    ) +
    k.dip(336, 100, 22, '#D9472F', () =>
      k.dice(area(336, 100, 10, 10), 5, { s: 5, colors: ['#F2614A', '#F7E3C0'] }),
    ),

  'tomato-soup-grilled-cheese': (k) =>
    k.bowl(196, 160, 112) +
    k.sauce(area(196, 160, 88, 88), '#D9472F', '#B5351F', 0.03) +
    k.drizzle(
      [
        [170, 160],
        [190, 136],
        [222, 146],
        [218, 178],
        [192, 184],
        [186, 164],
        [200, 158],
      ],
      '#FFF4E4',
      5,
    ) +
    k.blackPepper(area(196, 160, 70, 70), 14) +
    k.grilledCheese(352, 122, 10) +
    k.grilledCheese(366, 220, 200),

  'tuna-nicoise-salad': (k) =>
    k.plate() +
    k.lettuce(area(CX, CY, 98, 94)) +
    k.potatoes(area(196, 120, 30, 26), 4, 12) +
    k.greenBeans(area(290, 116, 34, 22), 8, 40) +
    k.crumbs(area(CX, CY + 4, 32, 28), 28, ['#C9A27E', '#B38A64', '#D9B894'], 6) +
    k.eggHalf(196, 210, -10, 16) +
    k.eggHalf(232, 226, 10, 16) +
    k.cherryTomatoes(area(300, 200, 28, 22), 4, { r: 9, halved: true }) +
    k.olives(area(170, 166, 16, 22), 4) +
    k.blackPepper(area(CX, CY, 80, 76), 12),

  'turkey-meatballs-marinara': (k) =>
    spaghettiPlate(
      k,
      k.blob(area(CX, CY - 4, 62, 56), '#C8402B', { wobble: 0.15, k: 10 }) +
        k.meatballs(area(CX, CY - 4, 40, 36), 5, 16) +
        k.leaves(area(CX, CY - 4, 50, 46), 3) +
        k.parmesan(area(CX, CY - 4, 58, 52), 20),
    ),

  'turkey-taco-lettuce-wraps': (k) => {
    const fill = () =>
      k.crumbs(area(0, 0, 36, 22), 30, ['#A87B52', '#8E6440', '#BC9068'], 5) +
      k.dice(area(0, 0, 32, 18), 5, { s: 7, colors: ['#E2402F'] }) +
      k.shreds(area(0, 0, 32, 18), 6, ['#F4A93A']) +
      k.avocadoDice(area(0, 0, 30, 16), 3);
    return (
      k.plate() +
      k.lettuceCup(186, 122, -12, fill) +
      k.lettuceCup(292, 128, 14, fill) +
      k.lettuceCup(238, 214, 4, fill) +
      k.wedge(160, 210, 150, 'lime')
    );
  },
};
