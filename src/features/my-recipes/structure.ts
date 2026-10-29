import {
  mergeModelRecipe,
  parseRecipeText,
  type ModelRecipe,
  type ParsedRecipeText,
  type TextLine,
} from '@/domain/recipe-text';
import type { CloudRecipe, ScannedPage } from '@/features/my-recipes/cloud';

import { getModelAvailability, structureRecipe } from '../../../modules/recipe-model';

export type StructuredRecipe = {
  recipe: ParsedRecipeText;
  /** Which reader produced the structure. */
  source: 'cloud' | 'model' | 'rules';
  /** Things the reader says the cook should check, e.g. text hidden on the page. */
  notes: string[];
};

/** Reads pages with the scan server; null when the user hasn't allowed cloud scanning. */
export type CloudReader = ((pages: ScannedPage[]) => Promise<CloudRecipe>) | null;

type Model = {
  available: () => boolean;
  structure: (text: string) => Promise<ModelRecipe>;
};

const onDeviceModel: Model = {
  available: () => getModelAvailability() === 'available',
  structure: structureRecipe,
};

/**
 * Turns scanned pages into a recipe: with the scan server when the user
 * allows it, otherwise (or when it fails, e.g. offline) on the device.
 */
export async function structureScan(
  pages: ScannedPage[],
  cloud: CloudReader,
  model: Model = onDeviceModel,
): Promise<StructuredRecipe> {
  if (cloud) {
    try {
      const { recipe, notes } = await cloud(pages);
      return { recipe, notes, source: 'cloud' };
    } catch (e) {
      if (__DEV__) console.log(`[scan] cloud reader failed, using the device: ${String(e)}`);
    }
  }
  return structureScannedText(
    pages.flatMap((p) => p.lines),
    model,
  );
}

/**
 * Turns scanned lines (already in reading order) into a recipe on the device. Uses Apple's
 * on-device model when it's available and gives a usable answer; otherwise,
 * or if it fails, the rule-based parser. Both run on the device.
 */
export async function structureScannedText(
  lines: TextLine[],
  model: Model = onDeviceModel,
): Promise<StructuredRecipe> {
  const rules = parseRecipeText(lines, { ordered: true });
  if (!model.available()) {
    if (__DEV__) console.log('[scan] model unavailable; using rules');
    return { recipe: rules, source: 'rules', notes: [] };
  }
  try {
    const merged = mergeModelRecipe(
      await model.structure(lines.map((l) => l.text).join('\n')),
      rules,
    );
    if (!merged && __DEV__)
      console.log('[scan] model answer rejected (lost too many ingredients); using rules');
    return { recipe: merged ?? rules, source: merged ? 'model' : 'rules', notes: [] };
  } catch (e) {
    if (__DEV__) console.log('[scan] model failed; using rules:', e);
    // The model can report "available" and still fail (it does on the
    // simulator); the rules are always a safe answer.
    return { recipe: rules, source: 'rules', notes: [] };
  }
}
