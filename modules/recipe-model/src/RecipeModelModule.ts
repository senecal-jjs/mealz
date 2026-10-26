import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ModelAvailability, ModelRecipe } from './RecipeModel.types';

declare class RecipeModelModule extends NativeModule<{}> {
  availability(): ModelAvailability;
  structureRecipe(text: string): Promise<ModelRecipe>;
}

// Optional so the app (and tests) still load where the native module isn't built in.
const native = requireOptionalNativeModule<RecipeModelModule>('RecipeModel');

/** Whether Apple's on-device model can be used right now, and if not, why. */
export function getModelAvailability(): ModelAvailability {
  return native ? native.availability() : 'unsupportedOS';
}

/** Asks the on-device model to structure recipe text. Throws if it's unavailable or fails. */
export async function structureRecipe(text: string): Promise<ModelRecipe> {
  if (!native) throw new Error('The on-device model isn’t available in this build.');
  return native.structureRecipe(text);
}
