import type { Axis, AxisResult } from '../types/quiz';

export interface AxisAgreement {
  axisId: string;
  label: string;
  short: string;
  value: number;
}

export function shortAxisLabel(label: string): string {
  return label.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

// Concordância por eixo (100 = mesma posição) entre o usuário e um perfil, maiores primeiro.
export function topAgreements(
  vector: Record<string, number> | undefined,
  axes: Axis[],
  results: Map<string, AxisResult>,
  count: number
): AxisAgreement[] {
  if (!vector) return [];
  return axes
    .flatMap((axis) => {
      const user = results.get(axis.id)?.leftPercent;
      const target = vector[axis.id];
      if (user === undefined || target === undefined) return [];
      return [{ axisId: axis.id, label: axis.label, short: shortAxisLabel(axis.label), value: Math.round(100 - Math.abs(user - target)) }];
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export type RatingTier = 'elite' | 'great' | 'good' | 'ok' | 'low';

// Mesmos cortes de compatibilityLevel, para a cor da nota e o rótulo concordarem.
export function ratingTier(pct: number): RatingTier {
  if (pct >= 85) return 'elite';
  if (pct >= 70) return 'great';
  if (pct >= 50) return 'good';
  if (pct >= 30) return 'ok';
  return 'low';
}

// Até 20 pontos de diferença (menos que um passo de resposta do quiz, 25) conta como próximo.
const ALIGNED_MARGIN = 20;

export interface AxisAlignment {
  aligned: number;
  total: number;
  /** Eixo em que o usuário e o perfil mais divergem. */
  farthestLabel: string;
}

export function axisAlignment(
  vector: Record<string, number> | undefined,
  axes: Axis[],
  results: Map<string, AxisResult>
): AxisAlignment | null {
  if (!vector) return null;
  const gaps = axes.flatMap((axis) => {
    const user = results.get(axis.id)?.leftPercent;
    const target = vector[axis.id];
    if (user === undefined || target === undefined) return [];
    return [{ label: axis.label, gap: Math.abs(user - target) }];
  });
  if (gaps.length === 0) return null;
  const farthest = gaps.reduce((worst, item) => (item.gap > worst.gap ? item : worst));
  return {
    aligned: gaps.filter((item) => item.gap <= ALIGNED_MARGIN).length,
    total: gaps.length,
    farthestLabel: farthest.label
  };
}
