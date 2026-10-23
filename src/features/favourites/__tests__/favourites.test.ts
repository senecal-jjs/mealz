/**
 * @jest-environment node
 */
import { favouritesQuery, setFavourite } from '@/features/favourites/favourites';
import { createTestDb } from '@/test-utils/test-db';

describe('favourites storage', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
  });
  const ids = async () => (await favouritesQuery(db)).map((r) => r.recipeId);

  it('adds favourites newest first, without duplicates', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-01T00:00:00Z') });
    await setFavourite(db, 'shakshuka', true);
    jest.setSystemTime(new Date('2026-10-02T00:00:00Z'));
    await setFavourite(db, 'peanut-noodles', true);
    await setFavourite(db, 'shakshuka', true);
    jest.useRealTimers();
    expect(await ids()).toEqual(['peanut-noodles', 'shakshuka']);
  });

  it('removes a favourite', async () => {
    await setFavourite(db, 'shakshuka', true);
    await setFavourite(db, 'shakshuka', false);
    await setFavourite(db, 'not-there', false);
    expect(await ids()).toEqual([]);
  });
});
