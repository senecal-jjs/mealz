import {
  mergeModelRecipe,
  parseRecipeText,
  type ModelRecipe,
  type ParsedRecipeText,
  type TextLine,
} from '@/domain/recipe-text';

import { getModelAvailability, structureRecipe } from '../../../modules/recipe-model';

export type StructuredRecipe = {
  recipe: ParsedRecipeText;
  /** Which reader produced the structure. */
  source: 'model' | 'rules';
};

type Model = {
  available: () => boolean;
  structure: (text: string) => Promise<ModelRecipe>;
};

const onDeviceModel: Model = {
  available: () => getModelAvailability() === 'available',
  structure: structureRecipe,
};

/**
 * Turns scanned lines (already in reading order) into a recipe. Uses Apple's
 * on-device model when it's available and gives a usable answer; otherwise,
 * or if it fails, the rule-based parser. Both run on the device.
 */
export async function structureScannedText(
  lines: TextLine[],
  model: Model = onDeviceModel,
): Promise<StructuredRecipe> {
  const rules = parseRecipeText(lines, { ordered: true });
  if (!model.available()) return { recipe: rules, source: 'rules' };
  try {
    const merged = mergeModelRecipe(
      await model.structure(lines.map((l) => l.text).join('\n')),
      rules,
    );
    return merged ? { recipe: merged, source: 'model' } : { recipe: rules, source: 'rules' };
  } catch {
    // The model can report "available" and still fail (it does on the
    // simulator); the rules are always a safe answer.
    return { recipe: rules, source: 'rules' };
  }
}
