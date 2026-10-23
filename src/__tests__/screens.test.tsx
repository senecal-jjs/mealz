import { fireEvent, screen } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import RecipesScreen from '@/app/(tabs)/(recipes)/index';
import GroceriesScreen from '@/app/(tabs)/groceries/index';
import CookScreen from '@/app/cook/[id]';
import OnboardingAllergies from '@/app/onboarding/allergies';
import OnboardingDiet from '@/app/onboarding/diet';
import OnboardingDislikes from '@/app/onboarding/dislikes';
import OnboardingHousehold from '@/app/onboarding/household';
import OnboardingWelcome from '@/app/onboarding/index';
import FavouritesScreen from '@/app/(tabs)/profile/favourites';
import HistoryScreen from '@/app/(tabs)/profile/history';
import ProfileScreen from '@/app/(tabs)/profile/index';
import PlanScreen from '@/app/(tabs)/plan/index';
import RecipeScreen from '@/app/recipe/[id]';
import { groceryActions } from '@/features/grocery/hooks';
import { useTimers } from '@/features/cook/timers';
import { favouriteActions } from '@/features/favourites/hooks';
import { planActions } from '@/features/plan/hooks';
import { preferenceActions } from '@/features/preferences/hooks';

jest.mock('@/features/plan/hooks');
jest.mock('@/features/grocery/hooks');
jest.mock('@/features/preferences/hooks');
jest.mock('@/features/favourites/hooks');
jest.mock('@/features/cook/notifications', () => ({
  scheduleTimerAlert: jest.fn(async () => 'alert-1'),
  cancelTimerAlert: jest.fn(async () => {}),
}));
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
  jest
    .requireMock<typeof import('@/features/favourites/__mocks__/hooks')>(
      '@/features/favourites/hooks',
    )
    .resetMockFavourites();
  jest
    .requireMock<typeof import('@/features/preferences/__mocks__/hooks')>(
      '@/features/preferences/hooks',
    )
    .resetMockPreferences({ onboardedAt: new Date() });
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
    expect(planActions.add).toHaveBeenCalledWith('shakshuka', 2);

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

    await fireEvent.press(screen.getByText('Remove'));
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

  it('keeps checked items visible at the bottom so a mistap is easy to undo', async () => {
    await planActions.add('black-bean-tacos-lime-slaw', 4);
    await renderRouter({ index: GroceriesScreen }, { initialUrl: '/' });

    await fireEvent.press(screen.getByLabelText('2 limes'));
    expect(groceryActions.setLineChecked).toHaveBeenCalledWith('lime', true);
    expect(screen.getByText('In cart (1)')).toBeTruthy();

    // Still on screen, checked, and listed after every unchecked item.
    const limes = screen.getByLabelText('2 limes');
    expect(limes.props.accessibilityState.checked).toBe(true);
    const order = screen.getAllByRole('checkbox').map((el) => el.props.accessibilityLabel);
    expect(order.at(-1)).toBe('2 limes');

    // Tapping again puts it back.
    await fireEvent.press(limes);
    expect(groceryActions.setLineChecked).toHaveBeenLastCalledWith('lime', false);
    expect(screen.queryByText(/In cart/)).toBeNull();
    expect(screen.getByLabelText('2 limes').props.accessibilityState.checked).toBe(false);
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

describe('Cook mode', () => {
  beforeEach(() => useTimers.setState({ timers: {} }));

  const renderCook = (id: string) =>
    renderRouter({ 'cook/[id]': CookScreen }, { initialUrl: `/cook/${id}` });

  it('starts with a checklist of ingredients scaled to the plan', async () => {
    await planActions.add('chickpea-coconut-curry', 2);
    await renderCook('chickpea-coconut-curry');

    expect(screen.getAllByText('Get ready')).toHaveLength(2); // progress label and heading
    expect(screen.getByText(/2 servings · about 35 min/)).toBeTruthy();
    const rice = screen.getByRole('checkbox', { name: /¾ cup jasmine rice/ });
    await fireEvent.press(rice);
    expect(rice.props.accessibilityState.checked).toBe(true);
  });

  it('walks through steps showing what each one needs, with timers', async () => {
    await planActions.add('chickpea-coconut-curry', 4);
    await renderCook('chickpea-coconut-curry');

    await fireEvent.press(screen.getByText('Start cooking'));
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();

    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 5')).toBeTruthy();

    // Step 2 cooks the onion for 5 minutes.
    await fireEvent.press(screen.getByText('Start 5 min timer'));
    expect(useTimers.getState().timers['chickpea-coconut-curry:1']).toBeTruthy();
    expect(screen.getByText(/5:00 left · Stop/)).toBeTruthy();

    await fireEvent.press(screen.getByText(/5:00 left · Stop/));
    expect(useTimers.getState().timers).toEqual({});
  });

  it('finishes with a rating and marks the planned recipe cooked', async () => {
    await planActions.add('shakshuka', 2);
    await renderCook('shakshuka');

    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByText(/Start cooking|Next/));
    expect(screen.getByText('All done')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('4 stars'));
    await fireEvent.press(screen.getByText('Mark as cooked'));
    expect(planActions.markCooked).toHaveBeenCalledWith('shakshuka', 4);
  });

  it('offers Start Cooking on a planned recipe page', async () => {
    await planActions.add('shakshuka', 2);
    await renderRouter({ 'recipe/[id]': RecipeScreen }, { initialUrl: '/recipe/shakshuka' });
    expect(screen.getByText('Start Cooking')).toBeTruthy();
    expect(screen.getByText('Remove')).toBeTruthy();
  });
});

const setPrefs = (update: Parameters<typeof preferenceActions.save>[0]) =>
  preferenceActions.save(update);

describe('Onboarding', () => {
  it('walks through diet, allergies, dislikes and household, saving each answer', async () => {
    await renderRouter(
      {
        'onboarding/index': OnboardingWelcome,
        'onboarding/diet': OnboardingDiet,
        'onboarding/allergies': OnboardingAllergies,
        'onboarding/dislikes': OnboardingDislikes,
        'onboarding/household': OnboardingHousehold,
      },
      { initialUrl: '/onboarding' },
    );

    await fireEvent.press(screen.getByText('Get started'));
    expect(screen.getByText('Do you follow a diet?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Vegetarian' }));
    expect(preferenceActions.save).toHaveBeenLastCalledWith({ diet: 'vegetarian' });
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('Any allergies?')).toBeTruthy();
    expect(screen.getByText('No allergies')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Peanuts' }));
    expect(preferenceActions.save).toHaveBeenLastCalledWith({ allergies: ['peanut'] });
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('Anything you don’t like?')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Search ingredients'), 'cilan');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'cilantro' }));
    expect(preferenceActions.save).toHaveBeenLastCalledWith({
      dislikedIngredientIds: ['cilantro'],
    });
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('How many do you cook for?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('More servings'));
    expect(screen.getByText('3 servings per meal')).toBeTruthy();
    await fireEvent.press(screen.getByText('Start planning'));
    expect(preferenceActions.finishOnboarding).toHaveBeenCalled();
  });
});

describe('Preferences in the app', () => {
  it('hides recipes that do not fit and says how many', async () => {
    await setPrefs({ diet: 'vegan' });
    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });
    expect(screen.getByText('Chickpea Coconut Curry')).toBeTruthy();
    expect(screen.queryByText('Shakshuka')).toBeNull();
    expect(screen.getByText(/44 recipes hidden by your preferences/)).toBeTruthy();
  });

  it('adds recipes at the household size', async () => {
    await setPrefs({ defaultServings: 4 });
    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });
    await fireEvent.press(screen.getByLabelText('Add Shakshuka to plan'));
    expect(planActions.add).toHaveBeenCalledWith('shakshuka', 4);
  });

  it('uses metric units on the grocery list', async () => {
    await setPrefs({ units: 'metric' });
    await planActions.add('chickpea-coconut-curry', 4);
    await renderRouter({ index: GroceriesScreen }, { initialUrl: '/' });
    expect(screen.getByLabelText('360 ml jasmine rice')).toBeTruthy();
  });

  it('summarizes and edits preferences on the Profile tab', async () => {
    await setPrefs({ diet: 'pescatarian', allergies: ['dairy', 'egg', 'soy'] });
    await renderRouter({ index: ProfileScreen }, { initialUrl: '/' });
    expect(screen.getByText('Pescatarian')).toBeTruthy();
    expect(screen.getByText('Dairy, Egg +1')).toBeTruthy();

    await fireEvent.press(screen.getByText('Metric'));
    expect(preferenceActions.save).toHaveBeenLastCalledWith({ units: 'metric' });
  });

  it('resets all data after confirming', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await renderRouter({ index: ProfileScreen }, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Reset all data'));
    expect(preferenceActions.resetAll).toHaveBeenCalled();
  });
});

