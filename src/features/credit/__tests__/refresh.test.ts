import { refreshCredit } from '@/features/credit/refresh';
import { useCredit } from '@/features/credit/store';
import { DEFAULT_PREFERENCES } from '@/features/preferences/preferences';

const HERE = '0f8fad5b-d9cb-469f-a165-70867728950e';
const OLD = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const OLDER = '16fd2706-8baf-433b-82eb-8c7fada847da';

let mockCurrent = HERE;
let mockInICloud: string[] = [];
jest.mock('@/features/credit/wallet', () => ({
  getWallet: async () => mockCurrent,
  iCloudWallets: () => mockInICloud,
  setWallet: jest.fn(async (wallet: string) => {
    mockCurrent = wallet;
  }),
}));
jest.mock('@/features/my-recipes/cloud', () => ({ SCAN_SERVER_URL: 'https://scan.test' }));
jest.mock('@/features/my-recipes/read-scan', () => ({
  ensureInstallId: async () => 'install-0123456789abcdef',
}));

/** The server's balances, by wallet. */
function serve(balances: Record<string, number>, priceCents = 10) {
  global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
    const { wallet } = JSON.parse(String(init?.body));
    const balanceCents = balances[wallet] ?? 0;
    return new Response(JSON.stringify({ priceCents, freeScansLeft: 0, balanceCents }));
  }) as typeof fetch;
}

const prefs = { ...DEFAULT_PREFERENCES, installId: 'install-0123456789abcdef' };

beforeEach(() => {
  mockCurrent = HERE;
  mockInICloud = [];
  useCredit.setState({ summary: null });
});

describe('refreshCredit', () => {
  it('keeps a wallet that has credit', async () => {
    mockInICloud = [OLD, HERE];
    serve({ [HERE]: 50, [OLD]: 499 });
    expect((await refreshCredit(prefs))?.balanceCents).toBe(50);
    expect(mockCurrent).toBe(HERE);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('switches an empty wallet to the iCloud wallet with the most credit', async () => {
    mockInICloud = [OLDER, OLD, HERE];
    serve({ [OLDER]: 120, [OLD]: 499 });
    expect((await refreshCredit(prefs))?.balanceCents).toBe(499);
    expect(mockCurrent).toBe(OLD);
    expect(useCredit.getState().summary?.balanceCents).toBe(499);
  });

  it('stays put when no iCloud wallet has credit, or scans are free', async () => {
    mockInICloud = [OLD, HERE];
    serve({});
    await refreshCredit(prefs);
    expect(mockCurrent).toBe(HERE);

    serve({ [OLD]: 499 }, 0);
    await refreshCredit(prefs);
    expect(mockCurrent).toBe(HERE);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
