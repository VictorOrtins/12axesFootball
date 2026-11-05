import { t } from '../i18n';
import type { FootballIdeologyMatch, ManagerMatch, QuizPayload, QuizResult } from '../types/quiz';
import { profileInitials, resolveProfileImageSrc } from './profileImage';
import { POLE_GLYPH_PATHS } from '../components/AxisIcon';
import { tokens } from '../styles/tokens.generated';
import { cardName, futTier } from '../components/results/FutCard';
import { ratingTier, topAgreements } from './agreement';

/**
 * Cartão de compartilhamento social — formato stories 1080x1920.
 *
 * Fundo de gramado com linhas de cal; o treinador mais compatível vira
 * uma carta do Ultimate Team e as porcentagens viram notas no estilo Sofascore.
 */
export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;

const SHARE_FONT_DISPLAY = '"Open Sans"';
const SHARE_FONT_BODY = '"Open Sans"';
const SVG_NS = 'http://www.w3.org/2000/svg';

export const SHARE_COLORS = {
  papel: tokens.papel,
  tinta: tokens.tinta,
  accent: tokens['pitch-accent'],
  pitch: tokens['pitch-stripe-b'],
  panel: tokens['share-panel'],
  panelLine: tokens['share-panel-line']
};

const FUT_WIDTH = 390;
const FUT_HEIGHT = Math.round((FUT_WIDTH * 16) / 11);
const FUT_TIERS: Record<string, { a: string; b: string; ink: string }> = {
  'fut-gold': { a: tokens['fut-gold-a'], b: tokens['fut-gold-b'], ink: tokens['fut-gold-ink'] },
  'fut-silver': { a: tokens['fut-silver-a'], b: tokens['fut-silver-b'], ink: tokens['fut-silver-ink'] },
  'fut-bronze': { a: tokens['fut-bronze-a'], b: tokens['fut-bronze-b'], ink: tokens['fut-bronze-ink'] }
};

type Style = Partial<CSSStyleDeclaration>;
type PoleSide = 'left' | 'right';

function el(tag: string, style: Style, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.style.boxSizing = 'border-box';
  Object.assign(node.style, style);
  if (text != null) {
    node.textContent = text;
  }
  return node;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function readableInk(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.48 ? SHARE_COLORS.tinta : SHARE_COLORS.papel;
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

// Equilibrado não puxa para polo nenhum: fica no cinza neutro.
const BALANCED_ACCENT = tokens['slate-bg'];

export function buildShareCard(
  result: QuizResult,
  quiz: QuizPayload
): { stage: HTMLDivElement; target: HTMLDivElement; backgroundColor: string } {
  const stage = el('div', {
    position: 'fixed',
    top: '0',
    left: `-${SHARE_WIDTH + 200}px`,
    width: `${SHARE_WIDTH}px`,
    height: `${SHARE_HEIGHT}px`,
    pointerEvents: 'none',
    zIndex: '-1'
  }) as HTMLDivElement;

  const target = el('div', {
    position: 'relative',
    width: `${SHARE_WIDTH}px`,
    height: `${SHARE_HEIGHT}px`,
    padding: '64px',
    boxSizing: 'border-box',
    // Fundo transparente: o fundo e as fotos são desenhados direto no canvas
    // (ver renderSharePng), o html-to-image só renderiza texto e caixas.
    background: 'transparent',
    fontFamily: SHARE_FONT_BODY,
    color: SHARE_COLORS.papel,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }) as HTMLDivElement;

  const content = el('div', {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: '0',
    gap: '24px'
  });

  content.append(
    buildShareHeader(),
    ...(result.topMatch ? [buildShareIdentity(result.topMatch)] : []),
    buildShareTwoColumns(result, quiz),
    buildShareLists(result),
    buildShareFooter()
  );

  target.append(content);
  stage.append(target);
  return { stage, target, backgroundColor: SHARE_COLORS.pitch };
}

function buildShareHeader(): HTMLElement {
  const P = SHARE_COLORS.papel;
  const header = el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '28px'
  });
  header.append(
    el('div', {
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '800',
      fontSize: '58px',
      letterSpacing: '-0.03em',
      color: P,
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: '9px'
    }),
    el('div', { flex: '1 1 auto', height: '3px', background: rgba(P, 0.35) }),
    el('div', {
      fontFamily: SHARE_FONT_BODY,
      fontWeight: '600',
      fontSize: '30px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: rgba(P, 0.82)
    }, t.shareResultLabel)
  );
  const brand = header.firstChild as HTMLElement;
  brand.append(
    el('span', { color: SHARE_COLORS.accent }, '12'),
    el('span', { fontFamily: SHARE_FONT_BODY, fontWeight: '400' }, 'axes')
  );
  return header;
}

