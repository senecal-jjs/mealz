export type ModelAvailability =
  | 'available'
  | 'unsupportedOS'
  | 'deviceNotEligible'
  | 'appleIntelligenceNotEnabled'
  | 'modelNotReady'
  | 'unavailable';

/** What the on-device model returns. Servings and times are left to the rule-based reader. */
export type ModelRecipe = {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
};
