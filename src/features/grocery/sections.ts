import { AISLE_LABELS } from '@/catalog/types';
import { describeLine, type GroceryLine } from '@/domain/grocery';

type Custom = { id: string; customName: string | null; checked: boolean };

export type GroceryRow =
  | { kind: 'line'; key: string; line: GroceryLine; checked: boolean }
  | { kind: 'custom'; key: string; item: Custom };

export type GrocerySection = {
  key: string;
  title: string;
  /** Shown under the title, e.g. why staples are separate. */
  hint?: string;
  data: GroceryRow[];
};

export const IN_CART = 'in-cart';

/**
 * Groups the list the way you shop it: one section per aisle, then your own
 * items, then pantry staples you probably have, and finally everything already
 * checked off ("In cart").
 */
export function buildGrocerySections(
  lines: GroceryLine[],
  checkedKeys: Set<string>,
  customItems: Custom[],
): GrocerySection[] {
  const sections: GrocerySection[] = [];
  const inCart: GroceryRow[] = [];
  const staples: GroceryRow[] = [];
  let current: GrocerySection | undefined;

  for (const line of lines) {
    const row: GroceryRow = {
      kind: 'line',
      key: line.key,
      line,
      checked: checkedKeys.has(line.key),
    };
    if (row.checked) inCart.push(row);
    else if (line.staple) staples.push(row);
    else {
      // Lines arrive sorted by aisle, so a new aisle starts a new section.
      if (current?.key !== line.aisle) {
        current = { key: line.aisle, title: AISLE_LABELS[line.aisle], data: [] };
        sections.push(current);
      }
      current.data.push(row);
    }
  }

  const custom: GroceryRow[] = [];
  for (const item of customItems) {
    const row: GroceryRow = { kind: 'custom', key: item.id, item };
    (item.checked ? inCart : custom).push(row);
  }

  if (custom.length) sections.push({ key: 'custom', title: 'Your items', data: custom });
  if (staples.length) {
    sections.push({
      key: 'staples',
      title: 'You probably have',
      hint: 'Pantry staples. Check what you need to restock.',
      data: staples,
    });
  }
  if (inCart.length) sections.push({ key: IN_CART, title: 'In cart', data: inCart });
  return sections;
}

export function rowText(row: GroceryRow): string {
  return row.kind === 'line' ? describeLine(row.line) : (row.item.customName ?? '');
}

/** Plain-text list of what's still to buy, for the share sheet. */
export function shareText(sections: GrocerySection[]): string {
  const blocks = sections
    .filter((s) => s.key !== IN_CART)
    .map((s) => [s.title.toUpperCase(), ...s.data.map((row) => `• ${rowText(row)}`)].join('\n'));
  return ['Grocery list', ...blocks].join('\n\n');
}
