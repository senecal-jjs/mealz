import { catalog } from '@/catalog';
import { browseRecipes, dailyOrder, localDay } from '@/domain/browse';

const { recipes, ingredients } = catalog;
const ids = (list: { id: string }[]) => list.map((r) => r.id);

describe('browseRecipes', () => {
  it('returns everything for "all" with no query', () => {
    expect(browseRecipes(recipes, ingredients, 'all', '')).toHaveLength(recipes.length);
  });

  it('filters quick recipes by total time', () => {
    const quick = browseRecipes(recipes, ingredients, 'quick', '');
    expect(quick.length).toBeGreaterThan(0);
    expect(quick.every((r) => r.totalMinutes <= 30)).toBe(true);
  });

  it('filters by diet', () => {
    const vegan = browseRecipes(recipes, ingredients, 'vegan', '');
    expect(ids(vegan)).toContain('chickpea-coconut-curry');
    expect(ids(vegan)).not.toContain('shakshuka');
  });

  it('searches titles and ingredient names', () => {
    expect(ids(browseRecipes(recipes, ingredients, 'all', 'TACO'))).toEqual(
      expect.arrayContaining(['black-bean-tacos-lime-slaw', 'turkey-taco-lettuce-wraps']),
    );
    // Every match uses the ingredient; some ("Kung Pao", "Jambalaya") only say so in it.
    const uses = (id: string) => (r: (typeof recipes)[0]) =>
      r.ingredients.some((i) => i.ingredient === id);
    const salmon = browseRecipes(recipes, ingredients, 'all', 'salmon');
    expect(ids(salmon)).toEqual(
      expect.arrayContaining(['lemon-garlic-salmon-green-beans', 'miso-salmon-bok-choy']),
    );
    expect(salmon.every(uses('salmon-fillet'))).toBe(true);
    const shrimp = browseRecipes(recipes, ingredients, 'all', 'shrimp');
    expect(ids(shrimp)).toEqual(expect.arrayContaining(['shrimp-sausage-jambalaya']));
    expect(shrimp).toHaveLength(recipes.filter(uses('shrimp')).length);
  });

  it('combines filter and query', () => {
    expect(browseRecipes(recipes, ingredients, 'vegan', 'feta')).toEqual([]);
  });

  it('filters to favourites', () => {
    const favs = new Set(['shakshuka', 'peanut-noodles']);
    expect(ids(browseRecipes(recipes, ingredients, 'favourites', '', favs)).sort()).toEqual([
      'peanut-noodles',
      'shakshuka',
    ]);
    expect(browseRecipes(recipes, ingredients, 'favourites', '')).toEqual([]);
  });

  it('filters by one-pan and kid-friendly tags', () => {
    const onePan = browseRecipes(recipes, ingredients, 'one-pan', '');
    expect(ids(onePan)).toEqual(
      expect.arrayContaining(['chickpea-coconut-curry', 'sheet-pan-chicken-fajitas']),
    );
    expect(onePan.every((r) => r.tags.includes('one-pot') || r.tags.includes('sheet-pan'))).toBe(
      true,
    );
    const kids = browseRecipes(recipes, ingredients, 'kid-friendly', '');
    expect(kids.length).toBeGreaterThan(5);
    expect(kids.every((r) => r.tags.includes('kid-friendly'))).toBe(true);
  });

  it('filters by the high-carb tag, which never overlaps the low-carb diet', () => {
    const fuel = browseRecipes(recipes, ingredients, 'high-carb', '');
    expect(ids(fuel)).toEqual(expect.arrayContaining(['pasta-e-ceci', 'chicken-burrito-bowls']));
    expect(fuel.every((r) => r.tags.includes('high-carb'))).toBe(true);
    expect(fuel.some((r) => r.diets.includes('low-carb'))).toBe(false);
  });

  it('filters to the user’s own recipes', () => {
    const mine = { ...recipes[0], id: 'my-1', title: 'Mine', mine: true };
    expect(ids(browseRecipes([...recipes, mine], ingredients, 'mine', ''))).toEqual(['my-1']);
  });
});

describe('dailyOrder', () => {
  it('keeps every recipe and the same order all day', () => {
    const today = dailyOrder(recipes, '2026-10-30');
    expect(today).toHaveLength(recipes.length);
    expect(new Set(ids(today))).toEqual(new Set(ids(recipes)));
    expect(ids(dailyOrder(recipes, '2026-10-30'))).toEqual(ids(today));
  });

  it('changes from one day to the next, and isn’t alphabetical', () => {
    const today = ids(dailyOrder(recipes, '2026-10-30'));
    expect(ids(dailyOrder(recipes, '2026-10-31'))).not.toEqual(today);
    expect(today).not.toEqual(ids(recipes));
    // Different recipes come first on different days.
    const firsts = new Set(
      ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map(
        (d) => dailyOrder(recipes, d)[0].id,
      ),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('names the day in local time', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
