/**
 * @jest-environment node
 */
import {
  addCustomItem,
  checkedLinesQuery,
  customItemsQuery,
  removeCustomItem,
  setCustomChecked,
  setLineChecked,
} from '@/features/grocery/grocery';
import { addToPlan, clearPlan, markCooked, removeFromPlan } from '@/features/plan/plan';
import { createTestDb } from '@/test-utils/test-db';

describe('grocery storage', () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    db = createTestDb();
  });

  const checked = async () => (await checkedLinesQuery(db)).map((r) => r.ingredientId).sort();
  const custom = async () =>
    (await customItemsQuery(db)).map((r) => ({ name: r.customName, checked: r.checked }));

  it('checks and unchecks generated lines by ingredient', async () => {
    await setLineChecked(db, 'lime', '3|Tacos');
    await setLineChecked(db, 'garlic', '2 cloves|Tacos');
    await setLineChecked(db, 'lime', '3|Tacos'); // no duplicate rows
    expect(await checked()).toEqual(['garlic', 'lime']);

    await setLineChecked(db, 'lime', null);
    expect(await checked()).toEqual(['garlic']);
  });

  it('adds, checks and removes custom items, ignoring blank names', async () => {
    await addCustomItem(db, '  paper towels ');
    await addCustomItem(db, '   ');
    await addCustomItem(db, 'coffee');
    expect(await custom()).toEqual([
      { name: 'paper towels', checked: false },
      { name: 'coffee', checked: false },
    ]);

    const [towels, coffee] = await customItemsQuery(db);
    await setCustomChecked(db, towels.id, true);
    await removeCustomItem(db, coffee.id);
    expect(await custom()).toEqual([{ name: 'paper towels', checked: true }]);
  });

  it('keeps custom items separate from generated checks', async () => {
    await addCustomItem(db, 'coffee');
    await setLineChecked(db, 'lime', '3|Tacos');
    expect(await checked()).toEqual(['lime']);
    expect(await custom()).toHaveLength(1);
  });

  it('remembers what each checked line asked for', async () => {
    await setLineChecked(db, 'lime', '3|Tacos');
    expect((await checkedLinesQuery(db))[0].checkedFor).toBe('3|Tacos');
  });

  it('ending a plan unchecks lines and drops bought custom items, keeping ones still to buy', async () => {
    const reset = async (end: () => Promise<void>) => {
      await addToPlan(db, 'shakshuka');
      await setLineChecked(db, 'egg', '4|Shakshuka');
      await addCustomItem(db, 'coffee');
      await addCustomItem(db, 'foil');
      const foil = (await customItemsQuery(db)).find((i) => i.customName === 'foil')!;
      await setCustomChecked(db, foil.id, true);

      await end();
      expect(await checked()).toEqual([]);
      expect((await custom()).filter((i) => i.name === 'foil')).toEqual([]);
      expect(await custom()).toContainEqual({ name: 'coffee', checked: false });
    };
    await reset(() => clearPlan(db));
    await reset(() => removeFromPlan(db, 'shakshuka'));
    await reset(() => markCooked(db, 'shakshuka', 5));
  });

  it('keeps checks while the plan still has recipes', async () => {
    await addToPlan(db, 'shakshuka');
    await addToPlan(db, 'peanut-noodles');
    await setLineChecked(db, 'egg', '4|Shakshuka');
    await markCooked(db, 'peanut-noodles');
    await removeFromPlan(db, 'not-planned');
    expect(await checked()).toEqual(['egg']);
  });
});
