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
- **No accounts.** All data stays on the device. The only backend is an optional scan server (`server/`) that reads scanned recipes with Claude; it keeps no recipes, only scan counts and the scan credit ledger (against a random wallet ID, not a person).
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

**Data strategy:** fully on-device. The recipe catalog ships with the app as JSON (`src/catalog/data/`, about 120 recipes at launch) and is read straight into memory. At this size, filtering and search in memory are instant, so the catalog is not copied into SQLite. New recipes reach users through EAS Update.

User data (preferences, plan, grocery list, favourites, history) lives only in SQLite on the device. There are no accounts and no sync. The one exception is cloud scanning (below): with the user's consent, a scanned recipe's photos go to the scan server and Anthropic, so the App Store label declares Photos and Other User Content, not linked and for app functionality only.

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
- Tap to check off. Checked items stay visible (filled check, struck through) and move to an "In cart" section at the bottom, so a mistap is easy to undo.
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

**M6 — Polish and catalog completion (3 days)** ✅
Search and filters (time, tags), favourites, history, empty states, haptics, dark mode, accessibility (Dynamic Type, VoiceOver labels) and the app icon and splash screen. Bring the catalog to about 60 recipes.
Built as: a heart on the recipe page and a ♥ Favourites chip, plus One pan and Kid-friendly chips; Favourites and Cooking history (with ratings and "Again" to re-plan) under Profile. The catalog is 60 draft recipes over 121 ingredients: 38 take 30 minutes or less; 29 vegetarian (16 vegan), 38 pescatarian-friendly, 13 low-carb. New icon (Icon Composer file `assets/mealz.icon`, white fork and knife on green) and a matching splash. Checked in dark mode and at accessibility text sizes: headings and buttons cap their growth at 1.4–1.5×, recipe amounts move inline above 1.3× text scale, and headers blur scrolled content on iOS < 26. Recipe photos are still placeholders, and every recipe is still `reviewed: false`, so a release build would show none until they're reviewed (§9).

A second batch of 60 drafts brought the catalog to 120 recipes over 147 ingredients: 83 take 30 minutes or less; 58 vegetarian (31 vegan), 78 pescatarian-friendly, 25 low-carb. Twenty are tagged `high-carb` for endurance training (pasta, rice, noodles, potatoes, couscous, oat pancakes) and have their own High-carb chip; unlike the low-carb diet, which is worked out from ingredients, this is a hand-applied tag. Every recipe has a drawn illustration.

**M7 — iOS launch (1–2 days, plus review time)**
TestFlight beta, App Store screenshots and listing, the "Data Not Collected" privacy label and a privacy policy page. Submit for review.
Prepared (submission itself needs your accounts, see `LAUNCH.md`): EAS profiles where `preview` (TestFlight) includes drafts and `production` only reviewed recipes, with a pre-build check that at least 20 recipes are reviewed; privacy manifest declaring no tracking or collected data; listing copy, review notes and a privacy policy under `docs/`; six 6.9" screenshots from a Release build. Fixed an iOS 26 bug where the tab labels rendered oversized and truncated ("Rec…") when the plan badge appeared just after the tab bar's first layout: the tabs now wait for the plan count before mounting.

