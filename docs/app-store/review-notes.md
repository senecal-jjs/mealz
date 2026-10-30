# Notes for App Review

Paste into App Store Connect → App Review Information → Notes.

---

Mealz is a meal planner that works on the device. There is no sign-in and no account, so no demo credentials are needed. The only network use is optional cloud reading of scanned recipes (below).

To try the main flow:

1. On first launch, answer the four setup questions (any answers work) and tap "Start planning".
2. On the Recipes tab, tap + on two or three recipes.
3. Open the Groceries tab to see one merged list grouped by aisle. Tap items to check them off.
4. On My Plan, tap "Cook" on a recipe. Swipe through the steps; steps with a time have a timer button.

Adding your own recipe: Recipes tab → + opens "Add a Recipe", which shows the scan credit. "Scan a Recipe" first shows a one-time notice that photos are read by Anthropic's Claude on our server (Continue or Cancel). Each photo's text is first read on the device (Apple Vision), then the photos and text go to our scan server, which uses Claude to structure the recipe and stores nothing. The result opens in an editor for review. Without a connection, the scan screen says so and offers "Type It In Instead".

Scan credit (in-app purchases): reading a scan on our server costs a small fixed amount after 3 free scans a month. Credit is bought as consumable packs on the Add a Recipe screen, or on the scan screen when a scan runs out of credit. Credit never expires, and scans the server can't read aren't charged. Recipes the user adds are backed up to a hidden Mealz folder in their own iCloud Drive and offered for restore on a new install (Profile → Restore from iCloud); this never touches our server. Since there are no accounts, credit belongs to a random wallet ID that's saved in the user's own iCloud (key-value storage), so it comes back on a new iPhone; the screen also shows it as a recovery code for moving it by hand. To test: scan three recipes, then buy a pack with a sandbox account. Camera and photo access are requested only when scanning. "Type It In" opens the same editor empty.

Notifications: the app asks for notification permission only when the user starts a cooking timer, so it can alert them when the timer ends. Notifications are local and scheduled on the device.

To start over, use Profile → Reset all data.
