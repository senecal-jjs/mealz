import { createAppAttest, type Integrity } from '@/features/my-recipes/app-attest';

function fakeIntegrity(overrides: Partial<Integrity> = {}): Integrity {
  return {
    isSupported: true,
    generateKeyAsync: jest.fn(async () => 'new-key'),
    attestKeyAsync: jest.fn(
      async (keyId: string, challenge: string) => `att:${keyId}:${challenge}`,
    ),
    generateAssertionAsync: jest.fn(
      async (keyId: string, challenge: string) => `sig:${keyId}:${challenge}`,
    ),
    ...overrides,
  };
}

/** A fake scan server: numbered challenges, and records attest requests. */
function fakeServer(attestStatus = 200) {
  let n = 0;
  const attested: unknown[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/v1/attest/challenge')) {
      return new Response(JSON.stringify({ challenge: `c${++n}` }), { status: 200 });
    }
    attested.push(JSON.parse(init?.body as string));
    return new Response('{}', { status: attestStatus });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, attested };
}

function memoryKeys(initial: string | null = null) {
  let keyId = initial;
  return { get: () => keyId, set: jest.fn(async (id: string | null) => void (keyId = id)) };
}

describe('createAppAttest', () => {
  it('attests a new key once, then signs fresh challenges with it', async () => {
    const server = fakeServer();
    const keys = memoryKeys();
    const integrity = fakeIntegrity();
    const attest = createAppAttest('https://scan.test', keys, {
      fetchFn: server.fetchFn,
      integrity: async () => integrity,
    });

    expect(await attest.sign()).toEqual({
      keyId: 'new-key',
      challenge: 'c2',
      assertion: 'sig:new-key:c2',
    });
    expect(server.attested).toEqual([
      { keyId: 'new-key', challenge: 'c1', attestation: 'att:new-key:c1' },
    ]);
    expect(keys.get()).toBe('new-key');

    expect(await attest.sign()).toMatchObject({ challenge: 'c3' });
    expect(integrity.generateKeyAsync).toHaveBeenCalledTimes(1);
  });

  it('signs nothing where App Attest is unavailable', async () => {
    const server = fakeServer();
    const unsupported = createAppAttest('https://scan.test', memoryKeys(), {
      fetchFn: server.fetchFn,
      integrity: async () => fakeIntegrity({ isSupported: false }),
    });
    expect(await unsupported.sign()).toBeNull();
    const missing = createAppAttest('https://scan.test', memoryKeys(), {
      fetchFn: server.fetchFn,
      integrity: async () => null,
    });
    expect(await missing.sign()).toBeNull();
    expect(server.fetchFn).not.toHaveBeenCalled();
  });

  it('keeps no key the server rejected', async () => {
    const server = fakeServer(401);
    const keys = memoryKeys();
    const attest = createAppAttest('https://scan.test', keys, {
      fetchFn: server.fetchFn,
      integrity: async () => fakeIntegrity(),
    });
    expect(await attest.sign()).toBeNull();
    expect(keys.get()).toBeNull();
  });

  it('drops a key the device can no longer use', async () => {
    const keys = memoryKeys('old-key');
    const attest = createAppAttest('https://scan.test', keys, {
      fetchFn: fakeServer().fetchFn,
      integrity: async () =>
        fakeIntegrity({
          generateAssertionAsync: jest.fn(async () => {
            throw new Error('Invalid key provided');
          }),
        }),
    });
    expect(await attest.sign()).toBeNull();
    expect(keys.get()).toBeNull();
  });
});
