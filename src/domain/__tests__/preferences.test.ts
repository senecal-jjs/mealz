import { catalog, getRecipe } from '@/catalog';
import { fitsPreferences, type RecipeFilterPrefs } from '@/domain/preferences';

const none: RecipeFilterPrefs = { diet: null, allergies: [], dislikedIngredientIds: [] };
const fits = (id: string, prefs: Partial<RecipeFilterPrefs>) =>
  fitsPreferences(getRecipe(id)!, { ...none, ...prefs });

describe('fitsPreferences', () => {
  it('allows everything with no preferences', () => {
    expect(catalog.recipes.every((r) => fitsPreferences(r, none))).toBe(true);
  });

  it('filters by diet', () => {
    expect(fits('shakshuka', { diet: 'vegetarian' })).toBe(true);
    expect(fits('shakshuka', { diet: 'vegan' })).toBe(false);
    expect(fits('shrimp-fried-rice', { diet: 'pescatarian' })).toBe(true);
    expect(fits('shrimp-fried-rice', { diet: 'vegetarian' })).toBe(false);
  });

  it('filters out allergens', () => {
    expect(fits('peanut-noodles', { allergies: ['peanut'] })).toBe(false);
    expect(fits('caprese-pasta', { allergies: ['gluten'] })).toBe(false);
    expect(fits('lemon-garlic-salmon-green-beans', { allergies: ['peanut', 'soy'] })).toBe(true);
  });

  it('filters out disliked ingredients, but not optional ones', () => {
    expect(fits('peanut-noodles', { dislikedIngredientIds: ['cilantro'] })).toBe(false);
    // Cilantro is only an optional garnish on the fajitas.
    expect(fits('sheet-pan-chicken-fajitas', { dislikedIngredientIds: ['cilantro'] })).toBe(true);
  });

  it('leaves vegans with a handful of recipes', () => {
    const vegan = catalog.recipes.filter((r) => fitsPreferences(r, { ...none, diet: 'vegan' }));
    expect(vegan.length).toBeGreaterThanOrEqual(5);
  });
});