describe('Favourites and history', () => {
  it('saves a favourite from the recipe page and filters to it on browse', async () => {
    await renderRouter(
      { _layout: () => <Stack />, 'recipe/[id]': RecipeScreen },
      { initialUrl: '/recipe/shakshuka' },
    );
    await fireEvent.press(screen.getByLabelText('Save Shakshuka to favourites'));
    expect(favouriteActions.set).toHaveBeenCalledWith('shakshuka', true);
    expect(screen.getByLabelText('Remove Shakshuka from favourites')).toBeTruthy();

    await renderRouter({ index: RecipesScreen }, { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('button', { name: '♥ Favourites' }));
    expect(screen.getByText('Shakshuka')).toBeTruthy();
    expect(screen.queryByText('Shrimp Fried Rice')).toBeNull();
  });

  it('shows an empty favourites list with a way back', async () => {
    await renderRouter({ index: FavouritesScreen }, { initialUrl: '/' });
    expect(screen.getByText('No favourites yet')).toBeTruthy();
  });

  it('lists cooked meals with ratings and plans one again', async () => {
    jest
      .requireMock<typeof import('@/features/plan/__mocks__/hooks')>('@/features/plan/hooks')
      .setMockHistory([
        {
          id: 'h1',
          recipeId: 'shakshuka',
          servings: 3,
          addedAt: new Date(2026, 9, 20),
          cookedAt: new Date(2026, 9, 22),
          rating: 4,
        },
      ]);
    await renderRouter({ index: HistoryScreen }, { initialUrl: '/' });
    expect(screen.getByText('Shakshuka')).toBeTruthy();
    expect(screen.getByText('Cooked Oct 22 · ★★★★☆')).toBeTruthy();

    await fireEvent.press(screen.getByText('Again'));
    expect(planActions.add).toHaveBeenCalledWith('shakshuka', 3);
    expect(screen.getByText('Planned')).toBeTruthy();
  });
});
