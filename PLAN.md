# Mealz — Plan

A React Native meal-planning app modelled on Mealime: browse recipes, add them to a plan, get one combined grocery list, then cook each meal from step-by-step instructions.

## 1. The core loop

Mealime works because it does one loop well. We copy that loop:

1. **Browse.** A scrolling feed of recipe cards, filtered to your diet and allergies.
2. **Plan.** Tap `+` on a card to add it to "My Plan". Set the servings for each recipe.
3. **Shop.** The grocery list builds itself from every planned recipe. Ingredients are merged ("2 onions" + "1 onion" = "3 onions") and grouped by store aisle. Check items off as you shop.
4. **Cook.** Open a planned meal to get a cook mode: ingredients first, then one step at a time, with timers and the screen kept on.
5. **Finish.** Mark the meal as cooked. It leaves the plan and goes to history, and you can rate it or save it as a favourite.

Everything else in this plan supports that loop.

### Decisions

- **Recipes:** we write our own catalog, using common dishes found online as reference (see §9).
- **No accounts.** All data stays on the device. There is no backend in v1.
- **The plan is a simple list** of recipes, not tied to days of the week, as in Mealime.
- **iOS first.** Android follows later from the same codebase.

## 2. Tech stack

| Concern         | Choice                                                       | Why                                                                           |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Framework       | **Expo** (current SDK) + TypeScript                          | Fast setup; EAS Build and Submit for iOS and TestFlight                       |
| Catalog updates | **EAS Update** (OTA)                                         | Ships new recipes without an App Store review, so no server is needed         |
| Navigation      | **Expo Router** (file-based)                                 | Tabs and stacks with deep links built in                                      |
| Local DB        | **expo-sqlite + Drizzle ORM**                                | User data (plan, grocery list, history) is relational and must work offline   |
| App state       | **Zustand**                                                  | Small UI and session state (filters, cook-mode progress)                      |
| Lists           | **@shopify/flash-list**                                      | Fast recipe feed and grocery list                                             |
| Images          | **expo-image**                                               | Caching and blurhash placeholders                                             |
| Animation       | **react-native-reanimated** + **gesture-handler**            | Swipe to check off, sheet transitions                                         |
| Cook mode       | **expo-keep-awake**, **expo-notifications**                  | Keeps the screen on; timer alerts                                             |
| Styling         | **StyleSheet + theme tokens** (`src/constants/theme.ts`)     | No extra dependency; NativeWind support for SDK 58 / Reanimated 4 is unproven |
| Testing         | **Jest + React Native Testing Library**, **Maestro** for E2E | The grocery merge logic needs heavy unit tests                                |

**Data strategy:** fully on-device. The recipe catalog ships with the app as JSON (`src/catalog/data/`, about 60 recipes at launch) and is read straight into memory. At this size, filtering and search in memory are instant, so the catalog is not copied into SQLite. New recipes reach users through EAS Update.

User data (preferences, plan, grocery list, favourites, history) lives only in SQLite on the device. There are no accounts, no sync and no backend. Because nothing personal leaves the phone, the App Store privacy label is "Data Not Collected".

**iOS first:** design and QA on iPhone only (no iPad layout in v1). Follow iOS conventions: large titles, swipe actions, haptics and system sheets. Distribute through TestFlight and then the App Store. Stick to cross-platform libraries so an Android build later is mainly QA work.

## 3. Navigation and screens

```
src/app/
  _layout.tsx                 root stack, providers, DB migration on boot
  onboarding/                 first-run flow (modal stack)
    diet.tsx                  Classic / Vegetarian / Vegan / Pescatarian / Low-carb …
    allergies.tsx             Gluten, dairy, nuts, shellfish, egg, soy …
    dislikes.tsx              ingredients to exclude (search + chips)
    household.tsx             default servings (1–6)
  (tabs)/
    _layout.tsx               native bottom tabs
    (recipes)/index.tsx       Recipes (browse feed, search, filter chips)
    plan/index.tsx            My Plan
    groceries/index.tsx       Grocery List
    profile/index.tsx         preferences, favourites, history, settings
                              (each tab folder has its own _layout.tsx stack with a large title)
  recipe/[id].tsx             recipe detail (overview, ingredients, steps preview)
  cook/[planItemId].tsx       cook mode (full-screen, step pager)
  grocery/add.tsx             add a custom grocery item (sheet)
```

Search is the native iOS search bar in the Recipes header, so there is no separate search screen.

### Screen notes

**Recipes (browse)**

