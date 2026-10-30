# Mealz scan server

Reads photographed recipes for the app with Claude. The app sends the photos of
a recipe's pages plus the text it recognized on the phone to `POST /v1/scan`
and gets the structured recipe back. Any error (offline, limit reached, model
failure, kill switch) makes the app fall back to its on-device reader.

Photos and recipe text are only held in memory for the request: never stored,
never logged. Logs carry status, timing, page count and token counts.

It also serves the page behind recipe share links (see "Share links" below).

## Run locally

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev     # http://localhost:8080
npm test
npm run typecheck
```

Node 24+ runs the TypeScript sources directly; there's no build step.

To point a development build of the app at it, start Metro with
`EXPO_PUBLIC_SCAN_SERVER_URL=http://localhost:8080 npx expo start` (the iOS
simulator reaches the Mac at localhost).

## Settings (environment)

| Variable                       | Default                     | Meaning                                                                  |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`            | –                           | For local development. When set, it wins over federation                 |
| `ANTHROPIC_FEDERATION_RULE_ID` | –                           | Federation rule (`fdrl_...`); with the next two, turns on federation     |
| `ANTHROPIC_ORGANIZATION_ID`    | –                           | Anthropic organization UUID                                              |
| `ANTHROPIC_SERVICE_ACCOUNT_ID` | –                           | Service account the tokens act as (`svac_...`)                           |
| `ANTHROPIC_WORKSPACE_ID`       | the rule's only workspace   | Needed only when the rule covers more than one workspace                 |
| `FLY_OIDC_AUDIENCE`            | `https://api.anthropic.com` | Must equal the rule's audience                                           |
| `MODEL`                        | `claude-opus-5-5`           | Any Claude model ID, e.g. `claude-sonnet-5-5` or `claude-haiku-5-5`      |
| `EFFORT`                       | `low`                       | `low`, `medium` or `high`                                                |
| `DAILY_LIMIT_PER_INSTALL`      | `30`                        | Scans per app install (per attested key with App Attest) per UTC day     |
| `DAILY_LIMIT_TOTAL`            | `2000`                      | Scans across all installs per UTC day                                    |
| `SCAN_ENABLED`                 | `true`                      | Kill switch: `false` returns 503 and every app uses its on-device reader |
| `DB_PATH`                      | `./scans.db`                | SQLite file: daily counts, challenges, attested keys and credit ledger   |
| `APPLE_APP_ID`                 | –                           | `<Team ID>.com.bitcli.mealz`; turns on App Attest                        |
| `ATTEST_REQUIRED`              | `true`                      | With App Attest on, `false` still serves unsigned scans (the simulator)  |
| `APP_STORE_URL`                | –                           | Linked from the share page once Mealz is on the App Store                |
| `SCAN_PRICE_CENTS`             | `0`                         | Price of a scan in US cents once the free scans are used; `0` = all free |
| `FREE_SCANS_PER_MONTH`         | `3`                         | Free scans per UTC month, counted per install and per wallet             |
| `APPLE_APP_STORE_ID`           | –                           | The app's numeric Apple ID; needed to accept production purchases        |
| `BUCKET_NAME` and `AWS_*`      | –                           | Tigris bucket for Litestream backups (set by `fly storage create`)       |

## Credentials: workload identity federation

On Fly the server holds no Anthropic key. Before each exchange it asks Fly's
machine API (`/.fly/api`) for a fresh OIDC token, and the SDK trades it for a
Claude API token that it caches and renews before it expires.

In the Claude Console:

1. Create a workspace for the app (e.g. `mealz`) with a monthly spend limit,
   and a service account that is a member of only that workspace.
2. Add a federation issuer: `https://oidc.fly.io/<org>`, with JWKS discovery.
   Take `<org>` from a real token, not from `fly orgs list`: a personal org
   shows as `personal` there but tokens use its full name (e.g.
   `senecal-hey-com`).
3. Add a federation rule for that issuer and service account:
   - subject prefix `<org>:<app-name>:*` (e.g. `senecal-hey-com:mealz-scan:*`)
   - audience `https://api.anthropic.com`
   - claim `org_id` = your Fly org ID

