# Mealz scan server

Reads photographed recipes for the app with Claude. The app sends the photos of
a recipe's pages plus the text it recognized on the phone to `POST /v1/scan`
and gets the structured recipe back. Any error (offline, limit reached, model
failure, kill switch) makes the app fall back to its on-device reader.

Photos and recipe text are only held in memory for the request: never stored,
never logged. Logs carry status, timing, page count and token counts.

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
| `DAILY_LIMIT_PER_INSTALL`      | `30`                        | Scans per app install per UTC day                                        |
| `DAILY_LIMIT_TOTAL`            | `2000`                      | Scans across all installs per UTC day                                    |
| `SCAN_ENABLED`                 | `true`                      | Kill switch: `false` returns 503 and every app uses its on-device reader |
| `DB_PATH`                      | `./scans.db`                | SQLite file for the daily counts                                         |

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

## Not done yet

App Attest. Today any client that knows the URL can call the API, bounded by
the daily limits and the Console spend limit. `@expo/app-integrity` provides
the app side; the server needs to verify Apple's attestation and assertions.
