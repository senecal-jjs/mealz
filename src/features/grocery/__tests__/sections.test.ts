import type { GroceryLine } from '@/domain/grocery';
import { buildGrocerySections, shareText } from '@/features/grocery/sections';

function line(key: string, aisle: GroceryLine['aisle'], amount: string, staple = false) {
  return {
    key,
    amount,
    name: key,
    aisle,
    staple,
    optional: false,
    recipeTitles: [],
  } satisfies GroceryLine;
}

// Already sorted by aisle, as compileGroceryList returns them.
const lines = [
  line('limes', 'produce', '3'),
  line('onion', 'produce', '1'),
  line('chicken', 'meat', '1 lb'),
  line('rice', 'pantry', '1 cup'),
  line('olive oil', 'pantry', '2 tbsp', true),
  line('salt', 'spices', '', true),
];

const summary = (sections: ReturnType<typeof buildGrocerySections>) =>
  sections.map((s) => [s.title, s.data.map((r) => r.key)]);

describe('buildGrocerySections', () => {
  it('groups by aisle and moves staples to their own section', () => {
    expect(summary(buildGrocerySections(lines, new Set(), []))).toEqual([
      ['Produce', ['limes', 'onion']],
      ['Meat & Seafood', ['chicken']],
      ['Pantry', ['rice']],
      ['You probably have', ['olive oil', 'salt']],
    ]);
  });

  it('moves checked lines and custom items into "In cart"', () => {
    const custom = [
      { id: 'c1', customName: 'coffee', checked: false },
      { id: 'c2', customName: 'foil', checked: true },
    ];
    expect(summary(buildGrocerySections(lines, new Set(['chicken', 'salt']), custom))).toEqual([
      ['Produce', ['limes', 'onion']],
      ['Pantry', ['rice']],
      ['Your items', ['c1']],
      ['You probably have', ['olive oil']],
      ['In cart', ['chicken', 'salt', 'c2']],
    ]);
  });

  it('ignores checks for ingredients no longer on the list', () => {
    expect(buildGrocerySections([lines[0]], new Set(['gone']), [])).toHaveLength(1);
  });

  it('is empty when there is nothing to buy', () => {
    expect(buildGrocerySections([], new Set(), [])).toEqual([]);
  });
});

describe('shareText', () => {
  it('lists what is left to buy, by section', () => {
    const sections = buildGrocerySections(lines.slice(0, 3), new Set(['onion']), [
      { id: 'c1', customName: 'coffee', checked: false },
    ]);
    expect(shareText(sections)).toBe(
      [
        'Grocery list',
        'PRODUCE\n• 3 limes',
        'MEAT & SEAFOOD\n• 1 lb chicken',
        'YOUR ITEMS\n• coffee',
      ].join('\n\n'),
    );
  });
});
