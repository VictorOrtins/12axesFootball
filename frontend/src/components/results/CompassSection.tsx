import { useState, type CSSProperties } from 'react';
import { t } from '../../i18n';
import type { Axis } from '../../types/quiz';
import { COMPASS_AXES, leanOf, type CompassPosition } from '../../utils/compass';
import { InfoButton, InfoSheet } from './InfoSheet';
import { COMPASS_FALLBACK_COLORS } from '../../styles/componentColors';

const WHITE = [255, 255, 255] as const;
// Meio da barra: quem equilibra espetáculo e resultado fica num cinza neutro.
const NEUTRAL = [123, 127, 134] as const;
const SIZE = 9;
// Quanto a grade e a barra clareiam rumo ao branco (tom pastel).
const PASTEL = 0.62;

function mix(a: readonly number[], b: readonly number[], amount: number): number[] {
  return a.map((value, index) => value + (b[index] - value) * amount);
}

/** `amount` 0 é a ponta esquerda, 0,5 o cinza e 1 a ponta direita. */
function threeStop(start: readonly number[], middle: readonly number[], end: readonly number[], amount: number): number[] {
  return amount < 0.5 ? mix(start, middle, amount * 2) : mix(middle, end, (amount - 0.5) * 2);
}

function hexToRgb(hex: string): number[] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, '$&$&') : value;
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
}

function rgb(color: number[]): string {
  return `rgb(${color.map((value) => Math.round(value)).join(',')})`;
}

function poles(axis?: Axis): [number[], number[]] {
  return [hexToRgb(axis?.leftColor ?? COMPASS_FALLBACK_COLORS.left), hexToRgb(axis?.rightColor ?? COMPASS_FALLBACK_COLORS.right)];
}

/** Cor de um ponto da grade: mistura meio a meio a cor do eixo x com a do eixo y naquele ponto. */
function pointColor(xAxis: Axis | undefined, yAxis: Axis | undefined, x: number, y: number): number[] {
  const [xLeft, xRight] = poles(xAxis);
  const [yLeft, yRight] = poles(yAxis);
  return mix(mix(xLeft, xRight, x / 100), mix(yLeft, yRight, y / 100), 0.5);
}

// Mantém o marcador inteiro dentro da grade mesmo nos extremos.
export const compassClamp = (value: number): number => Math.max(4, Math.min(96, value));

function Marker({ left, top, color }: { left: number; top?: number; color?: string }) {
  const style: CSSProperties = { left: `${compassClamp(left)}%`, top: top === undefined ? '50%' : `${compassClamp(top)}%` };
  if (color) style.background = color;
  return (
    <span className="e-compass-x" style={style} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </span>
  );
}

export interface CompassAxes {
  /** Posse: o eixo x. */
  x?: Axis;
  /** Bloco: o eixo y (pressão alta em cima). */
  y?: Axis;
  /** Propósito: a barra. */
  strip?: Axis;
}

export function findCompassAxes(axes: Axis[]): CompassAxes {
  const byId = (id: string) => axes.find((axis) => axis.id === id);
  return { x: byId(COMPASS_AXES.x), y: byId(COMPASS_AXES.y), strip: byId(COMPASS_AXES.strip) };
}

function poleWord(axis: Axis | undefined, towardRight: number): string {
  const lean = leanOf(towardRight);
  if (!axis) return '';
  if (lean === 'balanced') return t.compassBalanced(axis.label);
  return lean === 'left' ? axis.leftPole : axis.rightPole;
}

