import {
  AISLES,
  ALLERGENS,
  INGREDIENT_KINDS,
  UNITS,
  type Ingredient,
  type RecipeSource,
} from '@/catalog/types';

export type ValidationResult = { errors: string[]; warnings: string[] };

/**
 * Checks the authored catalog for mistakes that would break the app: broken
 * references, bad units, ingredients no step uses. Shared by the
 * `catalog:validate` script and the unit tests. `illustrated` lists the
 * recipes with a drawing (src/catalog/data/illustrations), which stands in
 * for a photo.
 */
export function validateCatalog(
  ingredients: Ingredient[],
  recipes: RecipeSource[],
  illustrated: ReadonlySet<string> = new Set(),
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ingredientIds = new Set<string>();
  for (const ing of ingredients) {
    const where = `ingredient "${ing.id}"`;
    if (ingredientIds.has(ing.id)) errors.push(`${where}: duplicate id`);
    ingredientIds.add(ing.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ing.id)) errors.push(`${where}: id must be kebab-case`);
    if (!ing.name) errors.push(`${where}: missing name`);
    if (!AISLES.includes(ing.aisle)) errors.push(`${where}: unknown aisle "${ing.aisle}"`);
    if (!INGREDIENT_KINDS.includes(ing.kind)) errors.push(`${where}: unknown kind "${ing.kind}"`);
    for (const a of ing.allergens ?? []) {
      if (!ALLERGENS.includes(a)) errors.push(`${where}: unknown allergen "${a}"`);
    }
  }

  const used = new Set<string>();
  const recipeIds = new Set<string>();
  for (const recipe of recipes) {
    const where = `recipe "${recipe.id}"`;
    if (recipeIds.has(recipe.id)) errors.push(`${where}: duplicate id`);
    recipeIds.add(recipe.id);

    if (!recipe.title) errors.push(`${where}: missing title`);
    if (!(recipe.baseServings > 0)) errors.push(`${where}: baseServings must be positive`);
    if (recipe.ingredients.length === 0) errors.push(`${where}: no ingredients`);
    if (recipe.steps.length === 0) errors.push(`${where}: no steps`);
    if (recipe.reviewed && !recipe.image && !illustrated.has(recipe.id)) {
      errors.push(`${where}: reviewed recipes need a photo or an illustration`);
    }

    const localIds = new Set<string>();
    for (const item of recipe.ingredients) {
      const at = `${where} ingredient "${item.id}"`;
      if (localIds.has(item.id)) errors.push(`${at}: duplicate local id`);
      localIds.add(item.id);
      used.add(item.ingredient);

      if (!ingredientIds.has(item.ingredient)) {
        errors.push(`${at}: unknown ingredient "${item.ingredient}"`);
      }
      if (item.unit !== null && !UNITS.includes(item.unit)) {
        errors.push(`${at}: unknown unit "${item.unit}"`);
      }
      if (item.quantity === null && item.unit !== null) {
        errors.push(`${at}: a "to taste" ingredient can't have a unit`);
      }
      if (item.quantity !== null && !(item.quantity > 0)) {
        errors.push(`${at}: quantity must be positive`);
      }
    }

    const usedLocal = new Set<string>();
    recipe.steps.forEach((step, i) => {
      const at = `${where} step ${i + 1}`;
      if (!step.text) errors.push(`${at}: empty text`);
      for (const ref of step.uses) {
        if (!localIds.has(ref)) errors.push(`${at}: uses unknown ingredient "${ref}"`);
        usedLocal.add(ref);
      }
      if (step.timerMinutes !== undefined && !(step.timerMinutes > 0)) {
        errors.push(`${at}: timerMinutes must be positive`);
      }
    });
    for (const id of localIds) {
      if (!usedLocal.has(id)) errors.push(`${where}: ingredient "${id}" isn't used by any step`);
    }
  }

  for (const id of ingredientIds) {
    if (!used.has(id)) warnings.push(`ingredient "${id}" isn't used by any recipe`);
  }

  return { errors, warnings };
}
