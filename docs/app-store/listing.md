# App Store listing — Mealz

Copy and answers for App Store Connect. Character limits are Apple's.

## Name and subtitle

| Field    | Text                       | Limit        |
| -------- | -------------------------- | ------------ |
| Name     | Mealz                      | 30 (5 used)  |
| Subtitle | Plan meals. Shop one list. | 30 (26 used) |

If "Mealz" is taken in App Store Connect, fall back to **Mealz: Meal Planner** (19).

## Promotional text (170)

Pick a few quick dinners, get one grocery list sorted by aisle, then cook step by step with built-in timers. No account, no ads, nothing leaves your phone.

## Description (4000)

Mealz takes the stress out of "what's for dinner?"

PICK YOUR MEALS
Browse quick, weeknight-friendly recipes and tap + to add them to your plan. Mealz only shows recipes that fit your diet, skips anything with your allergens, and leaves out ingredients you don't like.

SHOP ONE LIST
Your grocery list builds itself. Ingredients from every recipe are merged and rounded up to what you can actually buy ("3 limes", "1 bunch cilantro"), then grouped by aisle so you can shop in one pass. Check things off as you go, add your own items, and share the list with anyone in your household.

COOK STEP BY STEP
Cook mode walks you through each recipe one step at a time in big, readable type, shows exactly which ingredients each step needs, and keeps the screen awake. Tap a timer and Mealz will let you know when it's done, even if you leave the app.

MADE FOR YOU
• Vegetarian, vegan, pescatarian and low-carb options
• Allergy and dislike filters
• Recipes scale to your household size
• US or metric grocery amounts
• Add your own recipes: type them in or snap a photo of a cookbook page
• Favourites and cooking history with ratings
• Dark mode and large text support

PRIVATE BY DESIGN
Mealz has no accounts and collects no data. Your plan, list and preferences are stored only on your phone.

## Keywords (100)

```
meal plan,grocery list,recipes,dinner,weeknight,vegetarian,vegan,shopping list,cooking,meal prep
```

(96 characters. Don't repeat words from the name or subtitle; Apple indexes those already.)

## Categories

- Primary: **Food & Drink**
- Secondary: **Lifestyle**

## Age rating

Answer **None** to every content question. The result is **4+**.

## App privacy ("nutrition label")

- Data collection: **Yes, we collect data from this app** (only cloud scanning, which is optional and asks first; scans are processed by Anthropic, which may retain API data for a limited time).
- Data types: **Photos or Videos** and **Other User Content** (the scanned recipe text), and **Purchase History** (scan credit: the server records each credit pack bought and each paid scan against a random wallet ID made on the phone).
  - Use: **App Functionality** only.
  - Linked to the user's identity: **No.**
  - Used for tracking: **No.**
- The resulting label is **Data Not Linked to You: Purchases, Photos or Videos, Other User Content**.
- This matches the privacy manifest in `app.json` (`NSPrivacyTracking: false`, the same three data types, not linked, app functionality).

## In-app purchases

Three consumables in App Store Connect → Monetization → In-App Purchases. The product IDs must match `PACKS` in `server/src/credit.ts` and `src/features/credit/credit.ts`.

| Product ID                    | Reference name    | Price | Display name      | Description                         |
| ----------------------------- | ----------------- | ----- | ----------------- | ----------------------------------- |
| `com.bitcli.mealz.credit.199` | Scan credit $1.99 | $1.99 | $1.99 Scan Credit | Credit for reading scanned recipes. |
| `com.bitcli.mealz.credit.499` | Scan credit $4.99 | $4.99 | $4.99 Scan Credit | Credit for reading scanned recipes. |
| `com.bitcli.mealz.credit.999` | Scan credit $9.99 | $9.99 | $9.99 Scan Credit | Credit for reading scanned recipes. |

Each needs a review screenshot of the Scan Credit screen (Profile → Scan credit).

## URLs (needed before submitting)

- Privacy policy URL: host `docs/privacy-policy.html` (see LAUNCH.md).
- Support URL: a page or email link where people can reach you.
- Marketing URL: optional.

## Screenshots

6.9" iPhone (1320 × 2868), in `docs/app-store/screenshots/`. Upload in this order:

1. `1-recipes.png`: browse recipes that fit your diet
2. `2-recipe.png`: a recipe with servings scaling
3. `3-plan.png`: the week's plan
4. `4-groceries.png`: one grocery list by aisle
5. `5-cook.png`: cook mode step with a timer
6. `6-onboarding.png`: diet and allergy setup

Apple scales 6.9" screenshots down for smaller iPhones, so this one set is enough. iPad screenshots aren't needed because `supportsTablet` is false.

## Export compliance

`ITSAppUsesNonExemptEncryption` is `false` in `app.json`, so App Store Connect won't ask about encryption.