To see a token's claims, run this on a machine (`fly ssh console`):

```bash
node -e "require('http').request({socketPath:'/.fly/api',path:'/v1/tokens/oidc',method:'POST'},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>console.log(Buffer.from(b.split('.')[1],'base64url').toString()))}).end(JSON.stringify({aud:'https://api.anthropic.com'}))"
```

- scope `workspace:inference` if offered, otherwise `workspace:developer`
- workspace: the app's workspace

The rule, organization and service account IDs aren't secrets, but setting
them as Fly secrets keeps them out of the repo.

## First deploy to Fly.io

```bash
fly launch --no-deploy --copy-config --name <app-name>   # or keep "mealz-scan" in fly.toml
fly volumes create scan_data --size 1 --count 1
fly secrets set ANTHROPIC_FEDERATION_RULE_ID=fdrl_... \
  ANTHROPIC_ORGANIZATION_ID=... ANTHROPIC_SERVICE_ACCOUNT_ID=svac_...
fly deploy
fly scale count 1      # the SQLite counts live on one volume
```

The start-up log line shows `"auth":"federation"`. If scans return 502, the
deny reason for a failed exchange is in the Console's Workload identity
authentication history (the API's 401 is deliberately vague).

Then set the app's server URL to `https://<app-name>.fly.dev`
(`EXPO_PUBLIC_SCAN_SERVER_URL` in `eas.json`), and set a monthly spend limit in
the Claude Console as a backstop.

Turn scanning off without an app update: `fly secrets set SCAN_ENABLED=false`
(machines restart in a few seconds). `fly secrets unset SCAN_ENABLED` turns it
back on.

## App Attest

Only genuine copies of Mealz on real iPhones can use the server. Each install
makes a key in the Secure Enclave, and the server checks Apple's attestation
of it once; every scan then signs a fresh one-time challenge with that key.

- `POST /v1/attest/challenge` → `{ challenge }`, single use, valid 5 minutes
- `POST /v1/attest` with `{ keyId, challenge, attestation }` checks the
  certificate chain up to Apple's App Attest root, the nonce, the app ID, the
  key ID and the counter, then stores the key's public key
- `POST /v1/scan` takes `attest: { keyId, challenge, assertion }`: the
  signature and a rising counter are checked, and the daily limit counts by
  key. An unknown key gets `401 unknown_key`, and the app attests a new one.

Rollout: set `APPLE_APP_ID` (your Team ID is on the Apple Developer
Membership page) and deploy with `ATTEST_REQUIRED=false`. Scan from a
development build on a real iPhone: the logs should show `attest 200 ok`, then
signed scans. Then set `ATTEST_REQUIRED = "true"` in `fly.toml` and deploy. The
simulator can't attest, so with it required, simulator scans fall back to the
phone (run a local server without `APPLE_APP_ID` for simulator work).

Someone with a real iPhone can still script the genuine app; the per-key
daily limit and the workspace spend limit cover that.

## Share links

A shared recipe is a link like `https://mealz-scan.fly.dev/r#<data>`: the whole
recipe, deflated and base64url-encoded, after the `#` (the format is in the
app's `src/features/sharing/share-link.ts`). Browsers never send the part after
`#`, so this server never sees shared recipes.

- `GET /r` is a static page whose script reads the recipe from the link and
  shows it, with a link to the app (`APP_STORE_URL`, once there is one). It
  only sets text, never markup, and its content policy allows no other scripts.
- `GET /.well-known/apple-app-site-association` (when `APPLE_APP_ID` is set)
  tells iOS that `/r` links open Mealz. The app lists this host in
  `ios.associatedDomains` in `app.json`. iOS fetches this file when the app is
  installed, so moving share links to another domain needs an app update.

## Scan credit

With `SCAN_PRICE_CENTS` above 0, each scan the server reads costs that much
after `FREE_SCANS_PER_MONTH` free ones. Free scans are counted both per
install (attested key) and per wallet, and a scan is free only while both
have some left: a reinstall makes a new key but gets the same wallet back
from iCloud, so it doesn't reset the count. People buy credit packs in the app
(consumable in-app purchases; the product IDs are in `src/credit.ts`).

- Balances belong to a **wallet**: a random UUID the app keeps in the
  keychain and passes to Apple as each purchase's `appAccountToken`. There
  are no accounts; the app shows the wallet ID as a recovery code.
- Money only moves by appending to the `ledger` table (`purchase`, `scan`,
  `release`, `refund`, `grant`); a balance is the sum. Each entry's `ref` is
  unique, so a purchase can't be added twice.
- `POST /v1/credit` with `{ installId, keyId?, wallet? }` →
  `{ priceCents, freeScansLeft, balanceCents }`.
- `POST /v1/scan` takes `wallet`. A scan is charged before Claude reads it
  and given back if the read fails. With no free scans and too little
  credit it answers `402 { error: "no_credit", credit }`. Successful answers
  include `credit`.
- `POST /v1/credit/apple` with `{ transaction }` (StoreKit 2's signed
  transaction): verified with Apple's library against Apple Root CA G3, for
  this bundle ID, then added to the wallet in its `appAccountToken`. The app
  only finishes the transaction with StoreKit after this succeeds, so a
  purchase made offline is added on a later launch.
- `POST /v1/store/apple/notifications`: App Store Server Notifications V2. A
  `REFUND` takes the pack's credit back, even below zero.

Purchases from TestFlight, App Review and sandbox accounts are signed for
Apple's sandbox and are accepted too. Production purchases need
`APPLE_APP_STORE_ID`.

To give someone credit by hand (`fly ssh console`):

```bash
sqlite3 /data/scans.db "INSERT INTO ledger (wallet, cents, kind, ref, at) VALUES ('<recovery code>', 500, 'grant', 'grant:<why>', datetime('now'))"
```

(`sqlite3` isn't in the image; `apt-get update && apt-get install -y sqlite3` first.)

Turning it on:

1. In App Store Connect, sign the Paid Apps agreement and add banking and
   tax details, then create the three consumables (see
   `docs/app-store/listing.md`).
2. Under App Information → App Store Server Notifications, set both the
   production and sandbox URLs to
   `https://<app-name>.fly.dev/v1/store/apple/notifications`, version 2.
3. Set backups up (below) before taking anyone's money.
4. `fly secrets set APPLE_APP_STORE_ID=<numeric Apple ID>`, then set
   `SCAN_PRICE_CENTS` in `fly.toml` and deploy. Older app builds keep
   working: they get the free scans, and after that read scans on the phone.

## Backups (Litestream → Tigris)

The volume lives on one physical host and Fly only snapshots it daily, so
the database is also streamed to Tigris (Fly's object storage) by
[Litestream](https://litestream.io), about once a second. `start.sh` runs
the server under Litestream whenever `BUCKET_NAME` is set; on start it first
restores the database from the bucket if the volume has none.

Set up once:

```bash
fly storage create --name mealz-scan-backups   # sets BUCKET_NAME and AWS_* secrets on the app
fly deploy
curl https://<app-name>.fly.dev/health          # wake the machine (it auto-stops), then:
fly logs                                        # look for Litestream's "snapshot complete"
# No Litestream lines? The machine may have stale secrets (BUCKET_NAME unset,
# so start.sh runs node alone): fly secrets sync && fly secrets deploy
fly volumes list                                # then raise snapshot retention as a second net:
fly volumes update <volume-id> --snapshot-retention 60
```

Check a restore works (do this once before launch, and after changing any
of the above):

```bash
BUCKET_NAME=mealz-scan-backups AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev \
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... DB_PATH=/tmp/restored.db \
litestream restore -config litestream.yml /tmp/restored.db
sqlite3 /tmp/restored.db "SELECT kind, COUNT(*), SUM(cents) FROM ledger GROUP BY kind"
```

If the volume or host is lost: `fly volumes create scan_data --size 1`, then
`fly deploy`; the new machine restores from the bucket before starting.

Litestream's metrics are on port 9090 (`[metrics]` in `fly.toml`), so they
show in Fly's managed Grafana. Add an alert on
`litestream_sync_error_count` rising (or `litestream_disk_full` at 1). Only one machine may ever
write to the bucket: never run two machines against it.
