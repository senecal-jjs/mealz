export const UNITS = [
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'whole',
  'clove',
  'can',
  'bunch',
  'slice',
] as const;
export type Unit = (typeof UNITS)[number];

export const AISLES = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'pantry',
  'spices',
  'frozen',
  'other',
] as const;
export type Aisle = (typeof AISLES)[number];

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: 'Produce',
  meat: 'Meat & Seafood',
  dairy: 'Dairy & Eggs',
  bakery: 'Bakery',
  pantry: 'Pantry',
  spices: 'Spices & Seasonings',
  frozen: 'Frozen',
  other: 'Other',
};

export const ALLERGENS = [
  'gluten',
  'dairy',
  'egg',
  'peanut',
  'tree-nut',
  'fish',
  'shellfish',
  'soy',
  'sesame',
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  dairy: 'Dairy',
  egg: 'Egg',
  peanut: 'Peanuts',
  'tree-nut': 'Tree nuts',
  fish: 'Fish',
  shellfish: 'Shellfish',
  soy: 'Soy',
  sesame: 'Sesame',
};

export const DIETS = ['vegetarian', 'vegan', 'pescatarian', 'low-carb'] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  'low-carb': 'Low-carb',
};

/**
 * What an ingredient is, for diet purposes. Each kind implies which diets it
 * breaks (see `derive.ts`), so authors don't have to list diets by hand.
 */
export const INGREDIENT_KINDS = [
  'plant',
  'meat',
  'poultry',
  'fish',
  'shellfish',
  'dairy',
  'egg',
  'honey',
] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

/** A canonical ingredient. Recipes refer to these by `id`. */
export type Ingredient = {
  id: string;
  name: string;
  /** Defaults to `name` + "s" when omitted. */
  plural?: string;
  aisle: Aisle;
  kind: IngredientKind;
  /** Starchy or sugary enough to rule a recipe out of low-carb. */
  highCarb?: boolean;
  /** Allergens beyond the ones `kind` already implies (dairy, egg, fish, shellfish). */
  allergens?: Allergen[];
  /** Salt, pepper, oil… — most kitchens already have these. */
  staple?: boolean;
};

export type RecipeIngredient = {
  /** Local id, unique within the recipe; steps refer to it in `uses`. */
  id: string;
  ingredient: string;
  /** `null` means "to taste" (unit must also be null). */
  quantity: number | null;
  unit: Unit | null;
  prep?: string;
  optional?: boolean;
};

export type Step = {
  text: string;
  /** Local ids of the recipe ingredients this step uses. */
  uses: string[];
  timerMinutes?: number;
};

/** A recipe as authored in `src/catalog/data/recipes/*.json`. */
export type RecipeSource = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  baseServings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: 'easy' | 'medium';
  tags: string[];
  reviewed: boolean;
  ingredients: RecipeIngredient[];
  steps: Step[];
};

/** A recipe with facts derived from its ingredients, as the app uses it. */
export type Recipe = RecipeSource & {
  totalMinutes: number;
  diets: Diet[];
  allergens: Allergen[];
  /** Added by the user (typed in or scanned) rather than bundled with the app. */
  mine: boolean;
};
