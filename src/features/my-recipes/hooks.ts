import type { Ingredient, RecipeSource } from '@/catalog/types';
import { db } from '@/db/client';
import { backUpRecipe, removeBackup } from '@/features/backup/backup';
import { photoName } from '@/features/backup/format';
import { deleteUserRecipe, saveUserRecipe } from '@/features/my-recipes/my-recipes';
import { deletePhoto } from '@/features/my-recipes/photos';

export const myRecipeActions = {
  /** Saves a user recipe; `previousImage` is deleted if the photo changed. */
  save: async (
    recipe: RecipeSource,
    newIngredients: Ingredient[],
    previousImage?: string | null,
  ) => {
    await saveUserRecipe(db, recipe, newIngredients);
    const replaced = previousImage && previousImage !== recipe.image ? previousImage : null;
    if (replaced) deletePhoto(replaced);
    backUpRecipe(recipe, photoName(replaced));
  },
  remove: async (recipe: RecipeSource) => {
    await deleteUserRecipe(db, recipe.id);
    deletePhoto(recipe.image);
    removeBackup(recipe, photoName(recipe.image));
  },
};
