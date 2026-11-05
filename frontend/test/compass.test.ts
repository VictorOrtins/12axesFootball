import { describe, expect, it } from 'vitest';
import type { AxisResult } from '../src/types/quiz';
import { computeCompass, leanOf } from '../src/utils/compass';

function results(left: Record<string, number>): Map<string, AxisResult> {
  return new Map(
    Object.entries(left).map(([axisId, leftPercent]) => [
      axisId,
      { axisId, label: axisId, leftPole: '', rightPole: '', leftPercent, rightPercent: 100 - leftPercent, dominantPole: '', intensity: '' }
    ])
  );
}

describe('computeCompass', () => {
  it('centro em tudo fica no meio da bússola', () => {
    expect(computeCompass(results({ pos: 50, blo: 50, res: 50 }))).toEqual({ counter: 50, deep: 50, result: 50 });
  });

  it('mede rumo ao polo direito: posse total é 0, contra-ataque total é 100', () => {
    expect(computeCompass(results({ pos: 100, blo: 0, res: 80 }))).toEqual({ counter: 0, deep: 100, result: 20 });
  });

  it('devolve null se faltar um dos três eixos', () => {
    expect(computeCompass(results({ pos: 50, blo: 50 }))).toBeNull();
  });
});

describe('leanOf', () => {
  it('separa os dois polos do equilíbrio', () => {
    expect(leanOf(10)).toBe('left');
    expect(leanOf(40)).toBe('balanced');
    expect(leanOf(60)).toBe('balanced');
    expect(leanOf(90)).toBe('right');
  });
});
