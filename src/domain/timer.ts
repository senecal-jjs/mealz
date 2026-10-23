/** "4:05", "12:00", "1:02:03". Never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

/**
 * Timers store when they end, not how long is left, so they stay right while
 * the app is in the background.
 */
export function remainingMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}
