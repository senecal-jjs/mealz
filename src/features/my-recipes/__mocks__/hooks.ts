/** Stand-in for user recipe saving, for screen tests. Saved recipes go into the mocked catalog. */
import type { Ingredient, RecipeSource } from '@/catalog/types';

const catalogMock = () =>
  jest.requireMock<typeof import('@/catalog/__mocks__/live')>('@/catalog/live');

let recipes: RecipeSource[] = [];
let ingredients: Ingredient[] = [];

export function resetMockMyRecipes() {
  recipes = [];
  ingredients = [];
}

export const myRecipeActions = {
  save: jest.fn(async (recipe: RecipeSource, newIngredients: Ingredient[]) => {
    recipes = [...recipes.filter((r) => r.id !== recipe.id), recipe];
    ingredients = [...ingredients, ...newIngredients];
    catalogMock().setMockUserContent({ recipes, ingredients });
  }),
  remove: jest.fn(async (recipe: RecipeSource) => {
    recipes = recipes.filter((r) => r.id !== recipe.id);
    catalogMock().setMockUserContent({ recipes, ingredients });
  }),
};
