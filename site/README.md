# Mealz website

A static Astro site: the landing page (`/`) and the privacy policy (`/privacy/`). It lives
apart from the Expo app, with its own `package.json`, and the app's TypeScript, ESLint, Jest
and Prettier runs ignore this folder.

```bash
cd site
npm install
npm run dev       # http://localhost:4321, reloads on change
npm run build     # static files in site/dist/
npm run preview   # serve the built site
```

## Where things come from

- The app screenshots live in `src/assets/screens/` as full-size PNGs from the simulator; the
  build turns them into small WebP files. The icon comes straight from `assets/images/icon.png`.
- The privacy page shows the `<main>` of `docs/privacy-policy.html`, so that file stays the one
  source. Until `CONTACT_EMAIL` is replaced there, the page highlights it in yellow and the
  build prints a warning.
- `src/config.ts` holds the store links (`STORE_LINKS`, one button per store; empty shows
  "Coming soon"), the recipe count shown on the page and the optional scan video.

## Deploying to Fly.io

The site runs on Fly as a small nginx image (`Dockerfile`, `nginx.conf`, `fly.toml`). The
build needs the app icon and privacy policy from the repo root, so the image is built with the
repo root as its context, and `Dockerfile.dockerignore` keeps everything else out of it.

First time (pick another name if `mealz-site` is taken, and put it in `fly.toml`):

```bash
cd site
fly apps create mealz-site
npm run deploy
```

After that, `npm run deploy` from this folder ships changes. The site is then at
`https://mealz-site.fly.dev`, and at `https://mealz.menu` (set as `site` in
`astro.config.mjs`). The domain is registered with Squarespace Domains, whose DNS points it
here: an A record for `@` to Fly's shared IPv4, an AAAA record to the app's IPv6 (both from
`fly ips list`), and a CNAME for `www` to `mealz-site.fly.dev`. Fly holds a certificate for
each name (`fly certs add mealz.menu --config fly.toml`, and the same for `www.mealz.menu`).
nginx redirects `www.mealz.menu` to `mealz.menu`.

Machines stop when idle and start on the next visit, so the first page load after a quiet
spell takes a second or two. Set `min_machines_running = 1` in `fly.toml` to avoid that.

To try the image locally first (from the repo root):

```bash
docker build -f site/Dockerfile -t mealz-site .
docker run --rm -p 8080:8080 mealz-site
```

## Other hosts

`site/dist/` is plain HTML, CSS and images, so any static host works too. With a GitHub
remote, Cloudflare Pages, Netlify or Vercel can build it from the repo: root directory `site`,
build command `npm run build`, output directory `dist`.
