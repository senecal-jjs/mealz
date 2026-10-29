import {
  CloudScanError,
  newInstallId,
  readWithCloud,
  toCloudRecipe,
  type ScannedPage,
} from '@/features/my-recipes/cloud';

const pages: ScannedPage[] = [
  { uri: 'file:///page1.jpg', lines: [{ text: 'Toast' }, { text: '1 slice bread' }] },
  { uri: 'file:///page2.jpg', lines: [{ text: 'Toast the bread.' }] },
];

const serverRecipe = {
  title: 'Toast ',
  description: null,
  servings: 2,
  prepMinutes: null,
  cookMinutes: 0,
  ingredients: ['1 slice bread', ' '],
  steps: ['Toast the bread.'],
  notes: ['Step 2 is cut off.'],
};

const prepare = jest.fn(async (uri: string) => ({
  data: `b64:${uri}`,
  mediaType: 'image/jpeg' as const,
}));

function respond(status: number, body: unknown) {
  return jest.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe('readWithCloud', () => {
  it('sends the prepared pages with the recognized text and returns the recipe', async () => {
    const fetchFn = respond(200, { recipe: serverRecipe });
    const result = await readWithCloud(pages, 'install-1', {
      url: 'https://scan.test',
      fetchFn,
      prepare,
    });

    expect(fetchFn).toHaveBeenCalledWith('https://scan.test/v1/scan', expect.anything());
    const body = JSON.parse(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toEqual({
      installId: 'install-1',
      pages: [
        { data: 'b64:file:///page1.jpg', mediaType: 'image/jpeg' },
        { data: 'b64:file:///page2.jpg', mediaType: 'image/jpeg' },
      ],
      text: 'Toast\n1 slice bread\n\n--- next page ---\n\nToast the bread.',
    });
    expect(result).toEqual({
      recipe: {
        title: 'Toast',
        description: '',
        servings: 2,
        prepMinutes: null,
        cookMinutes: null,
        ingredients: ['1 slice bread'],
        steps: ['Toast the bread.'],
      },
      notes: ['Step 2 is cut off.'],
    });
  });

  it.each([
    [429, 'limit'],
    [503, 'disabled'],
    [502, 'unreadable'],
    [401, 'attestation'],
    [500, 'server'],
  ])('reports HTTP %p as %p', async (status, reason) => {
    await expect(
      readWithCloud(pages, 'i', {
        url: 'https://scan.test',
        fetchFn: respond(status, {}),
        prepare,
      }),
    ).rejects.toEqual(new CloudScanError(reason as CloudScanError['reason']));
  });

  it('reports a network failure as offline, and no server as disabled', async () => {
    const fetchFn = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(
      readWithCloud(pages, 'i', { url: 'https://scan.test', fetchFn, prepare }),
    ).rejects.toMatchObject({ reason: 'offline' });
    await expect(readWithCloud(pages, 'i', { url: null, prepare })).rejects.toMatchObject({
      reason: 'disabled',
    });
  });
});

describe('readWithCloud with App Attest', () => {
  const signature = (n: number) => ({ keyId: 'key', challenge: `c${n}`, assertion: `a${n}` });

  it('signs each scan', async () => {
    const fetchFn = respond(200, { recipe: serverRecipe });
    const attest = { sign: jest.fn(async () => signature(1)), forget: jest.fn() };
    await readWithCloud(pages, 'i', { url: 'https://scan.test', fetchFn, prepare, attest });
    const body = JSON.parse(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.attest).toEqual(signature(1));
  });

  it('attests a new key once when the server no longer knows the old one', async () => {
    const replies = [
      new Response(JSON.stringify({ error: 'unknown_key' }), { status: 401 }),
      new Response(JSON.stringify({ recipe: serverRecipe }), { status: 200 }),
    ];
    const fetchFn = jest.fn(async () => replies.shift()!);
    let n = 0;
    const attest = { sign: jest.fn(async () => signature(++n)), forget: jest.fn(async () => {}) };
    const result = await readWithCloud(pages, 'i', {
      url: 'https://scan.test',
      fetchFn,
      prepare,
      attest,
    });
    expect(result.recipe.title).toBe('Toast');
    expect(attest.forget).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a rejected signature', async () => {
    const fetchFn = respond(401, { error: 'attestation' });
    const attest = { sign: jest.fn(async () => signature(1)), forget: jest.fn() };
    await expect(
      readWithCloud(pages, 'i', { url: 'https://scan.test', fetchFn, prepare, attest }),
    ).rejects.toMatchObject({ reason: 'attestation' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(attest.forget).not.toHaveBeenCalled();
  });
});

describe('toCloudRecipe', () => {
  it('rejects answers without ingredients or steps', () => {
    expect(() => toCloudRecipe(null)).toThrow(CloudScanError);
    expect(() => toCloudRecipe({ recipe: { ...serverRecipe, steps: [] } })).toThrow(CloudScanError);
    expect(() => toCloudRecipe({ recipe: { ...serverRecipe, ingredients: 'flour' } })).toThrow(
      CloudScanError,
    );
  });
});

it('makes install IDs the server accepts', () => {
  expect(newInstallId()).toMatch(/^[A-Za-z0-9-]{16,64}$/);
  expect(newInstallId()).not.toBe(newInstallId());
});
