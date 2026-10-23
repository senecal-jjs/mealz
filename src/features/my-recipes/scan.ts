import { readingOrder, type TextLine } from '@/domain/recipe-text';

import { isTextRecognitionAvailable, recognizeText } from '../../../modules/text-recognition';

export { isTextRecognitionAvailable };

/** Reads a photographed page on the device and returns its lines in reading order. */
export async function readPage(uri: string): Promise<TextLine[]> {
  const lines = await recognizeText(uri);
  return readingOrder(lines.filter((l) => l.confidence > 0.3));
}
