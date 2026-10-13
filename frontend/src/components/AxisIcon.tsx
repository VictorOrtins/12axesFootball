type AxisIconProps = {
  id: string;
  className?: string;
};

type PoleIconProps = {
  axisId: string;
  side: 'left' | 'right';
  className?: string;
};

// Ícones neutros até existirem ícones próprios para cada eixo do futebol:
// um campo para o eixo e uma seta para cada polo.
const AXIS_GLYPH = (
  <>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M12 5v14" />
    <circle cx="12" cy="12" r="2.5" />
  </>
);

export const POLE_GLYPH_PATHS: Record<'left' | 'right', string[]> = {
  left: ['M15 6l-6 6 6 6'],
  right: ['M9 6l6 6-6 6']
};

export function AxisIcon({ className = 'axis-symbol' }: AxisIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {AXIS_GLYPH}
    </svg>
  );
}

export function PoleIcon({ side, className = 'axis-symbol' }: PoleIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {POLE_GLYPH_PATHS[side].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
