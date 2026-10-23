/**
 * @jest-environment node
 */
import { planItems } from '@/db/schema';
import {
  activePlanQuery,
  addToPlan,
  clearPlan,
  DEFAULT_SERVINGS,
  removeFromPlan,
  setPlanServings,
} from '@/features/plan/plan';
import { createTestDb } from '@/test-utils/test-db';

describe('plan', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
  });

  const plan = async () =>
    (await activePlanQuery(db)).map((i) => ({ recipeId: i.recipeId, servings: i.servings }));

  it('adds recipes in order with default servings', async () => {
    await addToPlan(db, 'shakshuka');
    await addToPlan(db, 'peanut-noodles', 4);
    expect(await plan()).toEqual([
      { recipeId: 'shakshuka', servings: DEFAULT_SERVINGS },
      { recipeId: 'peanut-noodles', servings: 4 },
    ]);
  });

  it('keeps one active item per recipe', async () => {
    await addToPlan(db, 'shakshuka', 2);
    await addToPlan(db, 'shakshuka', 6);
    expect(await plan()).toEqual([{ recipeId: 'shakshuka', servings: 2 }]);
  });

  it('removes a recipe', async () => {
    await addToPlan(db, 'shakshuka');
    await addToPlan(db, 'peanut-noodles');
    await removeFromPlan(db, 'shakshuka');
    expect((await plan()).map((i) => i.recipeId)).toEqual(['peanut-noodles']);
  });

  it('updates and clamps servings', async () => {
    await addToPlan(db, 'shakshuka');
    await setPlanServings(db, 'shakshuka', 5);
    expect(await plan()).toEqual([{ recipeId: 'shakshuka', servings: 5 }]);
    await setPlanServings(db, 'shakshuka', 99);
    expect((await plan())[0].servings).toBe(12);
    await setPlanServings(db, 'shakshuka', 0);
    expect((await plan())[0].servings).toBe(1);
  });

  it('ignores cooked items, so a cooked recipe can be planned again', async () => {
    await addToPlan(db, 'shakshuka');
    await db.update(planItems).set({ cookedAt: new Date() });
    expect(await plan()).toEqual([]);

    await addToPlan(db, 'shakshuka', 3);
    await removeFromPlan(db, 'shakshuka');
    expect(await plan()).toEqual([]);
    expect(await db.select().from(planItems)).toHaveLength(1); // history kept
  });

  it('clears the active plan', async () => {
    await addToPlan(db, 'shakshuka');
    await addToPlan(db, 'peanut-noodles');
    await clearPlan(db);
    expect(await plan()).toEqual([]);
  });
});