function buildShareIdentity(top: FootballIdeologyMatch): HTMLElement {
  const P = SHARE_COLORS.papel;
  const wrap = el('div', { display: 'flex', flexDirection: 'column', gap: '0', marginTop: '18px' });
  wrap.append(
    el('div', {
      fontFamily: SHARE_FONT_BODY,
      fontWeight: '600',
      fontSize: '34px',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: SHARE_COLORS.accent
    }, top.category),
    el('div', {
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '600',
      fontSize: '76px',
      lineHeight: '1.05',
      letterSpacing: '-0.02em',
      color: P,
      marginTop: '-8px'
    }, top.name)
  );
  return wrap;
}

function buildShareTwoColumns(
  result: QuizResult,
  quiz: QuizPayload
): HTMLElement {
  const row = el('div', {
    display: 'flex',
    gap: '24px',
    flex: '0 0 920px',
    height: '920px',
    minHeight: '920px',
    marginTop: '8px'
  });
  if (result.topManagerMatch) {
    row.append(buildShareManagerColumn(result.topManagerMatch, result, quiz));
  }
  row.append(buildShareAxesColumn(result, quiz));
  return row;
}

function buildShareManagerColumn(person: ManagerMatch, result: QuizResult, quiz: QuizPayload): HTMLElement {
  const P = SHARE_COLORS.papel;
  const col = el('div', {
    flex: `0 0 ${FUT_WIDTH}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  });
  col.append(
    buildShareFutCard(person, result, quiz),
    el('div', {
      fontFamily: SHARE_FONT_BODY,
      fontWeight: '600',
      fontSize: '26px',
      letterSpacing: '4px',
      textTransform: 'uppercase',
      color: SHARE_COLORS.accent,
      marginTop: '34px'
    }, t.shareMostCompatible),
    el('div', {
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '600',
      fontSize: '48px',
      lineHeight: '1.15',
      letterSpacing: '-1px',
      color: P
    }, person.name),
    el('div', {
      fontFamily: SHARE_FONT_BODY,
      fontSize: '30px',
      color: rgba(P, 0.82)
    }, person.period)
  );
  return col;
}

// Carta do Ultimate Team: o fundo metálico e a foto são desenhados no canvas
// (drawFutCard); aqui ficam só os textos, nas mesmas posições do FutCard.tsx.
function buildShareFutCard(person: ManagerMatch, result: QuizResult, quiz: QuizPayload): HTMLElement {
  const rating = Math.round(clamp(person.compatibility));
  const tier = futTier(rating, false);
  const ink = FUT_TIERS[tier].ink;
  const unit = FUT_WIDTH / 15;
  const card = el('div', {
    position: 'relative',
    width: `${FUT_WIDTH}px`,
    height: `${FUT_HEIGHT}px`,
    flex: '0 0 auto',
    fontFamily: SHARE_FONT_DISPLAY,
    color: ink
  });
  card.dataset.shareImage = 'portrait';
  card.dataset.shareSrc = resolveProfileImageSrc(person.imagePath);
  card.dataset.shareTier = tier;

  const side: Style = { position: 'absolute', left: '7%', width: '26%', textAlign: 'center' };
  const ovr = el('div', { ...side, top: '12%', fontSize: `${unit * 2.4}px`, fontWeight: '800', lineHeight: '1', letterSpacing: '-0.03em' }, String(rating));
  ovr.append(el('span', { fontSize: '0.42em', fontWeight: '700' }, '%'));
  const stats = topAgreements(person.vector, quiz.axes, new Map(result.axes.map((axis) => [axis.axisId, axis])), 6);
  const grid = el('div', {
    position: 'absolute',
    left: '15%',
    right: '12%',
    top: '68%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: `${unit * 0.3}px ${unit * 0.8}px`,
    fontSize: `${unit * 0.95}px`
  });
  stats.forEach((stat) => {
    const line = el('div', { whiteSpace: 'nowrap' });
    line.append(el('span', { fontWeight: '800', marginRight: '0.3em' }, String(stat.value)), document.createTextNode(stat.short));
    grid.append(line);
  });
  card.append(
    ovr,
    el('div', { ...side, top: '31%', fontSize: `${unit * 1.05}px`, fontWeight: '700', letterSpacing: '0.04em' }, t.futPosition),
    el('div', {
      position: 'absolute',
      left: '8%',
      right: '8%',
      top: '57%',
      paddingBottom: `${unit * 0.3}px`,
      borderBottom: `2px solid ${ink}`,
      fontSize: `${unit * 1.35}px`,
      fontWeight: '800',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }, cardName(person.name)),
    grid
  );
  return card;
}

function buildShareAxesColumn(
  result: QuizResult,
  quiz: QuizPayload
): HTMLElement {
  const col = el('div', {
    flex: '1 1 auto',
    minWidth: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '30px 30px 26px',
    borderRadius: '36px',
    background: SHARE_COLORS.panel,
    border: `2px solid ${SHARE_COLORS.panelLine}`
  });
  col.append(el('div', {
    fontFamily: SHARE_FONT_BODY,
    fontWeight: '600',
    fontSize: '26px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: SHARE_COLORS.accent
  }, t.shareYourAxes));

  const list = el('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    flex: '1 1 auto',
    justifyContent: 'space-between'
  });
  const axesById = new Map(quiz.axes.map((axis) => [axis.id, axis]));
  result.axes.forEach((axis) => list.append(buildShareAxisLine(axis, axesById.get(axis.axisId))));
  col.append(list);
  return col;
}

function buildShareAxisLine(
  axis: QuizResult['axes'][number],
  definition: QuizPayload['axes'][number] | undefined
): HTMLElement {
  const P = SHARE_COLORS.papel;
  const isBalanced = axis.intensity === 'Equilibrado';
  const leaningRight = axis.dominantPole === axis.rightPole;
  const winningPole = isBalanced ? axis.rightPole : leaningRight ? axis.rightPole : axis.leftPole;
  const winningPct = isBalanced ? 50 : leaningRight ? axis.rightPercent : axis.leftPercent;
  // Mesmo lado do rótulo: equilibrado mostra o polo direito, então o ícone também.
  const side: PoleSide = isBalanced || leaningRight ? 'right' : 'left';
  const accent = isBalanced
    ? BALANCED_ACCENT
    : leaningRight
      ? definition?.rightColor ?? BALANCED_ACCENT
      : definition?.leftColor ?? BALANCED_ACCENT;

  const row = el('div', {
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
    height: '58px'
  });

  const icon = el('span', {
    flex: '0 0 auto',
    width: '46px',
    height: '46px',
    borderRadius: '13px',
    display: 'grid',
    placeItems: 'center',
    color: readableInk(accent),
    background: accent
  });
  icon.append(buildPoleGlyph(side));

  const mini = el('span', {
    flex: '0 0 76px',
    width: '76px',
    height: '10px',
    borderRadius: '10px',
    overflow: 'hidden',
    background: rgba(P, 0.16)
  });
  mini.append(el('i', {
    display: 'block',
    width: `${clamp(winningPct)}%`,
    height: '100%',
    borderRadius: '10px',
    background: accent
  }));

  row.append(
    icon,
    el('span', {
      flex: '1 1 auto',
      minWidth: '0',
      fontFamily: SHARE_FONT_BODY,
      fontWeight: '500',
      fontSize: '28px',
      color: rgba(P, 0.92),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }, winningPole),
    mini,
    el('span', {
      flex: '0 0 70px',
      width: '70px',
      textAlign: 'right',
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '700',
      fontSize: '32px',
      color: accent
    }, `${Math.round(winningPct)}%`)
  );

  return row;
}

function buildPoleGlyph(side: PoleSide): SVGElement {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    width: 26,
    height: 26,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2.2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  POLE_GLYPH_PATHS[side].forEach((path) => svg.append(svgEl('path', { d: path })));
  return svg;
}

function buildShareLists(result: QuizResult): HTMLElement {
  const row = el('div', {
    display: 'flex',
    gap: '24px'
  });
  row.append(
    buildShareListBox(
      t.shareOtherManagers,
      result.managerMatches.slice(1, 4).map((person) => ({
        label: person.name,
        pct: person.compatibility,
        avatar: resolveProfileImageSrc(person.imagePath),
        alt: person.name,
        initials: profileInitials(person.name)
      })),
      'avatar'
    ),
    buildShareListBox(
      t.shareNearbyTeams,
      result.topTeamMatches.slice(0, 3).map((team) => ({
        label: team.name,
        pct: team.compatibility,
        avatar: resolveProfileImageSrc(team.imagePath),
        alt: team.name,
        initials: team.name.slice(0, 2).toUpperCase()
      })),
      'crest'
    )
  );
  return row;
}

interface ShareListItem {
  label: string;
  pct: number;
  avatar: string;
  alt: string;
  initials: string;
}

function buildShareListBox(
  title: string,
  items: ShareListItem[],
  kind: 'avatar' | 'crest'
): HTMLElement {
  const P = SHARE_COLORS.papel;
  const box = el('div', {
    flex: '1 1 0',
    minWidth: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '28px 30px',
    borderRadius: '36px',
    background: SHARE_COLORS.panel,
    border: `2px solid ${SHARE_COLORS.panelLine}`
  });
  box.append(el('div', {
    fontFamily: SHARE_FONT_BODY,
    fontWeight: '600',
    fontSize: '26px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    color: SHARE_COLORS.accent
  }, title));

  items.forEach((item) => {
    const line = el('div', { display: 'flex', alignItems: 'center', gap: '14px' });
    const avatarFrame = el('div', {
      flex: '0 0 auto',
      width: '76px',
      height: kind === 'avatar' ? '76px' : '52px',
      borderRadius: kind === 'avatar' ? '50%' : '10px',
      overflow: 'hidden',
      background: tokens['pes-bg-a'],
      display: 'grid',
      placeItems: 'center',
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '700',
      fontSize: '22px',
      color: rgba(SHARE_COLORS.papel, 0.7)
    }, item.initials);
    // A imagem é desenhada no canvas por cima destas iniciais (que só ficam
    // visíveis se a imagem não carregar).
    avatarFrame.dataset.shareImage = kind;
    avatarFrame.dataset.shareSrc = item.avatar;

    line.append(
      avatarFrame,
      el('span', {
        flex: '1 1 auto',
        minWidth: '0',
        fontFamily: SHARE_FONT_BODY,
        fontWeight: '500',
        fontSize: kind === 'crest' && item.label.length > 22 ? '25px' : '30px',
        lineHeight: kind === 'crest' ? '1.08' : '1.2',
        color: rgba(P, 0.92),
        whiteSpace: 'normal',
        wordBreak: 'normal',
        overflowWrap: 'normal'
      }, item.label),
      buildShareRating(item.pct)
    );
    box.append(line);
  });

  return box;
}

// Nota no estilo Sofascore, com as mesmas faixas de cor do RatingBadge.
function buildShareRating(value: number): HTMLElement {
  const tier = ratingTier(Math.round(clamp(value)));
  return el('span', {
    flex: '0 0 auto',
    padding: '7px 10px',
    borderRadius: '12px',
    textAlign: 'center',
    fontFamily: SHARE_FONT_DISPLAY,
    fontWeight: '700',
    fontSize: '30px',
    lineHeight: '1',
    background: tokens[`rate-${tier}`],
    color: tier === 'ok' ? tokens['rate-ok-text'] : tokens['rate-text']
  }, `${Math.round(clamp(value))}%`);
}

function buildShareFooter(): HTMLElement {
  const P = SHARE_COLORS.papel;
  const footer = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '30px',
    borderTop: `2px solid ${rgba(P, 0.25)}`
  });
  footer.append(
    el('span', {
      fontFamily: SHARE_FONT_BODY,
      fontWeight: '600',
      fontSize: '30px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: rgba(P, 0.9)
    }, t.shareFooterCta),
    el('span', {
      fontFamily: SHARE_FONT_DISPLAY,
      fontWeight: '700',
      fontSize: '30px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: P
    }, t.shareFooterUrl)
  );
  return footer;
}


/*
 * Exportação em camadas.
 *
 * O html-to-image desenha o DOM dentro de um SVG <foreignObject>. No Safari
 * (e em alguns Androids) esse SVG pode "terminar de carregar" antes das
 * imagens internas serem decodificadas, e o PNG sai sem as fotos — de forma
 * intermitente. Por isso as imagens nunca passam pelo html-to-image: ele só
 * renderiza texto, caixas e ícones sobre fundo transparente, e o resto é
 * desenhado aqui no canvas, esperando cada imagem carregar de verdade.
 *
 * Ordem das camadas: fundo → retrato composto → DOM → avatares e bandeiras
 * (estes por último porque ficam dentro de caixas translúcidas).
 */

type ToPng = (node: HTMLElement, options?: Record<string, unknown>) => Promise<string>;
type ShareImageKind = 'portrait' | 'avatar' | 'crest';

interface ShareImageSlot {
  kind: ShareImageKind;
  src: string;
  rect: CanvasRect;
  tier: string | undefined;
}

type CanvasRect = { x: number; y: number; width: number; height: number };

const IMAGE_TIMEOUT_MS = 8000;

export async function renderSharePng(target: HTMLElement, toPng: ToPng): Promise<string> {
  const slots = collectImageSlots(target);
  // Carrega as imagens em paralelo com o render do DOM.
  const imagesPromise = Promise.all(slots.map((slot) => loadImage(slot.src).catch(() => null)));

  const domDataUrl = await toPng(target, {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    pixelRatio: 1,
    cacheBust: false,
    skipFonts: false
  });
  const [domLayer, images] = await Promise.all([loadImage(domDataUrl), imagesPromise]);

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas indisponível');
  }

  drawBackground(ctx);

  slots.forEach((slot, index) => {
    if (slot.kind === 'portrait') {
      drawFutCard(ctx, images[index], slot.rect, FUT_TIERS[slot.tier ?? 'fut-gold'] ?? FUT_TIERS['fut-gold']);
    }
  });

  ctx.drawImage(domLayer, 0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  slots.forEach((slot, index) => {
    const image = images[index];
    if (!image || slot.kind === 'portrait') {
      return;
    }
    ctx.save();
    if (slot.kind === 'avatar') {
      ctx.beginPath();
      ctx.ellipse(
        slot.rect.x + slot.rect.width / 2,
        slot.rect.y + slot.rect.height / 2,
        slot.rect.width / 2,
        slot.rect.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.clip();
      drawCover(ctx, image, slot.rect, 0.2);
    } else {
      roundedRectPath(ctx, slot.rect, 10);
      ctx.clip();
      drawCover(ctx, image, slot.rect, 0.5);
    }
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

function collectImageSlots(root: HTMLElement): ShareImageSlot[] {
  const rootRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>('[data-share-image][data-share-src]'))
    .map((frame) => {
      const kind = frame.dataset.shareImage as ShareImageKind;
      const src = frame.dataset.shareSrc ?? '';
      const rect = frame.getBoundingClientRect();
      if (!src || rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      return {
        kind,
        src,
        tier: frame.dataset.shareTier,
        rect: {
          x: rect.left - rootRect.left,
          y: rect.top - rootRect.top,
          width: rect.width,
          height: rect.height
        }
      };
    })
    .filter((slot): slot is ShareImageSlot => slot !== null);
}

// Carrega via fetch → blob → objectURL para não depender de cabeçalhos CORS e
// garante que a imagem está decodificada antes de ir para o canvas.
async function loadImage(src: string): Promise<HTMLImageElement> {
  let objectUrl: string | null = null;
  let url = src;
  if (!src.startsWith('data:')) {
    const response = await withTimeout(
      fetch(new URL(src, window.location.href).href, { cache: 'force-cache', credentials: 'same-origin' }),
      IMAGE_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    objectUrl = URL.createObjectURL(await response.blob());
    url = objectUrl;
  }
  try {
    const image = new Image();
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not decode image'));
        image.src = url;
      }),
      IMAGE_TIMEOUT_MS
    );
    if (typeof image.decode === 'function') {
      await image.decode().catch(() => undefined);
    }
    return image;
  } finally {
    if (objectUrl) {
      const toRevoke = objectUrl;
      // Revoga depois do desenho: alguns Safaris ainda leem o blob no drawImage.
      window.setTimeout(() => URL.revokeObjectURL(toRevoke), 30000);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Gramado listrado com as linhas de cal de um campo inteiro (de pé, gol em cima e embaixo).
function drawBackground(ctx: CanvasRenderingContext2D) {
  const stripes = 12;
  const band = SHARE_HEIGHT / stripes;
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? tokens['pitch-stripe-a'] : tokens['pitch-stripe-b'];
    ctx.fillRect(0, i * band, SHARE_WIDTH, band);
  }
  const m = 32;
  const cx = SHARE_WIDTH / 2;
  const cy = SHARE_HEIGHT / 2;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = tokens['pitch-line'];
  ctx.fillStyle = tokens['pitch-line'];
  ctx.lineWidth = 4;
  ctx.strokeRect(m, m, SHARE_WIDTH - 2 * m, SHARE_HEIGHT - 2 * m);
  ctx.beginPath();
  ctx.moveTo(m, cy);
  ctx.lineTo(SHARE_WIDTH - m, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  [m, SHARE_HEIGHT - m].forEach((goalLine) => {
    const dir = goalLine === m ? 1 : -1;
    const boxTop = dir === 1 ? goalLine : goalLine - 280;
    const areaTop = dir === 1 ? goalLine : goalLine - 100;
    ctx.strokeRect(cx - 330, boxTop, 660, 280);
    ctx.strokeRect(cx - 150, areaTop, 300, 100);
    ctx.beginPath();
    ctx.arc(cx, goalLine + dir * 200, 150, dir === 1 ? 0.2 * Math.PI : 1.2 * Math.PI, dir === 1 ? 0.8 * Math.PI : 1.8 * Math.PI);
    ctx.stroke();
  });
  ctx.restore();
}

// Carta do Ultimate Team: recorte com ombros e ponta, degradê metálico e a
// foto à direita sumindo para baixo (como .fut / .fut-face no editorial.css).
function drawFutCard(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  rect: CanvasRect,
  tier: { a: string; b: string }
) {
  const { x, y, width: w, height: h } = rect;
  const shape: [number, number][] = [[0, 0.07], [0.16, 0], [0.5, 0.03], [0.84, 0], [1, 0.07], [1, 0.86], [0.5, 1], [0, 0.86]];
  ctx.save();
  ctx.shadowColor = tokens['fut-shadow'];
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  shape.forEach(([px, py], index) => (index === 0 ? ctx.moveTo(x + px * w, y + py * h) : ctx.lineTo(x + px * w, y + py * h)));
  ctx.closePath();
  const gradient = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  gradient.addColorStop(0, tier.a);
  gradient.addColorStop(1, tier.b);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  if (!image) {
    return;
  }
  const face = { x: x + w * 0.35, y: y + h * 0.08, width: w * 0.58, height: h * 0.48 };
  const layer = document.createElement('canvas');
  layer.width = Math.round(face.width);
  layer.height = Math.round(face.height);
  const lctx = layer.getContext('2d');
  if (!lctx) {
    return;
  }
  drawCover(lctx, image, { x: 0, y: 0, width: layer.width, height: layer.height }, 0);
  const fade = lctx.createLinearGradient(0, 0, 0, layer.height);
  fade.addColorStop(0.7, tokens['ball-black']);
  fade.addColorStop(1, rgba(tokens['ball-black'], 0));
  lctx.globalCompositeOperation = 'destination-in';
  lctx.fillStyle = fade;
  lctx.fillRect(0, 0, layer.width, layer.height);
  ctx.drawImage(layer, face.x, face.y, face.width, face.height);
}

// object-fit: cover, com o ponto vertical de foco em `focusY` (0 = topo).
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rect: CanvasRect, focusY: number) {
  const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    rect.x + (rect.width - width) / 2,
    rect.y + (rect.height - height) * focusY,
    width,
    height
  );
}

function roundedRectPath(ctx: CanvasRenderingContext2D, rect: CanvasRect, radius: number) {
  const { x, y, width, height } = rect;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
