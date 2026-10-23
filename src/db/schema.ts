/**
 * User data. The recipe catalog is not stored here: it ships with the app as
 * JSON and is read in memory (see `src/catalog`). Tables refer to catalog
 * recipes and ingredients by id.
 *
 * After changing this file run `npm run db:generate` to add a migration.
 */
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Allergen, Diet, Unit } from '@/catalog/types';

/** A single row (id = 1) holding the user's onboarding choices. */
export const preferences = sqliteTable('preferences', {
  id: integer('id').primaryKey(),
  diet: text('diet').$type<Diet>(),
  allergies: text('allergies', { mode: 'json' }).$type<Allergen[]>().notNull().default([]),
  dislikedIngredientIds: text('disliked_ingredient_ids', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  defaultServings: integer('default_servings').notNull().default(2),
  units: text('units').$type<'us' | 'metric'>().notNull().default('us'),
  onboardedAt: integer('onboarded_at', { mode: 'timestamp' }),
});

export const planItems = sqliteTable('plan_items', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id').notNull(),
  servings: integer('servings').notNull(),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
  cookedAt: integer('cooked_at', { mode: 'timestamp' }),
  rating: integer('rating'),
});

export const groceryItems = sqliteTable('grocery_items', {
  id: text('id').primaryKey(),
  /** Null for custom items the user typed in. */
  ingredientId: text('ingredient_id'),
  customName: text('custom_name'),
  quantity: real('quantity'),
  unit: text('unit').$type<Unit>(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  source: text('source').$type<'generated' | 'custom'>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const favourites = sqliteTable('favourites', {
  recipeId: text('recipe_id').primaryKey(),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
});
