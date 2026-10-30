import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import AddRecipeScreen from '@/app/add-recipe/index';
import ScanRecipeScreen from '@/app/add-recipe/scan';
import type { CreditSummary } from '@/features/credit/credit';
import { useCredit } from '@/features/credit/store';
import { CloudScanError } from '@/features/my-recipes/cloud';
import { readScan } from '@/features/my-recipes/read-scan';
import { preferenceActions } from '@/features/preferences/hooks';

jest.mock('@/features/preferences/hooks');
jest.mock('@/features/my-recipes/cloud', () => ({
  ...jest.requireActual('@/features/my-recipes/cloud'),
  isCloudScanConfigured: () => true,
}));
jest.mock('@/features/my-recipes/scan', () => ({
  isTextRecognitionAvailable: () => true,
  readPage: jest.fn(async () => [{ text: 'Toast' }, { text: '1 slice bread' }]),
}));
jest.mock('@/features/my-recipes/pick-photo', () => ({
  pickPhoto: jest.fn(async () => 'file:///page.jpg'),
}));
jest.mock('@/features/my-recipes/read-scan', () => ({ readScan: jest.fn() }));
jest.mock('@/features/credit/refresh', () => ({
  refreshCredit: jest.fn(async () => {
    const { useCredit } = jest.requireActual('@/features/credit/store');
    const summary = jest.requireMock('@/features/credit/refresh').mockSummary;
    useCredit.getState().setSummary(summary);
    return summary;
  }),
  mockSummary: null,
}));
jest.mock('@/features/credit/wallet', () => ({
  getWallet: async () => '0f8fad5b-d9cb-469f-a165-70867728950e',
  setWallet: async () => {},
}));
jest.mock('@/features/credit/purchases', () => {
  const { create } = jest.requireActual('zustand');
  return {
    usePurchase: create(() => ({ buying: null, error: null })),
    loadPacks: jest.fn(async () => [
      { id: 'com.bitcli.mealz.credit.199', displayPrice: '$1.99' },
      { id: 'com.bitcli.mealz.credit.499', displayPrice: '$4.99' },
    ]),
    buyPack: jest.fn(),
    addPendingPurchases: jest.fn(async () => {}),
  };
});

const setServerCredit = (summary: CreditSummary) => {
  jest.requireMock('@/features/credit/refresh').mockSummary = summary;
};

const recipe = {
  title: 'Toast',
  description: '',
  servings: 1,
  prepMinutes: null,
  cookMinutes: null,
  ingredients: ['1 slice bread'],
  steps: ['Toast the bread.'],
};

const Editor = () => <Text>Editor open</Text>;
const routes = {
  'add-recipe/index': AddRecipeScreen,
  'add-recipe/scan': ScanRecipeScreen,
  'recipe-editor': Editor,
};

/** Presses the button with this label in the last Alert shown. */
async function answerAlert(label: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  await act(async () => {
    buttons.find((b) => b.text === label)?.onPress?.();
  });
}

beforeEach(() => {
  jest
    .requireMock<typeof import('@/features/preferences/__mocks__/hooks')>(
      '@/features/preferences/hooks',
    )
    .resetMockPreferences({ onboardedAt: new Date(), installId: 'install-0123456789abcdef' });
  useCredit.setState({ summary: null });
  setServerCredit({ priceCents: 10, freeScansLeft: 2, balanceCents: 499 });
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

describe('Add a Recipe', () => {
  it('shows the credit and packs, and asks once before the first scan', async () => {
    await renderRouter(routes, { initialUrl: '/add-recipe' });
    expect(await screen.findByText(/2 free scans left this month/)).toBeTruthy();
    expect(screen.getAllByText('$4.99')).toHaveLength(2); // the balance, and a pack's price
    expect(await screen.findByText('$1.99 of credit')).toBeTruthy();
    expect(await screen.findByText('0f8fad5b-d9cb-469f-a165-70867728950e')).toBeTruthy();

    await fireEvent.press(screen.getByText('Scan a Recipe'));
    expect(jest.mocked(Alert.alert).mock.calls[0][0]).toBe('Recipes are read by Claude');
    await answerAlert('Continue');
    expect(preferenceActions.save).toHaveBeenCalledWith({ cloudScan: 'allowed' });
    expect(await screen.findByText('Snap a recipe')).toBeTruthy();
  });

  it('types a recipe in without scanning', async () => {
    await renderRouter(routes, { initialUrl: '/add-recipe' });
    await fireEvent.press(await screen.findByText('Type It In'));
    expect(await screen.findByText('Editor open')).toBeTruthy();
  });
});

describe('Scan a Recipe', () => {
  const scanPage = async () => {
    await renderRouter({ index: ScanRecipeScreen, 'recipe-editor': Editor }, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Choose from Library'));
    expect(await screen.findByText('1 page ready')).toBeTruthy();
  };

  it('says why a read failed, keeps the page, and tries again', async () => {
    useCredit.setState({ summary: { priceCents: 10, freeScansLeft: 1, balanceCents: 0 } });
    await scanPage();
    expect(screen.getByText(/last free scan/)).toBeTruthy();

    jest.mocked(readScan).mockRejectedValueOnce(new CloudScanError('offline'));
    await fireEvent.press(screen.getByText('Read Recipe'));
    expect(await screen.findByText(/You’re offline/)).toBeTruthy();
    expect(screen.getByText('Type It In Instead')).toBeTruthy();

    jest.mocked(readScan).mockResolvedValueOnce({ recipe, notes: [], credit: null });
    await fireEvent.press(screen.getByText('Try Again'));
    expect(await screen.findByText('Editor open')).toBeTruthy();
    expect(readScan).toHaveBeenCalledTimes(2);
  });

  it('offers credit instead of sending a scan it can’t pay for', async () => {
    useCredit.setState({ summary: { priceCents: 10, freeScansLeft: 0, balanceCents: 5 } });
    await scanPage();
    await fireEvent.press(screen.getByText('Read Recipe'));
    expect(await screen.findByText(/out of scan credit/)).toBeTruthy();
    expect(await screen.findByText('$1.99 of credit')).toBeTruthy();
    expect(readScan).not.toHaveBeenCalled();

    // Once a purchase is added, the scan can go ahead.
    await act(async () => {
      useCredit.getState().setBalance(204);
    });
    expect(screen.queryByText(/out of scan credit/)).toBeNull();
    expect(screen.getByText('This scan costs $0.10 of your $2.04 credit.')).toBeTruthy();
  });
});
