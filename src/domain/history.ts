const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** "Cooked Oct 22 · ★★★★☆", or without stars when there's no rating. */
export function describeCooked(cookedAt: Date, rating: number | null): string {
  const stars = rating ? ` · ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : '';
  return `Cooked ${dateFormat.format(cookedAt)}${stars}`;
}
