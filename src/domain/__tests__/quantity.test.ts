import type { Ingredient } from '@/catalog/types';
import { formatFraction, formatIngredient, scaleFactor } from '@/domain/quantity';

const lime: Ingredient = { id: 'lime', name: 'lime', aisle: 'produce', kind: 'plant' };
const garlic: Ingredient = {
  id: 'garlic',
  name: 'garlic',
  plural: 'garlic',
  aisle: 'produce',
  kind: 'plant',
};
const salt: Ingredient = { id: 'salt', name: 'salt', aisle: 'spices', kind: 'plant' };

describe('formatFraction', () => {
  it.each([
    [2, '2'],
    [1.5, '1 ½'],
    [0.25, '¼'],
    [0.33, '⅓'],
    [0.66, '⅔'],
    [2.75, '2 ¾'],
    [0.97, '1'],
    [1.04, '1'],
    [0.02, '⅛'],
  ])('%p → %p', (value, expected) => {
    expect(formatFraction(value)).toBe(expected);
  });
});

describe('formatIngredient', () => {
  it('pluralizes counted ingredients', () => {
    expect(formatIngredient({ quantity: 2, unit: 'whole' }, lime)).toEqual({
      amount: '2',
      name: 'limes',
    });
    expect(formatIngredient({ quantity: 1, unit: 'whole' }, lime)).toEqual({
      amount: '1',
      name: 'lime',
    });
  });

  it('pluralizes the unit, not the name, for measured ingredients', () => {
    expect(formatIngredient({ quantity: 3, unit: 'clove' }, garlic)).toEqual({
      amount: '3 cloves',
      name: 'garlic',
    });
    expect(formatIngredient({ quantity: 1.5, unit: 'cup' }, salt).amount).toBe('1 ½ cups');
    expect(formatIngredient({ quantity: 2, unit: 'tbsp' }, salt).amount).toBe('2 tbsp');
  });

  it('uses the singular for one of a plural-named ingredient', () => {
    const carrots: Ingredient = { id: 'carrots', name: 'carrots', aisle: 'produce', kind: 'plant' };
    const tomatoes: Ingredient = { ...carrots, id: 't', name: 'cherry tomatoes' };
    expect(formatIngredient({ quantity: 1, unit: 'whole' }, carrots).name).toBe('carrot');
    expect(formatIngredient({ quantity: 2, unit: 'whole' }, carrots).name).toBe('carrots');
    expect(formatIngredient({ quantity: 1, unit: 'whole' }, tomatoes).name).toBe('cherry tomato');
    expect(formatIngredient({ quantity: 1, unit: 'whole' }, garlic).name).toBe('garlic');
    expect(formatIngredient({ quantity: 1, unit: 'lb' }, carrots).name).toBe('carrots');
  });

  it('scales by the given factor', () => {
    const factor = scaleFactor(4, 2);
    expect(formatIngredient({ quantity: 1.5, unit: 'lb' }, salt, factor).amount).toBe('¾ lb');
    expect(formatIngredient({ quantity: 3, unit: 'whole' }, lime, scaleFactor(4, 6))).toEqual({
      amount: '4 ½',
      name: 'limes',
    });
  });

  it('rounds metric amounts to sensible steps', () => {
    expect(formatIngredient({ quantity: 454, unit: 'g' }, salt).amount).toBe('450 g');
    expect(formatIngredient({ quantity: 23, unit: 'ml' }, salt).amount).toBe('25 ml');
    expect(formatIngredient({ quantity: 3.3, unit: 'g' }, salt).amount).toBe('3 g');
  });

  it('leaves "to taste" ingredients without an amount', () => {
    expect(formatIngredient({ quantity: null, unit: null }, salt, 2)).toEqual({
      amount: '',
      name: 'salt',
    });
  });
});
