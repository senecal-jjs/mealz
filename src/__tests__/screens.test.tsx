import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RecipesScreen from '@/app/(tabs)/(recipes)/index';
import PlanScreen from '@/app/(tabs)/plan/index';
import RecipeScreen from '@/app/recipe/[id]';
import { resetMockPlan } from '@/features/plan/__mocks__/hooks';
import { planActions } from '@/features/plan/hooks';

jest.mock('@/features/plan/hooks');
// Swipe-to-remove needs Reanimated's native runtime; render rows without it.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  resetMockPlan();
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
