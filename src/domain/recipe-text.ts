/**
 * The recipe read from a scan, and the editor draft made from it. Claude reads
 * the recipe on the scan server; the phone's text recognition supplies lines
 * (with positions) that are put in reading order and sent along with the photos.
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