**Your own recipes and photo import** ✅
Recipes tab → + offers "Scan a Photo" or "Type It In". Both open one editor: ingredients are typed (or pasted) one per line ("2 large yellow onions, diced"), parsed for amount, unit and prep, and matched to the ingredient list, with a picker to correct a match. Anything unknown becomes a custom ingredient once the user says what kind of food it is (needed for diet filters), its aisle and allergens. Steps get timers from the times they mention, and are linked to the ingredients they name. User recipes and custom ingredients are stored in SQLite (`user_recipes`, `custom_ingredients`) in the catalog's own shapes, merged into a live catalog (`useCatalog`), shown under a "My recipes" chip, never hidden by preference filters, and editable or deletable from their page. Photos are copied into app storage and stored as relative paths.
Scanning uses a local Expo module (`modules/text-recognition`) wrapping Apple's Vision text recognition, entirely on the device. A page can span several photos; lines are put in reading order (two-column cookbook layouts are read column by column), split into title, metadata (servings, prep, cook), ingredients and steps (`src/domain/recipe-text.ts`), and opened in the editor for review. On iOS 26 devices with Apple Intelligence, the scanned text is organized by Apple's on-device model instead (Foundation Models, guided generation into a fixed recipe shape; local module `modules/recipe-model`, weak-linked so the app still runs on older iOS). Its title, description, ingredients and steps are merged with the rule-based reading (which fills anything it left out); servings and times always come from the rules, because the model guesses numbers the page never states. The answer is rejected if it lost most of the ingredients, and any failure falls back to the rules. The scan screen says which applies, and suggests turning on Apple Intelligence when it's off. Note: in the simulator the model reports "available" but fails (`ModelManagerError 1026`) even with Apple Intelligence on for the Mac, so the model path was checked by running the module's exact prompt and schema on macOS against the test pages.
**Cloud scanning (primary reader).** The on-device results weren't good enough, so scans are now read by Claude on a small server (`server/`, Node + Hono on Fly.io; see its README). The app resizes each page to 1568 px, sends the JPEGs plus the recognized text to `POST /v1/scan`, and gets back a recipe in a fixed JSON shape with nulls for anything not printed, plus notes for the cook (e.g. "step 8 is hidden by a pop-up"), shown at the top of the editor. The server limits scans per install and per day (SQLite on a Fly volume), logs no content, uses server-side refusal fallback, and has a kill switch (`SCAN_ENABLED=false`). The model is configurable (`MODEL`, default Claude Opus 5.5 at low effort). The first scan asks for consent ("Read recipes with Claude?"), and Profile has a switch; declined, offline, or any server error → the on-device chain above. The server authenticates to Claude with workload identity federation (Fly OIDC tokens), and App Attest (`@expo/app-integrity`, verified on the server) means only genuine installs can call it; limits count by attested key. Not done yet: the scored test set (C1) to pick the cheapest model that reads well.
**Scan credit.** Server reads cost a fixed price (`SCAN_PRICE_CENTS`, off at 0) after 3 free scans a month per install. Credit is bought as consumable in-app purchases ($1.99/$4.99/$9.99 packs, `expo-iap`) and kept by the server in an append-only SQLite ledger against a wallet UUID the app keeps in the keychain (`expo-secure-store`) and sends as Apple's `appAccountToken`; the wallet ID doubles as a recovery code for moving credit to another phone. The server verifies each StoreKit 2 transaction with Apple's library before adding it, and the app only finishes the transaction afterwards, so offline purchases are added later. Refunds arrive as App Store Server Notifications and are taken back. Failed reads aren't charged; running out offers "Add Credit" or a free on-device read. Profile → Scan credit shows the balance, packs and recovery code. Litestream streams the database to Tigris about once a second, and restores it on a new volume. Not done: Android (Google Play Billing verification).

The rules handle printed pages well; handwriting, unusual layouts and web pages with lots of clutter need more fixing by hand.

**After launch:** an Android build and QA pass; new recipes shipped regularly through EAS Update; nutrition totals for the whole plan; "use up leftovers" suggestions that favour recipes sharing ingredients already in the plan (a key Mealime idea that cuts waste); a grocery-list widget; iCloud backup of user data (it would sync without accounts).

## 9. Recipe catalog

We write the recipes ourselves, using common dishes found online as reference.

**Sourcing rules**

- Use online recipes only as reference for _which dishes_ to include and typical ingredient ratios. Dish ideas, ingredient lists and quantities are fine to draw from.
- **Write every description and instruction step from scratch** in our own voice. Never copy or lightly paraphrase another site's method text, headnotes or photos.
- Each recipe is a blend of several references, adjusted to fit our format (4 base servings, about 30 minutes, short ingredient lists), not a copy of a single source.
- Record the reference dishes in `src/catalog/SOURCES.md` for our own tracking. This file is not shipped in the app.

**Images:** every bundled recipe has a flat, top-down drawing generated from code (`scripts/illustrations/`, `npm run catalog:illustrations`), with theme colours that follow light and dark mode. They're our own work, so there's nothing to license, and they count as the recipe's image for review. A photo can still replace one later: our own, or stock under a licence that allows app use (record its source here).

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
