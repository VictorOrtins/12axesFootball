import { t } from '../../i18n';
import type { AxisAlignment } from '../../utils/agreement';
import { compatibilityLevel } from '../../utils/compatibility';

/** "58% match · Compatibilidade baixa": o número sozinho não diz se é muito ou pouco. */
export function SheetMatch({ compatibility, alignment }: { compatibility: number; alignment?: AxisAlignment | null }) {
  const level = compatibilityLevel(compatibility);
  return (
    <>
      <p className="e-person-sheet-pct">
        <strong>{Math.round(compatibility)}%</strong> {t.matchWord}
        <span aria-hidden="true"> · </span>
        <span className="e-compat" data-level={level}>
          {t.compatibilityLevels[level]}
        </span>
      </p>
      {alignment && (
        <p className="e-person-sheet-align">
          {t.alignmentLine(alignment.aligned, alignment.total, alignment.farthestLabel)}
        </p>
      )}
    </>
  );
}
