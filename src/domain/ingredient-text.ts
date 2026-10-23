/**
 * Turns free text like "1 ½ cups jasmine rice, rinsed" into a structured
 * ingredient line, and matches ingredient names to the catalog. Used by the
 * recipe editor and by photo import.
 */
import type { Ingredient, Unit } from '@/catalog/types';

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅕': 1 / 5,
  '⅙': 1 / 6,
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  half: 0.5,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');
// Longest forms first, so "1 1/2" isn't read as "1".
const NUMBER = `(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?(?:\\s*[${FRACTION_CHARS}])?|[${FRACTION_CHARS}])`;
/** A leading amount: "1", "1.5", "1 1/2", "1½", "½", or a range like "2-3" / "2 to 3". */
const LEADING_AMOUNT = new RegExp(`^(${NUMBER})(?:\\s*(?:-|–|to)\\s*(${NUMBER}))?\\s*`, 'i');

function parseNumber(text: string): number | null {
  const t = text.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
  const withUnicode = t.match(new RegExp(`^(\\d+(?:\\.\\d+)?)?\\s*([${FRACTION_CHARS}])$`));
  if (withUnicode) return Number(withUnicode[1] ?? 0) + UNICODE_FRACTIONS[withUnicode[2]];
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * "1 ½" → 1.5, "3/4" → 0.75, "2-3" → 3 (the top of a range, so you don't run
 * short), "two" → 2. Returns null for empty or unreadable text.
 */
export function parseQuantity(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t];
  const m = t.match(LEADING_AMOUNT);
  if (!m || m[0].trim().length !== t.length) return null;
  const value = parseNumber(m[2] ?? m[1]);
  return value !== null && value > 0 ? value : null;
}

const UNIT_WORDS: [Unit, string[]][] = [
  ['tbsp', ['tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbs', 'tbl', 'T']],
  ['tsp', ['teaspoons', 'teaspoon', 'tsps', 'tsp', 't']],
  ['cup', ['cups', 'cup', 'c']],
  ['oz', ['ounces', 'ounce', 'oz']],
  ['lb', ['pounds', 'pound', 'lbs', 'lb']],
  ['kg', ['kilograms', 'kilogram', 'kgs', 'kg']],
  ['g', ['grams', 'gram', 'g', 'gr']],
  ['ml', ['milliliters', 'millilitres', 'milliliter', 'millilitre', 'ml']],
  ['l', ['liters', 'litres', 'liter', 'litre', 'l']],
  ['clove', ['cloves', 'clove']],
  ['can', ['cans', 'can', 'tins', 'tin']],
  ['bunch', ['bunches', 'bunch']],
  ['slice', ['slices', 'slice']],
];

/** Words meaning "a little, to taste": the line gets no amount. */
const TO_TASTE_UNITS = ['pinch', 'pinches', 'dash', 'dashes', 'sprinkle', 'splash'];

/** "Tablespoons" → 'tbsp'. Capital "T" means tablespoon; lowercase "t" teaspoon. */
export function parseUnit(word: string): Unit | null {
  const w = word.replace(/\.$/, '');
  const lookup = (candidate: string) => {
    for (const [unit, words] of UNIT_WORDS) {
      if (words.includes(candidate)) return unit;
      if (candidate !== 'T' && candidate !== 't' && words.includes(candidate.toLowerCase())) {
        return unit;
      }
    }
    return null;
  };
  // Text recognition often reads "b" as "o" and "l" as "1" ("tosp", "1b").
  return lookup(w) ?? (w.length > 1 ? lookup(w.replace(/o/g, 'b').replace(/1/g, 'l')) : null);
}

export type ParsedIngredient = {
  quantity: number | null;
  unit: Unit | null;
  /** The ingredient itself, e.g. "yellow onions". */
  name: string;
  /** Preparation notes, e.g. "diced" or "15 oz, drained". */
  prep?: string;
  optional?: boolean;
};

