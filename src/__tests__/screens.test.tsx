import { fireEvent, screen } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import RecipesScreen from '@/app/(tabs)/(recipes)/index';
import GroceriesScreen from '@/app/(tabs)/groceries/index';
import PlanScreen from '@/app/(tabs)/plan/index';
import RecipeScreen from '@/app/recipe/[id]';
import { groceryActions } from '@/features/grocery/hooks';
import { planActions } from '@/features/plan/hooks';

jest.mock('@/features/plan/hooks');
jest.mock('@/features/grocery/hooks');
// Swipe-to-remove needs Reanimated's native runtime; render rows without it.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  // Reset through requireMock: importing the __mocks__ files directly would load
  // separate copies from the ones the screens use.
  jest
    .requireMock<typeof import('@/features/plan/__mocks__/hooks')>('@/features/plan/hooks')
    .resetMockPlan();
  jest
    .requireMock<typeof import('@/features/grocery/__mocks__/hooks')>('@/features/grocery/hooks')
    .resetMockGrocery();
  jest.clearAllMocks();
});

describe('Recipes tab', () => {
  it('lists recipes and filters by chip', async () => {
    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });
    expect(screen.getByText('Shrimp Fried Rice')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Vegan' }));
    expect(screen.getByText('Chickpea Coconut Curry')).toBeTruthy();
    expect(screen.queryByText('Shrimp Fried Rice')).toBeNull();
  });

  it('adds and removes a recipe with the card button', async () => {
    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });

    await fireEvent.press(screen.getByLabelText('Add Shakshuka to plan'));
    expect(planActions.add).toHaveBeenCalledWith('shakshuka');

    await fireEvent.press(screen.getByLabelText('Remove Shakshuka from plan'));
    expect(planActions.remove).toHaveBeenCalledWith('shakshuka');
    expect(screen.getByLabelText('Add Shakshuka to plan')).toBeTruthy();
  });
});

describe('Recipe detail', () => {
  it('shows ingredients and steps, and scales with servings', async () => {
    await renderRouter(
      { 'recipe/[id]': RecipeScreen },
      { initialUrl: '/recipe/chickpea-coconut-curry' },
    );

    expect(screen.getByText('Chickpea Coconut Curry')).toBeTruthy();
    expect(screen.getByText('¾ cup')).toBeTruthy(); // jasmine rice at the default 2 servings
    expect(screen.getByText(/simmer, stirring now and then/i)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('More servings'));
    await fireEvent.press(screen.getByLabelText('More servings'));
    expect(screen.getByText('1 ½ cups')).toBeTruthy(); // 4 servings
  });

  it('adds to the plan with the chosen servings, then edits the plan', async () => {
    await renderRouter({ 'recipe/[id]': RecipeScreen }, { initialUrl: '/recipe/shakshuka' });

    await fireEvent.press(screen.getByLabelText('More servings'));
    await fireEvent.press(screen.getByText('Add to Plan'));
    expect(planActions.add).toHaveBeenCalledWith('shakshuka', 3);
    expect(screen.getByText('In your plan · 3 servings')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('More servings'));
    expect(planActions.setServings).toHaveBeenCalledWith('shakshuka', 4);
    expect(screen.getByText('In your plan · 4 servings')).toBeTruthy();

    await fireEvent.press(screen.getByText('Remove from Plan'));
    expect(screen.getByText('Add to Plan')).toBeTruthy();
  });

  it('handles an unknown recipe id', async () => {
    await renderRouter({ 'recipe/[id]': RecipeScreen }, { initialUrl: '/recipe/nope' });
    expect(screen.getByText('This recipe isn’t available.')).toBeTruthy();
  });
});

describe('My Plan tab', () => {
  it('shows an empty state', async () => {
    await renderRouter({ index: PlanScreen }, { initialUrl: '/' });
    expect(screen.getByText('Your plan is empty')).toBeTruthy();
    expect(screen.getByText('Browse recipes')).toBeTruthy();
  });

  it('lists planned recipes with a summary and edits servings', async () => {
    await planActions.add('shakshuka', 2);
    await planActions.add('peanut-noodles', 4);
    await renderRouter({ index: PlanScreen }, { initialUrl: '/' });

    expect(screen.getByText('Shakshuka')).toBeTruthy();
    expect(screen.getByText('Crunchy Peanut Noodles')).toBeTruthy();
    expect(screen.getByText(/2 recipes · 6 servings/)).toBeTruthy();

    await fireEvent.press(screen.getAllByLabelText('Fewer servings')[1]);
    expect(planActions.setServings).toHaveBeenCalledWith('peanut-noodles', 3);
    expect(screen.getByText(/2 recipes · 5 servings/)).toBeTruthy();
  });
});

describe('Groceries tab', () => {
  it('shows an empty state with no plan', async () => {
    await renderRouter({ index: GroceriesScreen }, { initialUrl: '/' });
    expect(screen.getByText('No groceries yet')).toBeTruthy();
  });

  it('merges planned recipes into one list grouped by aisle', async () => {
    await planActions.add('black-bean-tacos-lime-slaw', 4);
    await planActions.add('sweet-potato-black-bean-chili', 4);
    await renderRouter({ index: GroceriesScreen }, { initialUrl: '/' });

    expect(screen.getByText('Produce')).toBeTruthy();
    expect(screen.getByLabelText('4 cans black beans')).toBeTruthy();
    expect(screen.getByLabelText('3 limes')).toBeTruthy();
    expect(screen.getByText('You probably have')).toBeTruthy(); // olive oil, salt
  });

  it('checks items off into a collapsible "In cart" section', async () => {
    await planActions.add('black-bean-tacos-lime-slaw', 4);
    await renderRouter({ index: GroceriesScreen }, { initialUrl: '/' });

    await fireEvent.press(screen.getByLabelText('2 limes'));
    expect(groceryActions.setLineChecked).toHaveBeenCalledWith('lime', true);
    expect(screen.getByText('In cart (1)')).toBeTruthy();
    expect(screen.queryByLabelText('2 limes')).toBeNull(); // collapsed

    await fireEvent.press(screen.getByText('In cart (1)'));
    expect(screen.getByLabelText('2 limes')).toBeTruthy();
  });

  it('adds custom items and shares what is left to buy', async () => {
    jest.spyOn(Alert, 'prompt').mockImplementation((_title, _message, buttons) => {
      const add = (buttons as { text: string; onPress: (t: string) => void }[])[1];
      add.onPress('paper towels');
    });
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await planActions.add('shakshuka', 2);
    // A Stack layout so the screen gets its header (with the share button).
    await renderRouter({ _layout: () => <Stack />, index: GroceriesScreen }, { initialUrl: '/' });

    await fireEvent.press(screen.getByLabelText('Add an item to the list'));
    expect(screen.getByText('Your items')).toBeTruthy();
    expect(screen.getByLabelText('paper towels')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Share list'));
    const message = share.mock.calls[0][0].message!;
    expect(message).toContain('• 4 eggs');
    expect(message).toContain('YOUR ITEMS\n• paper towels');
  });
});
