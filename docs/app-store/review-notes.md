# Notes for App Review

Paste into App Store Connect → App Review Information → Notes.

---

Mealz is a meal planner that works on the device. There is no sign-in and no account, so no demo credentials are needed. The only network use is optional cloud reading of scanned recipes (below).

To try the main flow:

1. On first launch, answer the four setup questions (any answers work) and tap "Start planning".
2. On the Recipes tab, tap + on two or three recipes.
3. Open the Groceries tab to see one merged list grouped by aisle. Tap items to check them off.
4. On My Plan, tap "Cook" on a recipe. Swipe through the steps; steps with a time have a timer button.

Adding your own recipe: Recipes tab → + → "Scan a Photo". The text is first read on the device (Apple Vision). On the first scan the app asks "Read recipes with Claude?": with Allow, the page photos and recognized text are sent to our scan server, which uses Anthropic's Claude to structure the recipe and stores nothing; with "Keep on My Phone" (or when offline) the recipe is organized on the device with Apple's Foundation Models where available, falling back to built-in rules. The choice can be changed in Profile → "Read scans with Claude". Either way the result opens in an editor for review.

Scan credit (in-app purchases): reading a scan on our server costs a small fixed amount after 3 free scans a month. Credit is bought as consumable packs on the Scan Credit screen (Profile → Scan credit, or offered when a scan runs out of credit). Credit never expires, scans the server can't read aren't charged, and reading on the device is always free. Since there are no accounts, the screen shows a recovery code that moves the credit to another iPhone. To test: allow cloud scanning, scan three recipes, then buy a pack with a sandbox account. Camera and photo access are requested only when scanning. "Type It In" opens the same editor empty.

Notifications: the app asks for notification permission only when the user starts a cooking timer, so it can alert them when the timer ends. Notifications are local and scheduled on the device.

To start over, use Profile → Reset all data.