/**
 * "2 large yellow onions, diced" → { quantity: 2, unit: 'whole', name: 'large
 * yellow onions', prep: 'diced' }. Lines without an amount ("Salt and pepper
 * to taste") get a null quantity.
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  let text = line
    .replace(/^\s*(?:[-–•*·▪◦]|\d+[.)]\s)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  let optional = false;
  if (/\(?\boptional\b\)?/i.test(text)) {
    optional = true;
    text = text.replace(/,?\s*\(?\boptional\b\)?/i, '').trim();
  }
  let toTaste = false;
  if (
    /\b(to taste|as needed|for serving|for garnish)\b/i.test(text) &&
    !LEADING_AMOUNT.test(text)
  ) {
    toTaste = true;
  }
  text = text.replace(/,?\s*\b(to taste|as needed)\b/i, '').trim();

  let quantity: number | null = null;
  const amount = text.match(LEADING_AMOUNT);
  if (amount && amount[0].trim()) {
    quantity = parseNumber(amount[2] ?? amount[1]);
    text = text.slice(amount[0].length);
  } else {
    const word = text.match(/^(a|an|one|two|three|four|five|six|eight|ten|twelve|half)\s+/i);
    if (word) {
      quantity = WORD_NUMBERS[word[1].toLowerCase()];
      text = text.slice(word[0].length);
    }
  }

  // "1 (15-ounce) can" keeps the size as a prep note.
  const notes: string[] = [];
  const size = text.match(/^\(([^)]+)\)\s*/);
  if (size) {
    notes.push(size[1]);
    text = text.slice(size[0].length);
  }

  let unit: Unit | null = null;
  const unitWord = text.match(/^([A-Za-z]+\.?)\s+(?:of\s+)?/);
  if (unitWord) {
    if (TO_TASTE_UNITS.includes(unitWord[1].toLowerCase())) {
      quantity = null;
      toTaste = true;
      text = text.slice(unitWord[0].length);
    } else if (quantity !== null) {
      const parsed = parseUnit(unitWord[1]);
      if (parsed) {
        unit = parsed;
        text = text.slice(unitWord[0].length);
      }
    }
  }
  if (quantity !== null && unit === null) unit = 'whole';
  if (toTaste) {
    quantity = null;
    unit = null;
  }

  // The first comma, or a trailing parenthetical, starts the prep notes.
  const comma = text.indexOf(',');
  let name = comma >= 0 ? text.slice(0, comma) : text;
  if (comma >= 0) notes.push(text.slice(comma + 1).trim());
  const paren = name.match(/\s*\(([^)]*)\)\s*$/);
  if (paren) {
    notes.unshift(paren[1]);
    name = name.slice(0, paren.index);
  }
  name = name.replace(/\b(for serving|for garnish)\b/i, '').trim();

  const prep = notes.filter(Boolean).join(', ');
  return {
    quantity,
    unit,
    name,
    ...(prep && { prep }),
    ...(optional && { optional }),
  };
}

/** Words that describe an ingredient without changing what you'd buy. */
const DESCRIPTORS = new Set([
  'fresh',
  'large',
  'small',
  'medium',
  'big',
  'chopped',
  'diced',
  'minced',
  'sliced',
  'grated',
  'shredded',
  'crushed',
  'finely',
  'roughly',
  'thinly',
  'peeled',
  'raw',
  'organic',
  'whole',
  'boneless',
  'skinless',
  'extra',
  'virgin',
  'kosher',
  'sea',
  'packed',
  'heaping',
  'about',
  'of',
  'and',
  'or',
  'cold',
  'warm',
  'softened',
  'melted',
  'ripe',
  'plain',
  'unsalted',
  'salted',
  'low',
  'sodium',
  'reduced',
]);

