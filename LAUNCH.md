# Launch checklist (M7)

What's ready in the repo, what only you can do, and the commands to ship.

## Ready

- [x] App icon (`assets/mealz.icon`) and splash
- [x] `ITSAppUsesNonExemptEncryption: false` (no export compliance questions)
- [x] Privacy manifest: no tracking; declares Photos and Other User Content for cloud scanning, not linked to the user (matches the label in `docs/app-store/listing.md`)
- [x] iPhone only (`supportsTablet: false`), portrait
- [x] EAS profiles (`eas.json`): `preview` for TestFlight (includes draft recipes), `production` for the App Store (reviewed recipes only)
- [x] A production build stops early unless at least 20 recipes are reviewed (`npm run catalog:release-check`, run automatically by `eas-build-pre-install`)
- [x] Listing copy, keywords, category, age rating and privacy answers: `docs/app-store/listing.md`
- [x] Notes for App Review: `docs/app-store/review-notes.md`
- [x] Privacy policy page: `docs/privacy-policy.html` (needs your contact email and hosting)
- [x] 6.9" screenshots: `docs/app-store/screenshots/`

## Only you can do these

1. **Accounts.** Join the Apple Developer Program (US$99/year) and create an Expo account.
2. **Bundle ID.** `com.mealz.app` in `app.json` is a placeholder. Use a reverse-DNS ID you own (e.g. `com.yourname.mealz`). It can't change after the first upload.
3. **App name.** Check that "Mealz" is free when creating the app in App Store Connect; the listing doc has a fallback.
4. **Review recipes and add photos.** Only recipes with `"reviewed": true` (and an `image`) appear in App Store builds. For each one: sanity-check or test-cook it, add a photo you have rights to, set `reviewed: true`, and fill in its row in `src/catalog/SOURCES.md`. At least 20 are needed to build for production.
5. **Host the privacy policy and a support page.** Replace `CONTACT_EMAIL` in `docs/privacy-policy.html`, then host it anywhere public (GitHub Pages on this repo works once it has a remote). Put both URLs in App Store Connect.
6. **Copyright line** for App Store Connect, e.g. "2026 Your Name".
7. **Deploy the scan server.** Set up workload identity federation in the Claude Console (a workspace with a monthly spend limit, a service account, a Fly issuer and a rule; no API key), then follow `server/README.md` to deploy to Fly.io. Put the server URL in `eas.json` as `EXPO_PUBLIC_SCAN_SERVER_URL` for the `preview` and `production` profiles. Without it, builds simply read scans on the phone. Then turn on App Attest: enable the App Attest capability for the bundle ID, set `APPLE_APP_ID` on the server, check a signed scan from a real iPhone, and set `ATTEST_REQUIRED` to `"true"` (see `server/README.md`). The same server hosts recipe share links: enable the Associated Domains capability for the bundle ID too (EAS usually does this when it builds), and set `APP_STORE_URL` on the server once the app is live so the share page links to it.

## Ship it

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` links the project to your Expo account and writes `extra.eas.projectId` into `app.json`. Commit that change.

### TestFlight beta (drafts included)

```bash
npx eas-cli@latest build --platform ios --profile preview
```

```bash
npx eas-cli@latest submit --platform ios --latest
```

EAS asks for your Apple ID the first time and manages certificates and provisioning for you. The build appears in TestFlight after Apple's processing (usually under 30 minutes).

> ⚠️ Preview builds include **unreviewed draft recipes**. Use them for TestFlight testing only, and never submit one for App Review. Release only builds from the `production` profile.

### App Store release

After at least 20 recipes are reviewed:

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios --latest
```

Then in App Store Connect: pick that build, fill in the listing from `docs/app-store/listing.md`, upload the screenshots, answer the privacy questions (see `docs/app-store/listing.md`), paste the review notes, and submit for review.

### Shipping new recipes later

New or newly reviewed recipes are JavaScript-only changes, so they can go out over the air without App Store review:

```bash
npx eas-cli@latest update --channel production --message "New recipes"
```

(This needs `expo-updates` installed and configured first; see PLAN.md, "After launch".)