- Large photo cards showing title, total time and a few tags ("Quick", "Kid-friendly").
- A `+` / ✓ toggle on each card adds or removes it from the plan without opening it.
- Horizontal category rows ("Under 30 minutes", "One-pan", "New this week") on top of a filterable grid.
- Recipes that break the user's diet or allergies are hidden. Dislikes are hidden or flagged with a badge.
- A sticky "My Plan (3)" pill at the bottom opens the plan.

**Recipe detail**

- Hero image, time, difficulty and a servings stepper (2 / 4 / 6).
- Ingredients scale with servings in real time.
- Nutrition per serving, which can be collapsed.
- Main button: **Add to Plan** (or **Remove**). Secondary: ♥ Favourite.

**My Plan**

- Planned recipes in a list, each with its servings stepper and a **Cook** button.
- Swipe to remove. Reorder by dragging (optional).
- Call to action: **View Grocery List**. The list rebuilds whenever the plan changes.
- Empty state links back to Browse.

**Grocery List**

- Grouped by aisle: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry, Spices, Frozen, Other.
- Each row shows the merged quantity, the ingredient name and, when expanded, which recipes need it.
- Tap to check off. Checked items drop to a collapsed "In cart" section.
- A "Pantry staples" toggle hides items like salt, pepper and oil, or moves them to a "You probably have" group.
- Add custom items (e.g. "paper towels"), which are kept when the list rebuilds.
- Share or export as text through the iOS share sheet. With no accounts, this is how a household shares the list (Messages, Notes, Reminders).

**Cook mode**

- Before you start: a "Get ready" screen with every ingredient as a checklist (the mise en place).
- Then one step per page, swiped horizontally, in large type:
  - The ingredients used in that step (with amounts) appear under the instruction.
  - Durations mentioned in a step ("simmer 10 minutes") show as tappable timer chips. Timers keep running in the background and send a notification.
- The screen stays on for the whole session.
- Last page: **Mark as cooked**, with an optional 1–5 rating. The recipe moves from Plan to History.

**Profile**

- Edit diet, allergies, dislikes and default servings.
- Favourites, cooking history, units (US / metric) and theme.
- "Reset all data", since there is no account to delete.

## 4. Data model

```ts
// Catalog (read-only; bundled with the app, updated over the air)
// Source of truth: src/catalog/types.ts
Ingredient {
  id: string                 // canonical, kebab-case, e.g. "yellow-onion"
  name: string               // "yellow onion"
  plural?: string            // defaults to name + "s"
  aisle: Aisle               // 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'spices' | 'frozen' | 'other'
  kind: IngredientKind       // 'plant' | 'meat' | 'poultry' | 'fish' | 'shellfish' | 'dairy' | 'egg' | 'honey'
  highCarb?: boolean         // rules a recipe out of low-carb
  allergens?: Allergen[]     // beyond what `kind` implies (dairy/egg/fish/shellfish)
  staple?: boolean           // salt, pepper, oil…
  unitConversions?: …        // M3: e.g. 1 clove → 3 g
  nutritionPer100g?: …       // later: from USDA FoodData Central
}

Recipe {
  id, title, description
  image: string | null
  baseServings: number       // 4 for every recipe so far
  prepMinutes, cookMinutes
  difficulty: 'easy' | 'medium'
  tags: string[]
  reviewed: boolean          // only reviewed recipes ship in release builds
  ingredients: RecipeIngredient[]
  steps: Step[]
  // derived when the app loads (src/catalog/derive.ts): totalMinutes, diets, allergens
}

RecipeIngredient {
  id: string                 // local id, unique within the recipe
  ingredient: string         // canonical Ingredient id
  quantity: number | null    // null = "to taste"
  unit: Unit | null          // 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'whole' | 'clove' | 'can' | 'bunch' | 'slice'
  prep?: string              // "finely diced"
  optional?: boolean         // optional items don't count against diets or allergens
}

Step {
  text: string               // order = position in the array
  uses: string[]             // local RecipeIngredient ids used in this step
  timerMinutes?: number
}

// User data (SQLite, local-first)
Preferences { diet, allergies[], dislikedIngredientIds[], defaultServings, units }
PlanItem    { id, recipeId, servings, addedAt, cookedAt?: Date, rating?: number }
GroceryItem {
  id
  ingredientId?: string      // null for custom items
  customName?: string
  quantity, unit
  checked: boolean
  source: 'generated' | 'custom'
  sourcePlanItemIds: string[]
}
Favourite   { recipeId, savedAt }
```

