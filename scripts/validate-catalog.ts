/**
 * Checks the recipe catalog. Run with `npm run catalog:validate`; exits non-zero on errors.
 *
 * With `--release` (`npm run catalog:release-check`, run automatically before EAS
 * production builds) it also fails unless enough recipes are reviewed, since App
 * Store builds only include reviewed recipes.
 *
 * Reads the JSON straight from disk (not through data/index.ts) so it can also
 * catch recipe files that were added but never registered in the index.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Ingredient, RecipeSource } from '../src/catalog/types';
import { validateCatalog } from '../src/catalog/validate';

/** The fewest reviewed recipes worth shipping; below this the app feels empty. */
const MIN_RELEASE_RECIPES = 20;
const release = process.argv.includes('--release');

const dataDir = path.join(__dirname, '../src/catalog/data');
const recipesDir = path.join(dataDir, 'recipes');

const ingredients: Ingredient[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'ingredients.json'), 'utf8'),
);

const errors: string[] = [];
const recipes: RecipeSource[] = [];
const index = fs.readFileSync(path.join(dataDir, 'index.ts'), 'utf8');

for (const file of fs.readdirSync(recipesDir).filter((f) => f.endsWith('.json'))) {
  const recipe: RecipeSource = JSON.parse(fs.readFileSync(path.join(recipesDir, file), 'utf8'));
  recipes.push(recipe);
  if (`${recipe.id}.json` !== file)
    errors.push(`${file}: id "${recipe.id}" doesn't match file name`);
  if (!index.includes(`'./recipes/${file}'`)) errors.push(`${file}: not imported in data/index.ts`);
}

const result = validateCatalog(ingredients, recipes);
errors.push(...result.errors);

for (const w of result.warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

const reviewed = recipes.filter((r) => r.reviewed).length;
if (release && reviewed < MIN_RELEASE_RECIPES) {
  errors.push(
    `only ${reviewed} recipes are reviewed; App Store builds need at least ${MIN_RELEASE_RECIPES} ` +
      `(mark them "reviewed": true once checked and given a photo)`,
  );
  console.error(`error: ${errors[errors.length - 1]}`);
}
console.log(
  `\n${recipes.length} recipes (${reviewed} reviewed), ${ingredients.length} ingredients: ` +
    `${errors.length} errors, ${result.warnings.length} warnings`,
);
process.exit(errors.length > 0 ? 1 : 0);
