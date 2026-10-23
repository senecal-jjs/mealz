/**
 * @jest-environment node
 */
import { planItems } from '@/db/schema';
import { addCustomItem } from '@/features/grocery/grocery';
import { addToPlan } from '@/features/plan/plan';
import {
  DEFAULT_PREFERENCES,
  preferencesQuery,
  resetAllData,
  savePreferences,
  withDefaults,
} from '@/features/preferences/preferences';
import { createTestDb } from '@/test-utils/test-db';

describe('preferences storage', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
  });

  const read = async () => withDefaults(await preferencesQuery(db));

  it('returns defaults before anything is saved', async () => {
    expect(await read()).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves and merges partial updates into one row', async () => {
    await savePreferences(db, { diet: 'vegetarian' });
    await savePreferences(db, { allergies: ['dairy', 'peanut'], defaultServings: 4 });
    await savePreferences(db, { dislikedIngredientIds: ['cilantro'] });

    expect(await read()).toMatchObject({
      diet: 'vegetarian',
      allergies: ['dairy', 'peanut'],
      dislikedIngredientIds: ['cilantro'],
      defaultServings: 4,
      units: 'us',
      onboardedAt: null,
    });
    expect(await preferencesQuery(db)).toHaveLength(1);
  });

  it('can clear the diet back to none', async () => {
    await savePreferences(db, { diet: 'vegan' });
    await savePreferences(db, { diet: null });
    expect((await read()).diet).toBeNull();
  });

  it('records when onboarding finished', async () => {
    const when = new Date('2026-10-22T12:00:00Z');
    await savePreferences(db, { onboardedAt: when });
    expect((await read()).onboardedAt).toEqual(when);
  });

  it('reset wipes the plan, groceries and preferences', async () => {
    await savePreferences(db, { diet: 'vegan', onboardedAt: new Date() });
    await addToPlan(db, 'shakshuka');
    await addCustomItem(db, 'coffee');

    await resetAllData(db);
    expect(await read()).toEqual(DEFAULT_PREFERENCES);
    expect(await db.select().from(planItems)).toEqual([]);
  });
});
