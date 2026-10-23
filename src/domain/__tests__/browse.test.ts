import { catalog } from '@/catalog';
import { browseRecipes } from '@/domain/browse';

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
    expect(ids(browseRecipes(recipes, ingredients, 'all', 'salmon')).sort()).toEqual([
      'lemon-garlic-salmon-green-beans',
      'miso-salmon-bok-choy',
      'salmon-teriyaki-bowls',
    ]);
    // "shrimp" isn't in every title, but it's an ingredient in each of these.
    expect(ids(browseRecipes(recipes, ingredients, 'all', 'shrimp')).sort()).toEqual([
      'garlic-butter-shrimp-zucchini',
      'shrimp-fried-rice',
      'shrimp-scampi-pasta',
      'shrimp-tacos-mango-salsa',
    ]);
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
});
