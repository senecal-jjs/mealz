/**
 * @jest-environment node
 */
import type { Ingredient, RecipeSource } from '@/catalog/types';
import { favourites, planItems } from '@/db/schema';
import { setFavourite } from '@/features/favourites/favourites';
import {
  customIngredientsQuery,
  deleteUserRecipe,
  isUserId,
  newCustomIngredientId,
  newUserRecipeId,
  saveUserRecipe,
  userRecipesQuery,
} from '@/features/my-recipes/my-recipes';
import { activePlanQuery, addToPlan, markCooked } from '@/features/plan/plan';
import { resetAllData } from '@/features/preferences/preferences';
import { createTestDb } from '@/test-utils/test-db';

function recipe(id: string, ingredientIds: string[], title = 'Grandma’s Stew'): RecipeSource {
  return {
    id,
    title,
    description: '',
    image: null,
    baseServings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    difficulty: 'easy',
    tags: [],
    reviewed: true,
    ingredients: ingredientIds.map((ingredient, i) => ({
      id: `i${i}`,
      ingredient,
      quantity: 1,
      unit: 'cup',
    })),
    steps: [{ text: 'Cook it all.', uses: ingredientIds.map((_, i) => `i${i}`) }],
  };
}

const gochujang: Ingredient = {
  id: 'my-gochujang-abcd',
  name: 'gochujang',
  aisle: 'other',
  kind: 'plant',
  allergens: ['soy'],
};

describe('user recipes storage', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
  });

  it('makes ids that never clash with bundled ones', () => {
    expect(isUserId(newUserRecipeId())).toBe(true);
    expect(newCustomIngredientId('Gochujang (Korean chili paste)')).toMatch(
      /^my-gochujang-korean-chili-paste-[a-z0-9]{1,4}$/,
    );
    expect(isUserId('shakshuka')).toBe(false);
  });

  it('saves a recipe with its custom ingredients and updates it in place', async () => {
    await saveUserRecipe(db, recipe('my-1', ['garlic', gochujang.id]), [gochujang]);
    await saveUserRecipe(db, recipe('my-1', ['garlic', gochujang.id], 'Spicy Stew'), [gochujang]);

    const rows = await userRecipesQuery(db);
    expect(rows.map((r) => r.data.title)).toEqual(['Spicy Stew']);
    expect((await customIngredientsQuery(db)).map((c) => c.data.name)).toEqual(['gochujang']);
  });

  it('drops custom ingredients a recipe stops using', async () => {
    await saveUserRecipe(db, recipe('my-1', [gochujang.id]), [gochujang]);
    await saveUserRecipe(db, recipe('my-1', ['garlic']));
    expect(await customIngredientsQuery(db)).toEqual([]);
  });

  it('deleting a recipe removes it from the plan and favourites but keeps history', async () => {
    await saveUserRecipe(db, recipe('my-1', [gochujang.id]), [gochujang]);
    await addToPlan(db, 'my-1');
    await markCooked(db, 'my-1', 5);
    await addToPlan(db, 'my-1');
    await setFavourite(db, 'my-1', true);
    await addToPlan(db, 'shakshuka');

    await deleteUserRecipe(db, 'my-1');
    expect(await userRecipesQuery(db)).toEqual([]);
    expect(await customIngredientsQuery(db)).toEqual([]);
    expect((await activePlanQuery(db)).map((i) => i.recipeId)).toEqual(['shakshuka']);
    expect(await db.select().from(favourites)).toEqual([]);
    expect((await db.select().from(planItems)).map((i) => i.rating)).toContain(5);
  });

  it('reset all data wipes user recipes too', async () => {
    await saveUserRecipe(db, recipe('my-1', [gochujang.id]), [gochujang]);
    await resetAllData(db);
    expect(await userRecipesQuery(db)).toEqual([]);
    expect(await customIngredientsQuery(db)).toEqual([]);
  });
});
