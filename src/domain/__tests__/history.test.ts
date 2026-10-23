import { describeCooked } from '@/domain/history';

describe('describeCooked', () => {
  const day = new Date(2026, 9, 22, 19, 0);
  it('shows the date and rating', () => {
    expect(describeCooked(day, 4)).toBe('Cooked Oct 22 · ★★★★☆');
  });
  it('leaves out stars without a rating', () => {
    expect(describeCooked(day, null)).toBe('Cooked Oct 22');
  });
});