**Rule:** recipe ingredients must point at canonical `Ingredient` ids, not free text. Merging the grocery list, filtering by allergy and grouping by aisle all rely on this, so it is the most important data decision in the app.

## 5. Grocery list compilation

This is pure TypeScript in `src/domain/grocery/`, with no React or database code, and it carries the most unit tests.

```
compileGroceryList(planItems, recipes, ingredients, prefs) → GroceryLine[]

1. For each active PlanItem:
     scale = planItem.servings / recipe.baseServings
     for each RecipeIngredient: emit { ingredientId, qty * scale, unit, planItemId }
2. Normalize units into one dimension per ingredient:
     mass → g, volume → ml, count → whole
     use ingredient.unitConversions for cross-dimension cases (cloves ↔ heads, etc.)
3. Group by ingredientId (+ dimension, if it still can't be converted) and sum.
4. Convert back to a friendly unit for display:
     1250 ml → "5 cups" (US) or "1.25 l" (metric); 0.33 whole → "⅓"
     round to shopping-friendly values (round count items up: 2.3 lemons → 3)
5. Tag pantry staples; attach aisle; attach recipe names for "used in".
6. Sort by aisle order, then name.
```

**Keeping user edits when the plan changes:** generated rows are rebuilt from scratch, but checked state is copied over by `ingredientId`. Custom items are never touched.

**Edge cases to test:** "to taste" with no quantity (show it once, no number); optional ingredients; the same ingredient in different units (1 cup + 200 g flour); fractional counts; a recipe in the plan twice; scaling down to 1 serving.

## 6. Recipe filtering

```
visible(recipe) =
  recipe.diets ⊇ prefs.diet
  AND no ingredient.allergens ∩ prefs.allergies
  AND (hideDislikes ? no ingredient ∈ prefs.dislikes : true)
```

Each recipe's diets and allergens are worked out once, when the catalog loads, from each ingredient's `kind`, `highCarb` and `allergens`. Filtering is then a cheap in-memory check. Diet and quick-recipe chips plus search live in `src/domain/browse.ts`; preference-based filtering arrives in M5.

## 7. Project structure

```
mealz/
  src/
    app/                     Expo Router routes (screens only, thin)
    components/              RecipeCard, RecipeImage, ServingsStepper, Chip, EmptyState …
    catalog/
      types.ts               catalog types and enums
      derive.ts              diets/allergens/total time from ingredients
      validate.ts            catalog checks (shared by the script and tests)
      index.ts               builds the in-memory catalog; hides drafts in release builds
      SOURCES.md             reference dishes used as inspiration (internal, not shipped)
      data/
        ingredients.json     canonical ingredient list
        recipes/*.json       one file per recipe
        index.ts             imports every recipe file
    domain/                  pure logic: quantity formatting/scaling, browse filters, grocery compile (M3)
    db/
      schema.ts              Drizzle schema (user data only)
      client.ts
    constants/theme.ts       design tokens
    hooks/
  drizzle/                   generated migrations (`npm run db:generate`)
  scripts/validate-catalog.ts  `npm run catalog:validate`
```

## 8. Milestones

**M0 — Scaffold (½ day)** ✅
Expo SDK 58 + TS + Expo Router native tabs, ESLint/Prettier, Jest, the Drizzle/SQLite setup with the first migration, and EAS config for an iOS development build plus a TestFlight profile.

**M1 — Catalog and browse (2–3 days)** ✅
The canonical ingredient list, catalog JSON format and validation script, with the first 20 recipes written (drafts, placeholder images). The browse feed with search and filter chips, recipe detail and servings scaling.

**M2 — Plan (1–2 days)** ✅
Add and remove from plan on cards and on detail. The My Plan tab with a servings stepper for each item, swipe to remove, Clear, and a View Grocery List button. Plan saved in SQLite. A count badge on the My Plan tab stands in for the floating "My Plan (3)" pill. One active plan item per recipe; new items default to 2 servings until onboarding (M5) sets a household size.

**M3 — Grocery list (3 days)** ⭐ the core feature ✅
The domain compile function with full unit tests. Aisle-grouped UI, check-off with an "In cart" section, custom items, pantry staples, rebuild that keeps checked state, and sharing as text.
Built as: the list is recomputed from the plan on every render (`src/domain/grocery.ts`); only checks (per ingredient id) and custom items are stored. Staples go in a "You probably have" section rather than behind a toggle. Clearing the plan also clears checks. Amounts round up to what you can buy (whole onions, next ¼ cup / ¼ lb). An ingredient used in units that can't be converted shows both amounts ("4 oz + 1"); `unitConversions` will handle that when a recipe needs it.

