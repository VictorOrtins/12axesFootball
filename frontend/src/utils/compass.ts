import type { AxisResult } from '../types/quiz';

/**
 * Posição do usuário na bússola do futebol, cada valor de 0 a 100 rumo ao polo direito do eixo:
 * Posse (x), Bloco (y) e Propósito (a barra).
 */
export interface CompassPosition {
  /** 0 = posse, 100 = contra-ataque. */
  counter: number;
  /** 0 = pressão alta, 100 = bloco baixo. */
  deep: number;
  /** 0 = espetáculo, 100 = resultado. */
  result: number;
}

export const COMPASS_AXES = { x: 'pos', y: 'blo', strip: 'res' } as const;

/** Devolve null se algum dos três eixos faltar no resultado. */
export function computeCompass(results: Map<string, AxisResult>): CompassPosition | null {
  const toward = (axisId: string): number | null => {
    const left = results.get(axisId)?.leftPercent;
    return left === undefined ? null : 100 - left;
  };
  const counter = toward(COMPASS_AXES.x);
  const deep = toward(COMPASS_AXES.y);
  const result = toward(COMPASS_AXES.strip);
  if (counter === null || deep === null || result === null) return null;
  return { counter, deep, result };
}

export type Lean = 'left' | 'balanced' | 'right';

/** Até 40 pende ao polo esquerdo, acima de 60 ao direito; no meio, equilíbrio. */
export function leanOf(towardRight: number): Lean {
  if (towardRight < 40) return 'left';
  if (towardRight > 60) return 'right';
  return 'balanced';
}
