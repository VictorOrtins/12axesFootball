import { t } from '../i18n';

interface ProgressHeaderProps {
  current: number;
  total: number;
  /** Perguntas de arquetipo do fim do quiz: contam no total da barra. */
  extraCount?: number;
  /** Posicao (1..extraCount) na etapa de arquetipo; ausente durante as perguntas comuns. */
  extraCurrent?: number;
}

export function ProgressHeader({ current, total, extraCount = 0, extraCurrent }: ProgressHeaderProps) {
  const inExtra = extraCurrent !== undefined && extraCount > 0;
  // So chega a 100% quando o arquetipo tambem foi respondido.
  const grandTotal = total + extraCount;
  const answered = inExtra ? total + extraCurrent - 1 : Math.max(0, current - 1);
  const percent = grandTotal === 0 ? 0 : Math.round((answered / grandTotal) * 100);

  return (
    <div className="qz-progress">
      <div
        className="qz-bar"
        role="progressbar"
        aria-label={t.progressAria(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <p className="qz-count">{inExtra ? t.archetypeStep(extraCurrent, extraCount) : t.progress(current, total)}</p>
    </div>
  );
}
