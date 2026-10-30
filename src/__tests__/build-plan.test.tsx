import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import BuildPlanScreen from '@/app/build-plan';
import { planActions } from '@/features/plan/hooks';

jest.mock('@/features/plan/hooks');
jest.mock('@/features/preferences/hooks');
jest.mock('@/features/favourites/hooks');
jest.mock('@/catalog/live');

const Plan = () => <Text>My Plan</Text>;
const routes = { index: Plan, 'build-plan': BuildPlanScreen };

beforeEach(() => {
  jest.requireMock<typeof import('@/catalog/__mocks__/live')>('@/catalog/live').resetMockCatalog();
  jest
    .requireMock<typeof import('@/features/plan/__mocks__/hooks')>('@/features/plan/hooks')
    .resetMockPlan();
  jest
    .requireMock<typeof import('@/features/favourites/__mocks__/hooks')>(
      '@/features/favourites/hooks',
    )
    .resetMockFavourites();
  jest
    .requireMock<typeof import('@/features/preferences/__mocks__/hooks')>(
      '@/features/preferences/hooks',
    )
    .resetMockPreferences({ onboardedAt: new Date(), defaultServings: 3 });
  jest.clearAllMocks();
});

const open = async () => {
  await renderRouter(routes, { initialUrl: '/build-plan' });
  expect(screen.getByText('Meals')).toBeTruthy();
};

describe('Build Me a Plan', () => {
  it('builds the chosen number of meals, swaps one, and adds them at the chosen servings', async () => {
    await open();
    await fireEvent.press(screen.getByLabelText('More meals'));
    await fireEvent.press(screen.getByText('Build My Plan'));

    expect(screen.getByText('6 meals, 3 servings each. Swap any you don’t fancy.')).toBeTruthy();
    const swaps = screen.getAllByText('Swap');
    expect(swaps).toHaveLength(6);

    const before = JSON.stringify(screen.toJSON());
    await fireEvent.press(swaps[0]);
    expect(JSON.stringify(screen.toJSON())).not.toEqual(before);

    await fireEvent.press(screen.getByText('Add to Plan'));
    expect(planActions.add).toHaveBeenCalledTimes(6);
    expect(jest.mocked(planActions.add).mock.calls.every(([, servings]) => servings === 3)).toBe(
      true,
    );
    expect(new Set(jest.mocked(planActions.add).mock.calls.map(([id]) => id)).size).toBe(6);
  });

  it('starts over from the choices', async () => {
    await open();
    await fireEvent.press(screen.getByText('Build My Plan'));
    await fireEvent.press(screen.getByText('Start Over'));
    expect(screen.getByText('Build My Plan')).toBeTruthy();
    expect(planActions.add).not.toHaveBeenCalled();
  });
});
