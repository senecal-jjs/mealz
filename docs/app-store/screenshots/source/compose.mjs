/**
 * Builds the App Store screenshots (1320 × 2868, no alpha) from the simulator
 * captures in raw/: a headline above a framed phone that runs off the bottom.
 * Run from the repo root with `node docs/app-store/screenshots/source/compose.mjs`.
 * Needs Google Chrome, and `npm install` in site/ for sharp.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../site/package.json'));
const sharp = require('sharp');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1320;
const HEIGHT = 2868;

/** `accent` is the coloured part of the headline. `phone` overrides its width and top. */
const shots = [
  {
    file: '1-recipes',
    raw: 'recipes',
    title: 'Dinner,',
    accent: 'decided.',
    sub: 'Quick weeknight recipes that fit<br>your diet and allergies.',
  },
  {
    file: '2-build-plan',
    raw: 'build-plan',
    title: 'A plan for the week,',
    accent: 'built for you.',
    sub: 'Choose your meals and servings.<br>Swap any you don’t fancy.',
  },
  {
    file: '3-groceries',
    raw: 'groceries',
    title: 'One list,',
    accent: 'sorted by aisle.',
    sub: 'Every ingredient merged and rounded<br>up to what you can actually buy.',
  },
  {
    file: '4-cook',
    raw: 'cook',
    title: 'Cook',
    accent: 'step by step.',
    sub: 'Big type, built-in timers, and just<br>what each step needs.',
  },
  {
    file: '5-scan',
    raw: 'scan',
    title: 'Snap a recipe,',
    accent: 'make it yours.',
    sub: 'Photograph a cookbook page and check<br>it before saving. Free scans every month.',
    // Stops above the screen's recovery code, which is private to each install.
    phone: { width: 1160, top: 800 },
  },
  {
    file: '6-recipe',
    raw: 'recipe',
    title: 'Sized for',
    accent: 'your table.',
    sub: 'Set the servings and every<br>amount follows.',
  },
  {
    file: '7-diet',
    raw: 'diet',
    title: 'Made for',
    accent: 'how you eat.',
    sub: 'Vegetarian, vegan, pescatarian or low-carb,<br>plus allergies and dislikes.',
  },
];

const page = ({ raw, title, accent, sub, phone = {} }) => {
  const width = phone.width ?? 1040;
  const top = phone.top ?? 740;
  return `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    position: relative;
    font-family: Poppins, sans-serif;
    text-align: center;
    background:
      radial-gradient(1300px 1050px at 50% 760px, #1f7a57 0%, rgba(31, 122, 87, 0) 72%),
      linear-gradient(180deg, #0e3b2c 0%, #082a1f 55%, #041a13 100%);
  }
  .copy { position: absolute; inset: 170px 40px auto; }
  h1 { font-size: 92px; line-height: 1.28; font-weight: 700; letter-spacing: -1px; color: #fff; }
  h1 span { display: block; color: #7fe3b4; }
  p { margin-top: 28px; font-size: 46px; line-height: 1.42; color: #c3e6d6; }
  .phone {
    position: absolute;
    left: ${(WIDTH - width) / 2}px;
    top: ${top}px;
    width: ${width}px;
    border: 5px solid #3f9a76;
    border-bottom: 0;
    border-radius: 104px 104px 0 0;
    overflow: hidden;
    box-shadow: 0 0 150px rgba(61, 186, 132, 0.4);
  }
  .phone img { display: block; width: 100%; }
</style>
<div class="copy">
  <h1>${title}<span>${accent}</span></h1>
  <p>${sub}</p>
</div>
<div class="phone"><img src="file://${path.join(here, 'raw', `${raw}.png`)}"></div>`;
};

const temp = mkdtempSync(path.join(tmpdir(), 'mealz-shots-'));
for (const shot of shots) {
  const html = path.join(temp, `${shot.file}.html`);
  const png = path.join(temp, `${shot.file}.png`);
  writeFileSync(html, page(shot));
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=4000',
      `--window-size=${WIDTH},${HEIGHT}`,
      `--user-data-dir=${path.join(temp, 'chrome')}`,
      `--screenshot=${png}`,
      `file://${html}`,
    ],
    { stdio: 'ignore' },
  );
  // App Store Connect refuses screenshots with an alpha channel.
  await sharp(png)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
    .flatten({ background: '#041a13' })
    .removeAlpha()
    .png()
    .toFile(path.join(here, '..', `${shot.file}.png`));
  console.log(shot.file);
}
rmSync(temp, { recursive: true, force: true });
