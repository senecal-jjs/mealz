import { catalog } from '@/catalog';
import {
  matchIngredient,
  parseIngredientLine,
  parseQuantity,
  parseUnit,
} from '@/domain/ingredient-text';

const ingredients = [...catalog.ingredients.values()];
const match = (name: string) => matchIngredient(name, ingredients)?.id;

describe('parseQuantity', () => {
  it.each([
    ['2', 2],
    ['1.5', 1.5],
    ['3/4', 0.75],
    ['1 1/2', 1.5],
    ['1½', 1.5],
    ['1 ½', 1.5],
    ['½', 0.5],
    ['2-3', 3],
    ['2 to 3', 3],
    ['two', 2],
    ['a', 1],
  ])('%p → %p', (text, expected) => {
    expect(parseQuantity(text)).toBeCloseTo(expected);
  });

  it.each(['', 'lots', '0', '1 cup'])('%p → null', (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe('parseUnit', () => {
  it('reads common spellings and abbreviations', () => {
    expect(parseUnit('Tablespoons')).toBe('tbsp');
    expect(parseUnit('tbsp.')).toBe('tbsp');
    expect(parseUnit('T')).toBe('tbsp');
    expect(parseUnit('t')).toBe('tsp');
    expect(parseUnit('ounces')).toBe('oz');
    expect(parseUnit('lbs')).toBe('lb');
    expect(parseUnit('cloves')).toBe('clove');
    expect(parseUnit('onions')).toBeNull();
    // Common text recognition misreads.
    expect(parseUnit('tosp')).toBe('tbsp');
    expect(parseUnit('1b')).toBe('lb');
    expect(parseUnit('1bs')).toBe('lb');
  });
});

describe('parseIngredientLine', () => {
  it.each([
    ['2 cups jasmine rice', { quantity: 2, unit: 'cup', name: 'jasmine rice' }],
    [
      '1 ½ lb boneless chicken thighs, cut into pieces',
      { quantity: 1.5, unit: 'lb', name: 'boneless chicken thighs', prep: 'cut into pieces' },
    ],
    [
      '2 large yellow onions, diced',
      { quantity: 2, unit: 'whole', name: 'large yellow onions', prep: 'diced' },
    ],
    ['3 cloves garlic, minced', { quantity: 3, unit: 'clove', name: 'garlic', prep: 'minced' }],
    [
      '1 (15-ounce) can black beans, drained',
      { quantity: 1, unit: 'can', name: 'black beans', prep: '15-ounce, drained' },
    ],
    ['• 1/4 tsp red pepper flakes', { quantity: 0.25, unit: 'tsp', name: 'red pepper flakes' }],
    ['Salt and pepper to taste', { quantity: null, unit: null, name: 'Salt and pepper' }],
    ['A pinch of salt', { quantity: null, unit: null, name: 'salt' }],
    [
      '½ cup sour cream (optional)',
      { quantity: 0.5, unit: 'cup', name: 'sour cream', optional: true },
    ],
    ['2 tablespoons olive oil', { quantity: 2, unit: 'tbsp', name: 'olive oil' }],
    ['1 lemon', { quantity: 1, unit: 'whole', name: 'lemon' }],
    [
      'Fresh basil, for serving',
      { quantity: null, unit: null, name: 'Fresh basil', prep: 'for serving' },
    ],
  ])('%p', (line, expected) => {
    expect(parseIngredientLine(line)).toEqual(expected);
  });
});

describe('matchIngredient', () => {
  it.each([
    ['jasmine rice', 'jasmine-rice'],
    ['large yellow onions', 'yellow-onion'],
    ['onion', 'yellow-onion'],
    ['red onion', 'red-onion'],
    ['garlic', 'garlic'],
    ['boneless chicken thighs', 'chicken-thighs'],
    ['boneless, skinless chicken breasts', 'chicken-breast'],
    ['scallions', 'green-onion'],
    ['extra-virgin olive oil', 'olive-oil'],
    ['kosher salt', 'salt'],
    ['freshly ground black pepper', 'black-pepper'],
    ['red bell pepper', 'bell-pepper'],
    ['eggs', 'egg'],
    ['cherry tomatoes', 'cherry-tomatoes'],
    ['black beans', 'black-beans'],
    ['red pepper flakes', 'red-pepper-flakes'],
    ['Salt and pepper', 'salt'],
    ['grated parmesan cheese', 'parmesan'],
    ['diced tomatoes', 'diced-tomatoes'],
    ['crushed tomatoes', 'crushed-tomatoes'],
    ['smoked paprika', 'smoked-paprika'],
  ])('%p → %p', (name, id) => {
    expect(match(name)).toBe(id);
  });

  it.each(['gochujang', 'saffron threads', 'pomegranate molasses', ''])(
    '%p has no match',
    (name) => {
      expect(match(name)).toBeUndefined();
    },
  );
});
