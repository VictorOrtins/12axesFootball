import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../src/hooks/useTheme';

describe('resolveTheme', () => {
  it('defaults to dark when nothing was chosen', () => {
    expect(resolveTheme(null)).toBe('dark');
  });

  it('uses the saved choice', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('ignores junk in storage', () => {
    expect(resolveTheme('purple')).toBe('dark');
    expect(resolveTheme('')).toBe('dark');
  });
});
