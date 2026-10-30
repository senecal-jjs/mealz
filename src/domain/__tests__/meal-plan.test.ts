import { catalog } from '@/catalog';
import { buildPlan, mainProtein, pickWeight, swapPick, type PlanContext } from '@/domain/meal-plan';

const { recipes, ingredients } = catalog;
const ids = (list: { id: string }[]) => list.map((r) => r.id);

/** A seeded random number generator (mulberry32), so picks repeat in tests. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = new Date('2026-10-30T12:00:00Z');
const context = (extra: Partial<PlanContext> = {}): PlanContext => ({
  ingredients,
  favourites: new Set(),
  history: [],
  now,
  ...extra,
});

describe('buildPlan', () => {
  it('picks the number of meals asked for, never twice, from the candidates', () => {
    const picks = buildPlan(recipes, 7, context(), new Set(), seeded(1));
    expect(picks).toHaveLength(7);
    expect(new Set(ids(picks)).size).toBe(7);
    expect(picks.every((p) => recipes.includes(p))).toBe(true);
  });

  it('leaves out recipes already in the plan', () => {
    const exclude = new Set(ids(recipes.slice(0, 100)));
    const picks = buildPlan(recipes, 10, context(), exclude, seeded(2));
    expect(picks.some((p) => exclude.has(p.id))).toBe(false);
  });

  it('returns what it can when too few recipes fit', () => {
    expect(buildPlan(recipes.slice(0, 3), 5, context(), new Set(), seeded(3))).toHaveLength(3);
    expect(buildPlan([], 5, context())).toEqual([]);
  });

  it('avoids the same main protein two meals in a row', () => {
    for (let seed = 0; seed < 20; seed++) {
      const picks = buildPlan(recipes, 10, context(), new Set(), seeded(seed));
      const proteins = picks.map((p) => mainProtein(p, ingredients));
      proteins.slice(1).forEach((protein, i) => expect(protein).not.toBe(proteins[i]));
    }
  });

  it('gives the same plan for the same random numbers, and others for others', () => {
    const a = ids(buildPlan(recipes, 5, context(), new Set(), seeded(7)));
    expect(ids(buildPlan(recipes, 5, context(), new Set(), seeded(7)))).toEqual(a);
    expect(ids(buildPlan(recipes, 5, context(), new Set(), seeded(8)))).not.toEqual(a);
  });
});

describe('pickWeight', () => {
  const recipe = recipes[0];
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it('favours favourites and well-rated recipes, and not ones cooked lately', () => {
    expect(pickWeight(recipe, context())).toBe(1);
    expect(pickWeight(recipe, context({ favourites: new Set([recipe.id]) }))).toBe(2);
    const loved = [{ recipeId: recipe.id, cookedAt: daysAgo(40), rating: 5 }];
    expect(pickWeight(recipe, context({ history: loved }))).toBe(1.5);
    const recent = [{ recipeId: recipe.id, cookedAt: daysAgo(3), rating: null }];
    expect(pickWeight(recipe, context({ history: recent }))).toBe(0.25);
    const meh = [{ recipeId: recipe.id, cookedAt: daysAgo(40), rating: 2 }];
    expect(pickWeight(recipe, context({ history: meh }))).toBe(1);
  });

  it('makes favourites come up more often', () => {
    const pool = recipes.slice(0, 10);
    const favourite = pool[4].id;
    let withFavourite = 0;
    let without = 0;
    for (let seed = 0; seed < 300; seed++) {
      const fav = buildPlan(
        pool,
        1,
        context({ favourites: new Set([favourite]) }),
        new Set(),
        seeded(seed),
      );
      const plain = buildPlan(pool, 1, context(), new Set(), seeded(seed));
      if (fav[0].id === favourite) withFavourite++;
      if (plain[0].id === favourite) without++;
    }
    expect(withFavourite).toBeGreaterThan(without);
  });
});

describe('swapPick', () => {
  it('replaces one pick with a recipe not already in the plan', () => {
    const picks = buildPlan(recipes, 5, context(), new Set(), seeded(4));
    const swap = swapPick(recipes, picks, 2, context(), new Set(), seeded(5));
    expect(swap).not.toBeNull();
    expect(ids(picks)).not.toContain(swap?.id);
  });

  it('has nothing to offer when every recipe is taken', () => {
    const pool = recipes.slice(0, 3);
    expect(swapPick(pool, pool, 1, context())).toBeNull();
  });
});
