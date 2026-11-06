import { describe, expect, it } from 'vitest';
import { compatibilityLevel } from './compatibility';

describe('compatibilityLevel', () => {
  it('classifica cada faixa nos limites', () => {
    expect(compatibilityLevel(100)).toBe('veryHigh');
    expect(compatibilityLevel(85)).toBe('veryHigh');
    expect(compatibilityLevel(84)).toBe('high');
    expect(compatibilityLevel(70)).toBe('high');
    expect(compatibilityLevel(69)).toBe('medium');
    expect(compatibilityLevel(50)).toBe('medium');
    expect(compatibilityLevel(49)).toBe('low');
    expect(compatibilityLevel(30)).toBe('low');
    expect(compatibilityLevel(29)).toBe('veryLow');
    expect(compatibilityLevel(0)).toBe('veryLow');
  });

  it('usa o valor arredondado exibido, para o rótulo bater com o número', () => {
    expect(compatibilityLevel(84.6)).toBe('veryHigh'); // aparece como 85%
    expect(compatibilityLevel(84.4)).toBe('high'); // aparece como 84%
    expect(compatibilityLevel(29.6)).toBe('low'); // aparece como 30%
    expect(compatibilityLevel(29.4)).toBe('veryLow'); // aparece como 29%
  });
});