/** Common names that differ from the catalog's. */
const ALIASES: Record<string, string> = {
  onion: 'yellow-onion',
  'white onion': 'yellow-onion',
  'brown onion': 'yellow-onion',
  scallion: 'green-onion',
  'spring onion': 'green-onion',
  coriander: 'cilantro',
  pepper: 'black-pepper',
  'black pepper': 'black-pepper',
  'ground black pepper': 'black-pepper',
  'salt and pepper': 'salt',
  'salt pepper': 'salt',
  oil: 'vegetable-oil',
  'canola oil': 'vegetable-oil',
  'neutral oil': 'vegetable-oil',
  egg: 'egg',
  'chicken breast': 'chicken-breast',
  'chicken thigh': 'chicken-thighs',
  'red pepper flake': 'red-pepper-flakes',
  'chili flake': 'red-pepper-flakes',
  'soy sauce': 'soy-sauce',
  tamari: 'soy-sauce',
  stock: 'vegetable-broth',
  'vegetable stock': 'vegetable-broth',
  ginger: 'ginger',
  parmesan: 'parmesan',
  'parmigiano reggiano': 'parmesan',
  rice: 'jasmine-rice',
  pasta: 'short-pasta',
  penne: 'short-pasta',
  fusilli: 'short-pasta',
  rigatoni: 'short-pasta',
  tomato: 'cherry-tomatoes',
  potato: 'baby-potatoes',
};

function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

/** Lowercase, no punctuation, singular words. */
function allWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

/** Like `allWords`, with descriptors ("fresh", "large", "diced"…) removed. */
export function coreWords(text: string): string[] {
  return allWords(text).filter((w) => !DESCRIPTORS.has(w));
}

/**
 * Finds the catalog ingredient a name refers to, or undefined if there's no
 * confident match. Prefers exact names, then aliases, then the ingredient
 * whose name is fully contained in the text with the most words ("yellow
 * onion" beats "onion").
 */
export function matchIngredient(
  name: string,
  ingredients: Iterable<Ingredient>,
): Ingredient | undefined {
  const list = [...ingredients];
  const words = coreWords(name);
  const key = words.join(' ');
  if (!key) return undefined;

  // Exact names first, before descriptor words are dropped: otherwise "diced
  // tomatoes" and "crushed tomatoes" both reduce to "tomato".
  const fullKey = allWords(name).join(' ');
  let bestFull: { ingredient: Ingredient; score: number } | undefined;
  for (const ingredient of list) {
    for (const candidate of [ingredient.name, ingredient.plural].filter(Boolean) as string[]) {
      const cw = allWords(candidate);
      if (cw.join(' ') === fullKey) return ingredient;
      if (
        cw.length >= 2 &&
        cw.every((w) => fullKey.split(' ').includes(w)) &&
        (!bestFull || cw.length > bestFull.score)
      ) {
        bestFull = { ingredient, score: cw.length };
      }
    }
  }
  if (bestFull) return bestFull.ingredient;

  const byId = new Map(list.map((i) => [i.id, i]));
  let best: { ingredient: Ingredient; score: number } | undefined;
  for (const ingredient of list) {
    for (const candidate of [ingredient.name, ingredient.plural].filter(Boolean) as string[]) {
      const cw = coreWords(candidate);
      if (!cw.length) continue;
      if (cw.join(' ') === key) return ingredient;
      const contained = cw.every((w) => words.includes(w));
      if (contained && (!best || cw.length > best.score)) best = { ingredient, score: cw.length };
    }
  }

  const alias = ALIASES[key];
  if (alias && byId.has(alias)) {
    // A longer exact-word match beats a generic alias ("red onion" over "onion").
    if (!best || best.score <= 1) return byId.get(alias);
  }
  // Single generic words ("oil", "cheese") aren't enough on their own.
  if (best && (best.score >= 2 || words.length === 1)) return best.ingredient;
  if (best && best.score === 1 && words.length <= 2) return best.ingredient;
  return alias ? byId.get(alias) : undefined;
}
