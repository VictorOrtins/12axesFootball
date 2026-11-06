import { describe, expect, it } from 'vitest';
import type { Axis, AxisResult } from '../types/quiz';
import { axisAlignment, ratingTier } from './agreement';
import { compatibilityLevel } from './compatibility';

function axis(id: string, label: string): Axis {
  return { id, label } as Axis;
}

function results(values: Record<string, number>): Map<string, AxisResult> {
  return new Map(Object.entries(values).map(([id, leftPercent]) => [id, { axisId: id, leftPercent } as AxisResult]));
}

const AXES = [axis('pos', 'Posse'), axis('pro', 'Progressão'), axis('est', 'Estrutura'), axis('lar', 'Largura')];

describe('ratingTier', () => {
  it('usa os mesmos cortes de compatibilityLevel', () => {
    const byTier = { elite: 'veryHigh', great: 'high', good: 'medium', ok: 'low', low: 'veryLow' } as const;
    for (let pct = 0; pct <= 100; pct++) {
      expect(byTier[ratingTier(pct)]).toBe(compatibilityLevel(pct));
    }
  });
});

describe('axisAlignment', () => {
  it('conta eixos até 20 pontos de diferença e aponta o mais distante', () => {
    const user = results({ pos: 80, pro: 60, est: 40, lar: 10 });
    const vector = { pos: 60, pro: 59, est: 70, lar: 12 };

    expect(axisAlignment(vector, AXES, user)).toEqual({ aligned: 3, total: 4, farthestLabel: 'Estrutura' });
  });

  it('trata exatamente 20 pontos como próximo e 21 como distante', () => {
    const user = results({ pos: 50, pro: 50, est: 50, lar: 50 });

    expect(axisAlignment({ pos: 70, pro: 71, est: 50, lar: 50 }, AXES, user)?.aligned).toBe(3);
  });

  it('ignora eixos sem valor e devolve null sem vetor ou sem eixos em comum', () => {
    expect(axisAlignment(undefined, AXES, results({ pos: 50 }))).toBeNull();
    expect(axisAlignment({ pos: 50 }, AXES, results({}))).toBeNull();
    expect(axisAlignment({ pos: 40, pro: 90 }, AXES, results({ pos: 50 }))).toEqual({
      aligned: 1,
      total: 1,
      farthestLabel: 'Posse'
    });
  });
});
