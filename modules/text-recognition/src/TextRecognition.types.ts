/** One line of text found in a photo. Positions are fractions of the image, origin top left. */
export type RecognizedLine = {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
