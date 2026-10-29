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

// Illustrations (drawn by `npm run catalog:illustrations`): each must belong to a
// recipe, be listed in their index, and stay simple enough for iOS to draw.
const illustrationsDir = path.join(dataDir, 'illustrations');
const MAX_ILLUSTRATION_BYTES = 100_000;
const illustrationIndex = fs.readFileSync(path.join(illustrationsDir, 'index.ts'), 'utf8');
const recipeIds = new Set(recipes.map((r) => r.id));
const illustrated = new Set<string>();
for (const file of fs.readdirSync(illustrationsDir).filter((f) => f.endsWith('.svg'))) {
  const svg = fs.readFileSync(path.join(illustrationsDir, file), 'utf8');
  const where = `illustrations/${file}`;
  illustrated.add(file.replace(/\.svg$/, ''));
  if (!recipeIds.has(file.replace(/\.svg$/, ''))) errors.push(`${where}: no recipe with this id`);
  if (!illustrationIndex.includes(`'./${file}'`))
    errors.push(`${where}: not listed in illustrations/index.ts`);
  if (!/<svg[^>]*\sviewBox="/.test(svg)) errors.push(`${where}: missing viewBox`);
  if (svg.length > MAX_ILLUSTRATION_BYTES)
    errors.push(`${where}: larger than ${MAX_ILLUSTRATION_BYTES / 1000} KB`);
  // iOS's SVG renderer can misdraw arc commands, so drawings use curves instead.
  if (/\sd="[^"]*[Aa]/.test(svg)) errors.push(`${where}: path uses an arc command`);
}

const result = validateCatalog(ingredients, recipes, illustrated);
errors.push(...result.errors);

for (const w of result.warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

const reviewed = recipes.filter((r) => r.reviewed).length;
if (release && reviewed < MIN_RELEASE_RECIPES) {
  errors.push(
    `only ${reviewed} recipes are reviewed; App Store builds need at least ${MIN_RELEASE_RECIPES} ` +
      `(mark them "reviewed": true once checked)`,
  );
  console.error(`error: ${errors[errors.length - 1]}`);
}
console.log(
  `\n${recipes.length} recipes (${reviewed} reviewed), ${ingredients.length} ingredients: ` +
    `${errors.length} errors, ${result.warnings.length} warnings`,
);
process.exit(errors.length > 0 ? 1 : 0);
