/**
 * App Attest for cloud scans: proves to the Mealz server that a scan comes
 * from a genuine copy of the app on a real iPhone. Each install makes a key in
 * the Secure Enclave and has Apple attest it once; every scan then signs a
 * fresh one-time challenge from the server with that key.
 * See server/src/attest.ts for the other side.
 */
export type ScanSignature = { keyId: string; challenge: string; assertion: string };

/** The parts of `@expo/app-integrity` used here. */
export type Integrity = {
  isSupported: boolean;
  generateKeyAsync(): Promise<string>;
  attestKeyAsync(keyId: string, challenge: string): Promise<string>;
  generateAssertionAsync(keyId: string, challenge: string): Promise<string>;
};

/** Where the attested key's ID is kept (the preferences row). */
export type KeyStore = {
  get(): string | null;
  set(keyId: string | null): Promise<void>;
};

export type AppAttest = {
  /** Signs a fresh server challenge; null when the device can't attest (e.g. the simulator). */
  sign(): Promise<ScanSignature | null>;
  /** Drops a key the server no longer knows, so the next scan attests a new one. */
  forget(): Promise<void>;
};

/** Loaded on first use: the native module isn't available in tests or on the web. */
async function loadIntegrity(): Promise<Integrity | null> {
  try {
    return await import('@expo/app-integrity');
  } catch {
    return null;
  }
}

type Options = {
  fetchFn?: typeof fetch;
  integrity?: () => Promise<Integrity | null>;
  log?: (message: string) => void;
};

export function createAppAttest(
  url: string,
  keys: KeyStore,
  { fetchFn = fetch, integrity = loadIntegrity, log = () => {} }: Options = {},
): AppAttest {
  const challenge = async () => {
    const res = await fetchFn(`${url}/v1/attest/challenge`, { method: 'POST' });
    if (!res.ok) throw new Error(`challenge ${res.status}`);
    const { challenge } = (await res.json()) as { challenge?: unknown };
    if (typeof challenge !== 'string') throw new Error('challenge');
    return challenge;
  };

  /** The attested key, making and attesting one the first time. */
  const ensureKey = async (service: Integrity) => {
    const saved = keys.get();
    if (saved) return saved;
    const keyId = await service.generateKeyAsync();
    const nonce = await challenge();
    const attestation = await service.attestKeyAsync(keyId, nonce);
    const res = await fetchFn(`${url}/v1/attest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keyId, challenge: nonce, attestation }),
    });
    if (!res.ok) throw new Error(`attest ${res.status}`);
    await keys.set(keyId);
    return keyId;
  };

  return {
    async sign() {
      const service = await integrity();
      if (!service?.isSupported) return null;
      try {
        const keyId = await ensureKey(service);
        const nonce = await challenge();
        try {
          const assertion = await service.generateAssertionAsync(keyId, nonce);
          return { keyId, challenge: nonce, assertion };
        } catch (e) {
          // The key is gone (e.g. restored from a backup): attest a new one next time.
          await keys.set(null);
          throw e;
        }
      } catch (e) {
        log(`[attest] ${String(e)}`);
        return null;
      }
    },
    forget: () => keys.set(null),
  };
}
