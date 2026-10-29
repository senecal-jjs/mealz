/**
 * @jest-environment node
 */
import { redirectSystemPath } from '@/app/+native-intent';

const redirect = (path: string) => redirectSystemPath({ path, initial: true });

describe('incoming links', () => {
  it('sends share links to the import screen', () => {
    expect(redirect('https://mealz-scan.fly.dev/r#abc_-1')).toBe('/import-recipe?d=abc_-1');
    expect(redirect('https://mealz-scan.fly.dev/r/?d=abc')).toBe('/import-recipe?d=abc');
    expect(redirect('/r#abc')).toBe('/import-recipe?d=abc');
    expect(redirect('https://mealz-scan.fly.dev/r')).toBe('/import-recipe');
  });

  it('leaves other links alone', () => {
    expect(redirect('mealz://recipe/abc')).toBe('mealz://recipe/abc');
    expect(redirect('/recipe/r#x')).toBe('/recipe/r#x');
    expect(redirect('https://mealz-scan.fly.dev/rest#x')).toBe('https://mealz-scan.fly.dev/rest#x');
  });
});
