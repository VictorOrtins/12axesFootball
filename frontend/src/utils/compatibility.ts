export type CompatibilityLevel = 'veryHigh' | 'high' | 'medium' | 'low' | 'veryLow';

/**
 * Faixa de compatibilidade a partir do percentual. Usa o valor arredondado, o mesmo que aparece
 * na tela, para que "95%" nunca venha rotulado como "alta".
 *
 * 85 ou mais: muito alta · 70-84: alta · 50-69: média · 30-49: baixa · até 29: muito baixa.
 * As faixas valem para a nota exibida, que o backend reescala em ProfileMatchScorer.displayScore.
 */
export function compatibilityLevel(value: number): CompatibilityLevel {
  const pct = Math.round(value);
  if (pct >= 85) return 'veryHigh';
  if (pct >= 70) return 'high';
  if (pct >= 50) return 'medium';
  if (pct >= 30) return 'low';
  return 'veryLow';
}
