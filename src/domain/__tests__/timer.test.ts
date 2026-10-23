import { formatCountdown, remainingMs } from '@/domain/timer';

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [999, '0:01'], // rounds up so it never shows 0:00 while time is left
    [65_000, '1:05'],
    [12 * 60_000, '12:00'],
    [3_723_000, '1:02:03'],
    [-5000, '0:00'],
  ])('%p ms → %p', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});

describe('remainingMs', () => {
  it('counts down to zero and stops', () => {
    expect(remainingMs(10_000, 4_000)).toBe(6_000);
    expect(remainingMs(10_000, 12_000)).toBe(0);
  });
});
