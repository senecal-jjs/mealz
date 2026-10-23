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
    expect(ids(browseRecipes(recipes, ingredients, 'all', 'salmon'))).toEqual([
      'lemon-garlic-salmon-green-beans',
    ]);
    expect(ids(browseRecipes(recipes, ingredients, 'all', 'shrimp'))).toEqual([
      'shrimp-fried-rice',
    ]);
  });

  it('combines filter and query', () => {
    expect(browseRecipes(recipes, ingredients, 'vegan', 'feta')).toEqual([]);
  });
});
