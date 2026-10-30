import type { Ingredient, RecipeSource } from '@/catalog/types';
import {
  backedUpIds,
  parseBackup,
  photoName,
  recipesToRestore,
  toBackup,
} from '@/features/backup/format';

const paste: Ingredient = {
  id: 'my-gochujang-paste-k3j9',
  name: 'Gochujang paste',
  category: 'pantry',
  aisle: 'international',
  allergens: [],
  diets: ['vegan'],
} as unknown as Ingredient;
const unused = { ...paste, id: 'my-other-ab12', name: 'Other' } as Ingredient;

const recipe = {
  id: 'my-abc123',
  title: 'Spicy Noodles',
  image: 'recipe-photos/xyz.jpg',
  ingredients: [
    { ingredient: 'my-gochujang-paste-k3j9', amount: 2, unit: 'tbsp' },
    { ingredient: 'garlic', amount: 2, unit: 'clove' },
  ],
  steps: [{ text: 'Boil the noodles.' }],
} as unknown as RecipeSource;

describe('recipe backups', () => {
  it('keeps only the custom ingredients the recipe uses, and its photo’s name', () => {
    const backup = toBackup(recipe, [paste, unused], new Date('2026-10-30T12:00:00Z'));
    expect(backup).toEqual({
      v: 1,
      savedAt: '2026-10-30T12:00:00.000Z',
      recipe,
      ingredients: [paste],
      photo: 'xyz.jpg',
    });
  });

  it('only names photos stored in the app', () => {
    expect(photoName('recipe-photos/xyz.jpg')).toBe('xyz.jpg');
    expect(photoName('https://example.com/a.jpg')).toBeNull();
    expect(photoName(null)).toBeNull();
  });

  it('reads back what it wrote, and rejects anything else', () => {
    const text = JSON.stringify(toBackup(recipe, [paste]));
    expect(parseBackup(text)?.recipe).toEqual(recipe);
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup(JSON.stringify({ ...JSON.parse(text), v: 2 }))).toBeNull();
    // Only the user's own recipes and ingredients, never bundled ids.
    expect(
      parseBackup(JSON.stringify({ ...JSON.parse(text), recipe: { ...recipe, id: 'shakshuka' } })),
    ).toBeNull();
    expect(
      parseBackup(JSON.stringify({ ...JSON.parse(text), ingredients: [{ id: 'garlic' }] })),
    ).toBeNull();
  });

  it('finds the recipes to restore: in the backup, not on the phone, not declined', () => {
    const files = ['my-a.json', 'my-b.json', 'my-c.json', 'shakshuka.json', '.DS_Store'];
    expect(backedUpIds(files)).toEqual(['my-a', 'my-b', 'my-c']);
    expect(recipesToRestore(backedUpIds(files), new Set(['my-a']), new Set(['my-c']))).toEqual([
      'my-b',
    ]);
  });
});
