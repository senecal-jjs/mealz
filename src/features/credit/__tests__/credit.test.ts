import {
  canAffordScan,
  fetchCredit,
  formatCents,
  parseRecoveryCode,
  redeemPurchase,
  RedeemError,
  scanCostNote,
} from '@/features/credit/credit';

const WALLET = '0f8fad5b-d9cb-469f-a165-70867728950e';

function respond(status: number, body: unknown) {
  return jest.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe('scan credit', () => {
  it('formats cents as dollars', () => {
    expect(formatCents(499)).toBe('$4.99');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(-10)).toBe('-$0.10');
  });

  it('says what the next scan costs', () => {
    const s = { priceCents: 10, freeScansLeft: 2, balanceCents: 0 };
    expect(scanCostNote({ ...s, priceCents: 0 })).toBeNull();
    expect(scanCostNote(s)).toBe('This scan is free. 2 free scans left this month.');
    expect(scanCostNote({ ...s, freeScansLeft: 1 })).toMatch(/last free scan/);
    expect(scanCostNote({ ...s, freeScansLeft: 0, balanceCents: 489 })).toBe(
      'This scan costs $0.10 of your $4.89 credit.',
    );
    expect(scanCostNote({ ...s, freeScansLeft: 0 })).toMatch(/out of scan credit/);
  });

  it('knows when a scan can be paid for', () => {
    expect(canAffordScan({ priceCents: 0, freeScansLeft: 0, balanceCents: 0 })).toBe(true);
    expect(canAffordScan({ priceCents: 10, freeScansLeft: 1, balanceCents: 0 })).toBe(true);
    expect(canAffordScan({ priceCents: 10, freeScansLeft: 0, balanceCents: 10 })).toBe(true);
    expect(canAffordScan({ priceCents: 10, freeScansLeft: 0, balanceCents: 9 })).toBe(false);
  });

  it('accepts recovery codes however they were pasted', () => {
    expect(parseRecoveryCode(`  ${WALLET.toUpperCase()}\n`)).toBe(WALLET);
    expect(parseRecoveryCode('not a code')).toBeNull();
    expect(parseRecoveryCode(WALLET.slice(1))).toBeNull();
  });

  it('fetches the summary for this install and wallet', async () => {
    const summary = { priceCents: 10, freeScansLeft: 3, balanceCents: 0 };
    const fetchFn = respond(200, summary);
    await expect(
      fetchCredit('https://scan.test', { installId: 'i', keyId: null, wallet: WALLET }, fetchFn),
    ).resolves.toEqual(summary);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://scan.test/v1/credit');
    expect(JSON.parse(init.body as string)).toEqual({ installId: 'i', wallet: WALLET });
    await expect(
      fetchCredit(
        'https://scan.test',
        { installId: 'i', keyId: null, wallet: null },
        respond(500, {}),
      ),
    ).rejects.toThrow();
  });

  it('redeems a purchase, telling a refusal from an outage', async () => {
    await expect(
      redeemPurchase('https://scan.test', 'jws', respond(200, { balanceCents: 499 })),
    ).resolves.toBe(499);
    await expect(
      redeemPurchase('https://scan.test', 'jws', respond(400, { error: 'invalid' })),
    ).rejects.toEqual(new RedeemError('rejected'));
    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(redeemPurchase('https://scan.test', 'jws', offline)).rejects.toMatchObject({
      reason: 'unreachable',
    });
    await expect(
      redeemPurchase('https://scan.test', 'jws', respond(503, { error: 'disabled' })),
    ).rejects.toMatchObject({ reason: 'unreachable' });
  });
});
