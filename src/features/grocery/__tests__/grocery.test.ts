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
import { addToPlan, clearPlan } from '@/features/plan/plan';
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
    await setLineChecked(db, 'lime', true);
    await setLineChecked(db, 'garlic', true);
    await setLineChecked(db, 'lime', true); // no duplicate rows
    expect(await checked()).toEqual(['garlic', 'lime']);

    await setLineChecked(db, 'lime', false);
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
    await setLineChecked(db, 'lime', true);
    expect(await checked()).toEqual(['lime']);
    expect(await custom()).toHaveLength(1);
  });

  it('clearing the plan unchecks generated lines but keeps custom items', async () => {
    await addToPlan(db, 'shakshuka');
    await setLineChecked(db, 'egg', true);
    await addCustomItem(db, 'coffee');

    await clearPlan(db);
    expect(await checked()).toEqual([]);
    expect(await custom()).toEqual([{ name: 'coffee', checked: false }]);
  });
});
