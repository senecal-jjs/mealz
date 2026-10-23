import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { RecognizedLine } from './TextRecognition.types';

declare class TextRecognitionModule extends NativeModule<{}> {
  recognizeText(uri: string): Promise<RecognizedLine[]>;
}

// Optional so the app (and tests) still load where the native module isn't built in.
const native = requireOptionalNativeModule<TextRecognitionModule>('TextRecognition');

export function isTextRecognitionAvailable(): boolean {
  return native !== null;
}

/** Reads the text in a photo on the device. Lines come back top to bottom. */
export async function recognizeText(uri: string): Promise<RecognizedLine[]> {
  if (!native) throw new Error('Text recognition isn’t available in this build.');
  return native.recognizeText(uri);
}
