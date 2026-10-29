/**
 * Recipe share links (`/r#<data>`). The recipe is in the fragment, which
 * browsers never send, so this server only hands out a static page that reads
 * it in the browser, plus Apple's file that lets the app open these links.
 * The format is defined in the app: src/features/sharing/share-link.ts.
 */
import { Hono } from 'hono';

export type ShareOptions = {
  /** `<Team ID>.<bundle ID>`; without it there's no apple-app-site-association. */
  appId?: string;
  /** The App Store page, once there is one. */
  appStoreUrl?: string;
};

export function shareRoutes({ appId, appStoreUrl }: ShareOptions) {
  const app = new Hono();

  if (appId) {
    const association = {
      applinks: { details: [{ appIDs: [appId], components: [{ '/': '/r' }, { '/': '/r/' }] }] },
    };
    app.get('/.well-known/apple-app-site-association', (c) => c.json(association));
  }

  const page = sharePage(appStoreUrl);
  app.get('/r', (c) => {
    c.header('content-security-policy', CSP);
    c.header('referrer-policy', 'no-referrer');
    c.header('x-content-type-options', 'nosniff');
    c.header('cache-control', 'public, max-age=300');
    return c.html(page);
  });
  app.get('/r/share.js', (c) => {
    c.header('content-type', 'text/javascript; charset=utf-8');
    c.header('cache-control', 'public, max-age=300');
    return c.body(SCRIPT);
  });

  return app;
}

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function sharePage(appStoreUrl?: string) {
  const getApp = appStoreUrl
    ? `<a class="button" href="${escape(appStoreUrl)}">Get Mealz for iPhone</a>`
    : `<p class="muted">Mealz for iPhone is coming soon.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>A recipe from Mealz</title>
<meta property="og:title" content="A recipe from Mealz">
<meta property="og:description" content="Open it in Mealz to cook it or add it to your plan.">
<style>
:root { color-scheme: light dark; --fg: #1b1f1d; --muted: #5f6b66; --bg: #fff; --line: #e3e8e5; --tint: #2f9e6e; }
@media (prefers-color-scheme: dark) { :root { --fg: #eef2f0; --muted: #9aa7a1; --bg: #121513; --line: #2a302d; } }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.5 -apple-system, system-ui, sans-serif; }
main { max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 8px; }
h2 { font-size: 20px; margin: 32px 0 8px; }
.muted { color: var(--muted); }
ul, ol { padding-left: 1.4em; }
li { margin: 6px 0; }
.app { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--line); text-align: center; }
.button { display: inline-block; padding: 12px 20px; border-radius: 12px; background: var(--tint); color: #fff; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
<main>
<article id="recipe" hidden>
<h1 id="title"></h1>
<p id="description" class="muted"></p>
<p id="facts" class="muted"></p>
<h2>Ingredients</h2>
<ul id="ingredients"></ul>
<h2>Instructions</h2>
<ol id="steps"></ol>
</article>
<p id="error" hidden>This link doesn’t contain a recipe. It may have been cut off when it was sent.</p>
<section class="app">
<p>Shared from Mealz, the meal planner. With the app, this link opens the recipe so you can save it, plan it and cook it.</p>
${getApp}
</section>
</main>
<script src="/r/share.js"></script>
</body>
</html>`;
}

/**
 * Runs in the browser. Only ever sets textContent, so a hostile link can't
 * inject markup.
 */
const SCRIPT = `(async () => {
  const $ = (id) => document.getElementById(id);
  const fail = () => { $('error').hidden = false; };
  const data = location.hash.slice(1);
  if (!data || data.length > 8000 || !/^[A-Za-z0-9_-]+$/.test(data)) return fail();
  let payload;
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const text = await new Response(stream).text();
    if (text.length > 100000) return fail();
    payload = JSON.parse(text);
  } catch { return fail(); }
  const r = payload && payload.v === 1 && payload.r;
  if (!r || typeof r.title !== 'string' || !Array.isArray(r.ingredients) || !Array.isArray(r.steps)) return fail();

  const ingredients = new Map((Array.isArray(payload.i) ? payload.i : []).map((i) => [i.id, i]));
  const UNITS = { g: ['g', 'g'], kg: ['kg', 'kg'], oz: ['oz', 'oz'], lb: ['lb', 'lb'], ml: ['ml', 'ml'], l: ['l', 'l'],
    tsp: ['tsp', 'tsp'], tbsp: ['tbsp', 'tbsp'], cup: ['cup', 'cups'], clove: ['clove', 'cloves'], can: ['can', 'cans'],
    bunch: ['bunch', 'bunches'], slice: ['slice', 'slices'] };
  const FRACTIONS = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  const number = (n) => {
    let whole = Math.floor(n);
    const [value, symbol] = FRACTIONS.reduce((best, f) => Math.abs(n - whole - f[0]) < Math.abs(n - whole - best[0]) ? f : best);
    if (value === 1) whole += 1;
    return whole && symbol ? whole + ' ' + symbol : symbol || String(whole);
  };
  const line = (item) => {
    const ingredient = ingredients.get(item.ingredient) || { name: '' };
    const q = typeof item.quantity === 'number' ? item.quantity : null;
    const many = q !== null && q > 1;
    const name = item.unit === 'whole' && many ? (ingredient.plural || ingredient.name + 's') : ingredient.name;
    let amount = '';
    if (q !== null && item.unit) {
      const metric = ['g', 'kg', 'ml', 'l'].includes(item.unit);
      const n = metric ? String(Math.round(q * 10) / 10) : number(q);
      amount = item.unit === 'whole' ? n : n + ' ' + (UNITS[item.unit] || [item.unit, item.unit])[many ? 1 : 0];
    }
    return [amount, name].filter(Boolean).join(' ')
      + (q === null ? ', to taste' : '')
      + (typeof item.prep === 'string' && item.prep ? ', ' + item.prep : '')
      + (item.optional ? ' (optional)' : '');
  };

  document.title = r.title + ' · Mealz';
  $('title').textContent = r.title;
  $('description').textContent = typeof r.description === 'string' ? r.description : '';
  $('facts').textContent = 'Serves ' + Number(r.baseServings) + ' · ' + (Number(r.prepMinutes) + Number(r.cookMinutes)) + ' min';
  for (const item of r.ingredients) {
    const li = document.createElement('li');
    li.textContent = line(item);
    $('ingredients').append(li);
  }
  for (const step of r.steps) {
    const li = document.createElement('li');
    li.textContent = String(step && step.text);
    $('steps').append(li);
  }
  $('recipe').hidden = false;
})();
`;
