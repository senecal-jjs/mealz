/**
 * Turns the text read from a recipe photo into a draft for the recipe editor.
 * The input is lines as text recognition returns them (with positions when
 * available); the output is a best guess the user reviews before saving.
 */
import { draftIngredient, draftStep, emptyDraft, type RecipeDraft } from '@/domain/recipe-draft';

/** A line of recognized text. Positions are fractions of the image, origin top left. */
export type TextLine = {
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type ParsedRecipeText = {
  title: string;
  description: string;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: string[];
  steps: string[];
};

const INGREDIENTS_HEADER = /^(ingredients?|(what )?you('ll| will)? need|shopping list)\s*:?$/i;
const STEPS_HEADER =
  /^(directions?|instructions?|method|preparation|steps|how to (make|cook)( it)?|to make|to prepare)\s*:?$/i;
const SUBHEADER = /^(for (the )?[a-z ]+|[a-z ]+ sauce|[a-z ]+ dressing|to serve|topping)\s*:$/i;
const STEP_NUMBER = /^\s*(?:step\s*)?(\d{1,2})\s*[.):]\s*/i;
const BULLET = /^\s*[-–•*·▪◦]\s*/;
const LEADING_AMOUNT =
  /^\s*(?:[-–•*·▪◦]\s*)?(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞]|a |an |one |two |three |four |half )/i;

const SERVINGS = /\b(?:serves|servings?|yield|yields|makes)\b\s*:?\s*(?:about\s*)?(\d+)/i;
const PREP =
  /\bprep(?:aration)?(?:\s*time)?\s*:?\s*(\d+)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b/i;
const COOK =
  /\b(?:cook(?:ing)?|bake|baking)(?:\s*time)?\s*:?\s*(\d+)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b/i;
const TOTAL = /\btotal(?:\s*time)?\s*:?\s*\d+/i;

function minutes(value: string, unit: string): number {
  return /^h/i.test(unit) ? Number(value) * 60 : Number(value);
}

const hasPositions = (lines: TextLine[]) =>
  lines.length > 0 && lines.every((l) => l.x !== undefined && l.y !== undefined);

/**
 * Puts lines in reading order. Two-column pages (ingredients on the left,
 * method on the right, as many cookbooks print them) are read column by column
 * after any full-width lines at the top, such as the title.
 */
export function readingOrder(lines: TextLine[]): TextLine[] {
  if (!hasPositions(lines)) return lines;
  const byY = [...lines].sort((a, b) => a.y! - b.y! || a.x! - b.x!);
  const left = byY.filter((l) => l.x! + (l.width ?? 0) <= 0.52);
  const right = byY.filter((l) => l.x! >= 0.45);
  if (left.length < 3 || right.length < 3) return byY;

  // Columns start where the first left-and-right lines sit side by side.
  const columnsTop = Math.max(left[0].y!, right[0].y!) - 0.01;
  const above = byY.filter((l) => l.y! < columnsTop);
  const below = byY.filter((l) => l.y! >= columnsTop);
  const spanning = below.filter((l) => l.x! < 0.4 && l.x! + (l.width ?? 0) > 0.6);
  if (spanning.length > below.length / 4) return byY;

  const inLeft = below.filter((l) => !spanning.includes(l) && l.x! + (l.width ?? 0) / 2 < 0.5);
  const inRight = below.filter((l) => !spanning.includes(l) && !inLeft.includes(l));
  return [...above, ...inLeft, ...inRight, ...spanning];
}

/** Joins a line onto the previous one, mending words split by a hyphen at the line end. */
function join(previous: string, next: string): string {
  if (/[a-z]-$/i.test(previous)) return previous.slice(0, -1) + next;
  return `${previous} ${next}`;
}

const SALT_AND_PEPPER = /^salt (?:and|&) (?:freshly ground |ground |black )*pepper\b(.*)$/i;

/**
 * Ingredient lines: wrapped lines are joined, subheaders like "For the sauce:"
 * dropped, and "Salt and pepper" split into its two ingredients.
 */
function collectIngredients(lines: string[]): string[] {
  return joinIngredientLines(lines).flatMap((line) => {
    const m = line.match(SALT_AND_PEPPER);
    return m ? [`Salt${m[1]}`, `Black pepper${m[1]}`] : [line];
  });
}

function joinIngredientLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (SUBHEADER.test(line)) continue;
    const startsNew = LEADING_AMOUNT.test(line) || BULLET.test(line) || /^[A-Z]/.test(line);
    const previous = out[out.length - 1];
    if (previous && !startsNew && !/[.)]$/.test(previous))
      out[out.length - 1] = join(previous, line);
    else out.push(line.replace(BULLET, ''));
  }
  return out;
}

/**
 * Step lines. Numbered steps ("1.", "Step 2:") start a new step each; without
 * numbers, a line that ends a sentence ends the step.
 */