**M4 — Cook mode (2–3 days)** ✅
The "Get ready" ingredient checklist, the step pager with ingredients for each step, timer chips with background notifications, keep-awake, and mark as cooked with a rating, which moves the recipe to history.
Built as: a full-screen modal at `/cook/[id]`, opened from a Cook button on each My Plan row or Start Cooking on a planned recipe's page. Steps page by swipe or Back/Next. Timers come from each step's `timerMinutes`; they live in memory (Zustand) so they keep running across steps and outside cook mode, show in a strip at the top, and schedule a local notification (expo-notifications, asked for on first use). Finishing stops that recipe's timers. History is stored (`cookedAt`, `rating`) but not shown until the Profile work in M5/M6.

**M5 — Onboarding and preferences (1–2 days)** ✅
The diet, allergies, dislikes and household flow. Filtering wired into browse, and a Profile tab to edit preferences later.
Built as: a welcome screen plus four steps under `/onboarding`, each saving as you answer. The root layout uses protected routes, so the tabs appear only once `onboardedAt` is set, and Reset all data sends you back to onboarding. Recipes that don't fit (diet, allergens, or a non-optional disliked ingredient) are hidden from browse, with a "N hidden · Edit" note. The household size sets new plan items' servings, and the units setting (US or metric) drives the grocery list; recipe pages still show recipes' own units. The Profile tab edits everything with the same pickers and has Reset all data.

**M6 — Polish and catalog completion (3 days)**
Search and filters (time, tags), favourites, history, empty states, haptics, dark mode, accessibility (Dynamic Type, VoiceOver labels) and the app icon and splash screen. Bring the catalog to about 60 recipes.

**M7 — iOS launch (1–2 days, plus review time)**
TestFlight beta, App Store screenshots and listing, the "Data Not Collected" privacy label and a privacy policy page. Submit for review.

**After launch:** an Android build and QA pass; new recipes shipped regularly through EAS Update; nutrition totals for the whole plan; "use up leftovers" suggestions that favour recipes sharing ingredients already in the plan (a key Mealime idea that cuts waste); a grocery-list widget; iCloud backup of user data (it would sync without accounts).

## 9. Recipe catalog

We write the recipes ourselves, using common dishes found online as reference.

**Sourcing rules**

- Use online recipes only as reference for _which dishes_ to include and typical ingredient ratios. Dish ideas, ingredient lists and quantities are fine to draw from.
- **Write every description and instruction step from scratch** in our own voice. Never copy or lightly paraphrase another site's method text, headnotes or photos.
- Each recipe is a blend of several references, adjusted to fit our format (4 base servings, about 30 minutes, short ingredient lists), not a copy of a single source.
- Record the reference dishes in `src/catalog/SOURCES.md` for our own tracking. This file is not shipped in the app.

**Images:** our own photos, AI-generated images reviewed for accuracy, or stock photos under a licence that allows app use (e.g. Unsplash). Record the licence or source for each image. Use plain placeholder images until real ones exist.

**Catalog shape (about 60 recipes at launch)**

- A mix that works for every diet option: about 40% vegetarian or vegan; pescatarian and low-carb dishes in every category.
- Mostly 30 minutes or less with 10 ingredients or fewer, matching Mealime's "quick weeknight" focus.
- Reuse ingredients across recipes (cilantro, limes, bell peppers…) so a week's plan wastes less food. The ingredient list should stay around 200–250 entries.

**Authoring workflow**

1. Pick a dish, gather 2–3 reference recipes and list them in `SOURCES.md`.
2. Draft the recipe JSON in `src/catalog/data/recipes/` and import it in `data/index.ts` (Claude can do this). Use only canonical ingredient ids. Add a new ingredient (with aisle, kind and allergens) only when one is truly needed.
3. Write the steps with `uses` and `timerMinutes` filled in.
4. Run `npm run catalog:validate`. It fails on unknown ids, bad units, ingredients no step uses, files missing from the index, or a reviewed recipe without an image. Steps with no ingredients (e.g. "heat the oven") are allowed.
5. Test-cook or sanity-check the recipe, then mark it `reviewed: true`. Only reviewed recipes ship.

**Nutrition:** calculate it from ingredient data (store per-100 g values on `Ingredient`, sourced from USDA FoodData Central, which is public domain) rather than entering it by hand.
