import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RecipesScreen from '@/app/(tabs)/(recipes)/index';
import RecipeScreen from '@/app/recipe/[id]';

describe('Recipes tab', () => {
  it('lists recipes and filters by chip', async () => {
    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });
    expect(screen.getByText('Shrimp Fried Rice')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Vegan' }));
    expect(screen.getByText('Chickpea Coconut Curry')).toBeTruthy();
    expect(screen.queryByText('Shrimp Fried Rice')).toBeNull();
  });
});

describe('Recipe detail', () => {
  it('shows ingredients and steps, and scales with servings', async () => {
    await renderRouter(
      { 'recipe/[id]': RecipeScreen },
      { initialUrl: '/recipe/chickpea-coconut-curry' },
    );

    expect(screen.getByText('Chickpea Coconut Curry')).toBeTruthy();
    expect(screen.getByText('1 ½ cups')).toBeTruthy(); // jasmine rice at 4 servings
    expect(screen.getByText(/simmer, stirring now and then/i)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Fewer servings'));
    await fireEvent.press(screen.getByLabelText('Fewer servings'));
    expect(screen.getByText('¾ cup')).toBeTruthy(); // 2 servings
  });

  it('handles an unknown recipe id', async () => {
    await renderRouter({ 'recipe/[id]': RecipeScreen }, { initialUrl: '/recipe/nope' });
    expect(screen.getByText('This recipe isn’t available.')).toBeTruthy();
  });
});