function collectSteps(lines: TextLine[]): string[] {
  const numbered = lines.filter((l) => STEP_NUMBER.test(l.text)).length >= 2;
  const widths = lines.map((l) => l.width).filter((w): w is number => w !== undefined);
  const fullWidth = widths.length ? Math.max(...widths) : undefined;

  const steps: string[] = [];
  let current = '';
  const flush = () => {
    if (current.trim()) steps.push(current.trim());
    current = '';
  };
  for (const line of lines) {
    const text = line.text.trim();
    if (!text || SUBHEADER.test(text)) continue;
    if (numbered) {
      if (STEP_NUMBER.test(text)) {
        flush();
        current = text.replace(STEP_NUMBER, '');
      } else {
        current = current ? join(current, text) : text;
      }
      continue;
    }
    current = current ? join(current, text) : text.replace(BULLET, '');
    // A sentence that ends before the column's right edge ends the paragraph.
    const endsSentence = /[.!)]$/.test(text);
    const shortLine = fullWidth && line.width ? line.width < fullWidth * 0.85 : true;
    if (endsSentence && shortLine) flush();
  }
  flush();
  return steps;
}

const looksLikeIngredient = (text: string) =>
  (LEADING_AMOUNT.test(text) || BULLET.test(text)) && text.length < 70;

/**
 * Reads a recipe out of recognized lines. Sections are found by their headings
 * when present. Pass `ordered` when lines are already in reading order (e.g.
 * several pages, each put in order with `readingOrder`).
 */
export function parseRecipeText(
  input: TextLine[] | string[],
  options: { ordered?: boolean } = {},
): ParsedRecipeText {
  const raw: TextLine[] = input.map((l) => (typeof l === 'string' ? { text: l } : l));
  const lines = (options.ordered ? raw : readingOrder(raw))
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text && /[a-z0-9¼½¾⅓⅔]/i.test(l.text) && !/^\d{1,3}$/.test(l.text));

  let servings: number | null = null;
  let prepMinutes: number | null = null;
  let cookMinutes: number | null = null;
  const content: TextLine[] = [];
  for (const line of lines) {
    const s = line.text.match(SERVINGS);
    const p = line.text.match(PREP);
    const c = line.text.match(COOK);
    if (s) servings ??= Number(s[1]);
    if (p) prepMinutes ??= minutes(p[1], p[2]);
    if (c) cookMinutes ??= minutes(c[1], c[2]);
    // A short line that is only metadata ("Serves 4 · Prep 10 min") isn't content.
    const isMeta = (s || p || c || TOTAL.test(line.text)) && line.text.length < 60;
    if (!isMeta) content.push(line);
  }

  const ingIndex = content.findIndex((l) => INGREDIENTS_HEADER.test(l.text));
  const stepIndex = content.findIndex((l) => STEPS_HEADER.test(l.text));

  let intro: TextLine[];
  let ingredientLines: TextLine[];
  let stepLines: TextLine[];
  if (ingIndex >= 0 && stepIndex > ingIndex) {
    intro = content.slice(0, ingIndex);
    ingredientLines = content.slice(ingIndex + 1, stepIndex);
    stepLines = content.slice(stepIndex + 1);
  } else if (ingIndex >= 0) {
    // No method heading: ingredients run until the first long sentence.
    intro = content.slice(0, ingIndex);
    const after = content.slice(ingIndex + 1);
    const end = after.findIndex((l) => !looksLikeIngredient(l.text) && l.text.length > 60);
    ingredientLines = end >= 0 ? after.slice(0, end) : after;
    stepLines = end >= 0 ? after.slice(end) : [];
  } else {
    // No headings at all: the first run of amount-led lines is the ingredient list.
    const start = content.findIndex((l) => looksLikeIngredient(l.text));
    if (start < 0) {
      intro = content.slice(0, 1);
      ingredientLines = [];
      stepLines = content.slice(1);
    } else {
      let end = start;
      while (
        end < content.length &&
        !STEPS_HEADER.test(content[end].text) &&
        (looksLikeIngredient(content[end].text) || content[end].text.length < 30)
      )
        end++;
      intro = content.slice(0, start);
      ingredientLines = content.slice(start, end);
      const skipHeader = STEPS_HEADER.test(content[end]?.text ?? '') ? 1 : 0;
      stepLines = content.slice(end + skipHeader);
    }
  }

  // The title is the largest text before the ingredients (or simply the first line).
  const titleLine = intro.length
    ? intro.reduce((best, l) => ((l.height ?? 0) > (best.height ?? 0) ? l : best), intro[0])
    : undefined;
  const description = intro
    .filter((l) => l !== titleLine)
    .map((l) => l.text)
    .join(' ');

  return {
    title: titleLine?.text ?? '',
    description,
    servings,
    prepMinutes,
    cookMinutes,
    ingredients: collectIngredients(ingredientLines.map((l) => l.text)),
    steps: collectSteps(stepLines),
  };
}

/** A recipe editor draft from parsed text. Anything missing is left for the user to fill in. */
export function parsedToDraft(parsed: ParsedRecipeText, defaultServings: number): RecipeDraft {
  const draft = emptyDraft(parsed.servings ?? defaultServings);
  return {
    ...draft,
    title: toTitleCase(parsed.title),
    description: parsed.description,
    prepMinutes: parsed.prepMinutes,
    cookMinutes: parsed.cookMinutes,
    ingredients: parsed.ingredients.length
      ? parsed.ingredients.map((l) => draftIngredient(l))
      : draft.ingredients,
    steps: parsed.steps.length ? parsed.steps.map((s) => draftStep(s)) : draft.steps,
  };
}

/** Cookbook titles are often all caps; "LEMON CHICKEN" reads better as "Lemon Chicken". */
function toTitleCase(title: string): string {
  if (title !== title.toUpperCase()) return title;
  const small = new Set(['and', 'or', 'with', 'of', 'the', 'a', 'in', 'on', 'for']);
  return title
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