/** Valores derivados da bússola (cores, frase e barra), compartilhados com o relatório em PDF. */
export function compassView(position: CompassPosition, axes: CompassAxes) {
  const { counter, deep, result } = position;
  const gridCells = Array.from({ length: SIZE * SIZE }, (_, index) => {
    const column = index % SIZE;
    const row = Math.floor(index / SIZE);
    const step = 100 / (SIZE - 1);
    return rgb(mix(pointColor(axes.x, axes.y, column * step, row * step), WHITE, PASTEL));
  });
  const markerColor = rgb(pointColor(axes.x, axes.y, counter, deep));
  const [stripLeft, stripRight] = poles(axes.strip);
  const stripCells = Array.from({ length: SIZE }, (_, index) =>
    rgb(mix(threeStop(stripLeft, NEUTRAL, stripRight, index / (SIZE - 1)), WHITE, PASTEL))
  );
  const stripColor = rgb(threeStop(stripLeft, NEUTRAL, stripRight, result / 100));
  return {
    gridCells,
    markerColor,
    stripCells,
    stripColor,
    xWord: poleWord(axes.x, counter),
    yWord: poleWord(axes.y, deep),
    stripWord: poleWord(axes.strip, result)
  };
}

interface CompassSectionProps {
  position: CompassPosition;
  axes: CompassAxes;
}

export function CompassSection({ position, axes }: CompassSectionProps) {
  const { counter, deep, result } = position;
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { gridCells, markerColor, stripCells, stripColor, xWord, yWord, stripWord } = compassView(position, axes);

  return (
    <section className="e-panel e-compass" id="bussola" data-reveal>
      <InfoButton className="e-axis-info e-card-info" label={t.compassInfo.aria} onClick={() => setIsInfoOpen(true)} />
      <h2>{t.compassTitle}</h2>

      <div className="e-compass-body">
        <div
          className="e-compass-chart"
          role="img"
          aria-label={t.compassAria(Math.round(counter), Math.round(deep), Math.round(result))}
        >
          <span className="e-compass-lbl is-top">{axes.y?.leftPole}</span>
          <span className="e-compass-lbl is-left">{axes.x?.leftPole}</span>
          <div className="e-compass-grid">
            {gridCells.map((color, index) => (
              <span key={index} style={{ background: color }} />
            ))}
            <i className="e-compass-axis is-x" aria-hidden="true" />
            <i className="e-compass-axis is-y" aria-hidden="true" />
            <Marker left={counter} top={deep} color={markerColor} />
          </div>
          <span className="e-compass-lbl is-right">{axes.x?.rightPole}</span>
          <span className="e-compass-lbl is-bottom">{axes.y?.rightPole}</span>
        </div>

        <div className="e-compass-read">
          <p className="e-compass-sentence">
            <span className="e-compass-spectrum" style={{ color: markerColor }}>
              {xWord}
            </span>{' '}
            <span className="e-compass-conn">{t.compassWith}</span> <span className="e-compass-spectrum">{yWord}</span>
            {', '}
            <mark className="e-compass-mark" style={{ background: stripColor }}>
              {stripWord}
            </mark>
          </p>

          <div className="e-compass-bar" aria-hidden="true">
            <div className="e-compass-bar-lbls">
              <span>{axes.strip?.leftPole}</span>
              <span>{axes.strip?.rightPole}</span>
            </div>
            <div className="e-compass-strip">
              {stripCells.map((color, index) => (
                <span key={index} style={{ background: color }} />
              ))}
              <Marker left={result} color={stripColor} />
            </div>
          </div>
        </div>
      </div>

      {isInfoOpen && (
        <InfoSheet titleId="compass-info-title" className="e-compass-sheet" onClose={() => setIsInfoOpen(false)}>
          <p className="e-axis-sheet-label">{t.compassTitle}</p>
          <h3 id="compass-info-title">{t.compassInfo.title}</h3>
          <ul className="e-compass-how">
            {[
              { lead: axes.x?.label ?? '', text: t.compassInfo.xText },
              { lead: axes.y?.label ?? '', text: t.compassInfo.yText },
              { lead: axes.strip?.label ?? '', text: t.compassInfo.stripText }
            ].map((item) => (
              <li key={item.lead}>
                <strong>{item.lead}</strong> {item.text}
              </li>
            ))}
          </ul>
        </InfoSheet>
      )}
    </section>
  );
}
