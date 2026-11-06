import type { CSSProperties, ReactNode } from 'react';
import { LANG, t } from '../../i18n';
import type {
  Axis,
  AxisOutlier,
  AxisResult,
  AxisTension,
  FootballIdeologyMatch,
  TeamDimensionMatch,
  TeamMatch,
  QuizResult
} from '../../types/quiz';
import { profileInitials, resolveProfileImageSrc } from '../../utils/profileImage';
import { PitchMarkings, pct, RatingBadge } from '../editorial/primitives';
import { axisLeaning, displayRank } from '../results/AxesSection';
import { compassClamp, compassView, findCompassAxes, type CompassAxes } from '../results/CompassSection';
import { FutCard } from '../results/FutCard';
import { commonNote, unusualLead } from '../results/SignatureSection';
import { topAgreements } from '../../utils/agreement';
import { computeCompass, type CompassPosition } from '../../utils/compass';

interface PdfReportProps {
  result: QuizResult;
  axes: Axis[];
  axisResults: Map<string, AxisResult>;
  answeredCount: number | null;
}

/**
 * Relatório completo para impressão/PDF (design em docs/nova-identidade/12axes-relatorio.html).
 * Só aparece em @media print; a paginação fica a cargo do navegador, com a capa numa página própria.
 */
export function PdfReport({ result, axes, axisResults, answeredCount }: PdfReportProps) {
  const top = result.topMatch;
  const team = result.topTeamMatch;
  const manager = result.topManagerMatch;
  const distantIdea = result.bottomFootballIdeologyMatch;
  const others = result.matches.slice(1, 4);
  const compass = computeCompass(axisResults);
  const hasSignature = result.mostUnusualAxis !== null && result.mostCommonAxis !== null;
  const sections = [
    t.axesSectionTitle,
    ...(hasSignature ? [t.signatureTitle] : []),
    ...(team ? [t.teamsSectionTitle] : []),
    ...(manager ? [t.managersSectionTitle] : []),
    ...(result.managerMatches.length > 0 ? [t.areasGeneralTitle] : []),
    ...(distantIdea ? [t.otherMatches] : []),
    ...(compass ? [t.compassTitle] : [])
  ];
  const today = new Date().toLocaleDateString(LANG === 'pt' ? 'pt-BR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="rp">
      <section className="rp-cover">
        <div className="cv-top">
          <PitchMarkings />
          <div className="cv-bar">
            <Logo />
            <span className="cv-line" />
            <span className="cv-lab">{t.report.docLabel}</span>
          </div>
          <p className="cv-eb">{t.report.profileEyebrow}</p>
          {top ? (
            <>
              <div className="cv-main">
                <div>
                  <span className="tag cv-tag">{top.category}</span>
                  <h1>{top.name}</h1>
                </div>
                <Ring value={top.compatibility} size={132} stroke={6} />
              </div>
              <p className="cv-desc">
                {top.longDescription || top.description}
              </p>
            </>
          ) : (
            <p className="cv-desc">{t.resultsEmptyCatalog}</p>
          )}
        </div>
        <div className="cv-body">
          {top?.phrase && <Quote phrase={top.phrase} />}
          {top && exemplarsLine(top) && (
            <p className="exemplars">
              <span className="eb">{t.exemplarsTitle}</span> {exemplarsLine(top)}
            </p>
          )}
          <div className="kpis">
            {top && (
              <div>
                <small>{t.metaTop}</small>
                <b className="c">{formatPct(top.compatibility, 1)}</b>
                <span>{top.name}</span>
              </div>
            )}
            {team && (
              <div>
                <small>{t.report.kpiTeam}</small>
                <b>{formatPct(team.compatibility, 0)}</b>
                <span>{team.name}</span>
              </div>
            )}
            {manager && (
              <div>
                <small>{t.report.kpiManager}</small>
                <b>{formatPct(manager.compatibility, 0)}</b>
                <span>{manager.name}</span>
              </div>
            )}
            <div>
              <small>{t.report.kpiAxes}</small>
              <b>12</b>
              {answeredCount ? <span>{t.report.kpiAnswered(answeredCount)}</span> : null}
            </div>
          </div>
          <div className="toc">
            <p className="eb">{t.report.tocTitle}</p>
            <ol>
              {sections.map((title, index) => (
                <li key={title}>
                  <span className="tn">{String(index + 1).padStart(2, '0')}</span>
                  <span className="tt">{title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <footer className="pf cv-f">
          <span>
            {t.report.generatedOn(today)} · 12axes-football.vercel.app
          </span>
        </footer>
      </section>

      <div className="rp-body">
        <header className="ph">
          <Logo />
          <span>{t.report.headerLabel(top?.name ?? '')}</span>
        </header>

        <section className="rp-sec">
          <SectionHead title={t.axesSectionTitle} />
          <ul className="axes">
            {[...axes]
              .sort((first, second) => displayRank(first.id) - displayRank(second.id))
              .map((axis) => {
                const axisResult = axisResults.get(axis.id);
                return axisResult ? <AxisRow key={axis.id} axis={axis} result={axisResult} /> : null;
              })}
          </ul>
        </section>

        {result.mostUnusualAxis && result.mostCommonAxis && (
          <section className="rp-sec">
            <SectionHead title={t.signatureTitle} />
            <div className="dist">
              <SignatureCard outlier={result.mostUnusualAxis} strong label={t.signatureUnusualLabel} axisResults={axisResults} />
              <SignatureCard outlier={result.mostCommonAxis} strong={false} label={t.signatureCommonLabel} axisResults={axisResults} />
              {result.axisTension && <TensionBlock tension={result.axisTension} axes={axes} axisResults={axisResults} />}
            </div>
          </section>
        )}

        {team && (
          <section className="rp-sec">
            <SectionHead title={t.teamsSectionTitle} />
            <TeamBlock match={team} dimensions={result.teamDimensionMatches} distant={result.bottomTeamMatches} />
          </section>
        )}

        {manager && (
          <section className="rp-sec">
            <SectionHead title={t.managersSectionTitle} />
            <MatchCard
              visual={<FutCard match={manager} size="lg" special stats={topAgreements(manager.vector, axes, axisResults, 6)} />}
              compatibility={manager.compatibility}
              name={manager.name}
              tags={[manager.period].filter(Boolean)}
              description={manager.description}
            />
            <p className="lbl">{t.dimensionsTitleShort}</p>
            <ul className="fut-row">
              {result.managerDimensionMatches.map(({ dimension, match }) => (
                <li key={dimension}>
                  <FutCard match={match} stats={topAgreements(match.vector, axes, axisResults, 6)} />
                  <span className="dim">{t.dimensionLabels[dimension]}</span>
                </li>
              ))}
            </ul>
            <FarList
              title={t.managersDistantTitle}
              items={result.bottomManagerMatches.map((match) => ({ key: match.managerId, name: match.name, caption: match.period }))}
            />
          </section>
        )}

        {result.managerMatches.length > 0 && (
          <section className="rp-sec">
            <SectionHead title={t.areasGeneralTitle} />
            <ol className="rank">
              {result.managerMatches.map((match, index) => (
                <li className="rk" key={match.managerId}>
                  <span className="rk-n">{String(index + 1).padStart(2, '0')}</span>
                  <Img className="av-m" src={resolveProfileImageSrc(match.imagePath)} name={match.name} />
                  <div className="rk-i">
                    <b>{match.name}</b>
                    <small>{t.managerCategories[match.category] ?? match.category}</small>
                    <div className="bar">
                      <i style={{ width: `${Math.max(0, Math.min(100, match.compatibility))}%` }} />
                    </div>
                  </div>
                  <RatingBadge value={match.compatibility} />
                </li>
              ))}
            </ol>
          </section>
        )}

        {distantIdea && (
          <section className="rp-sec">
            <SectionHead title={t.otherMatches} />
            <ul className="others">
              {others.map((match) => (
                <li className="oc" key={match.footballIdeologyId}>
                  <span className="tag osol">{match.category}</span>
                  <h3>{match.name}</h3>
                  <p>{match.longDescription || match.description}</p>
                </li>
              ))}
            </ul>
            <div className="far-i">
              <span className="lab">{t.footballIdeologyDistantTitle}</span>
              <b>{distantIdea.name}</b>
              <span className="tag osol-l">{distantIdea.category}</span>
              <p>{distantIdea.longDescription || distantIdea.description}</p>
            </div>
          </section>
        )}

        {compass && (
          <section className="rp-sec">
            <SectionHead title={t.compassTitle} />
            <Compass position={compass} axes={findCompassAxes(axes)} />
          </section>
        )}

        <div className="close">
          <div>
            <p className="eb">{t.report.aboutTitle}</p>
            <p>{t.report.aboutText}</p>
          </div>
          <div className="close-cta">
            <b>{t.report.ctaTitle}</b>
            <span>12axes-football.vercel.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Compass({ position, axes }: { position: CompassPosition; axes: CompassAxes }) {
  const { counter, deep, result } = position;
  const { gridCells, markerColor, stripCells, stripColor, xWord, yWord, stripWord } = compassView(position, axes);
  return (
    <div className="cmp">
      <div className="cmp-chart">
        <span className="cmp-lbl cmp-top">{axes.y?.leftPole}</span>
        <span className="cmp-lbl cmp-left">{axes.x?.leftPole}</span>
        <div className="cmp-grid">
          {gridCells.map((color, index) => (
            <span key={index} style={{ background: color }} />
          ))}
          <i className="cmp-axis cmp-x" />
          <i className="cmp-axis cmp-y" />
          <CompassX left={counter} top={deep} color={markerColor} />
        </div>
        <span className="cmp-lbl cmp-right">{axes.x?.rightPole}</span>
        <span className="cmp-lbl cmp-bottom">{axes.y?.rightPole}</span>
      </div>
      <div className="cmp-read">
        <p className="cmp-sentence">
          <span style={{ color: markerColor }}>{xWord}</span> <span className="cmp-conn">{t.compassWith}</span> <span>{yWord}</span>
          {', '}
          <mark style={{ background: stripColor }}>{stripWord}</mark>
        </p>
        <div className="cmp-bar-lbls">
          <span>{axes.strip?.leftPole}</span>
          <span>{axes.strip?.rightPole}</span>
        </div>
        <div className="cmp-strip">
          {stripCells.map((color, index) => (
            <span key={index} style={{ background: color }} />
          ))}
          <CompassX left={result} color={stripColor} />
        </div>
      </div>
    </div>
  );
}

function CompassX({ left, top, color }: { left: number; top?: number; color: string }) {
  return (
    <span
      className="cmp-mark"
      style={{ left: `${compassClamp(left)}%`, top: top === undefined ? '50%' : `${compassClamp(top)}%`, background: color }}
    >
      <svg viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </span>
  );
}

function formatPct(value: number, decimals: number): string {
  return `${value.toLocaleString(LANG === 'pt' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
}

function Logo() {
  return (
    <span className="logo">
      <b>12</b> Axes Football
    </span>
  );
}

function Ring({ value, size, stroke }: { value: number; size: number; stroke: number }) {
  const center = size / 2;
  const radius = center - stroke / 2 - 0.5;
  const circumference = 2 * Math.PI * radius;
  const arc = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--ring-bg)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div>
        <b>{Math.round(value)}%</b>
        <small>{t.matchWord}</small>
      </div>
    </div>
  );
}

function Quote({ phrase }: { phrase: string }) {
  return (
    <figure className="quote">
      <span className="q">“</span>
      <div>
        <p className="eb">{t.phraseTitle}</p>
        <blockquote>{phrase}</blockquote>
      </div>
    </figure>
  );
}

function exemplarsLine(match: FootballIdeologyMatch): string {
  return [match.teamName, match.managerName].filter(Boolean).join(' · ');
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="sh">
      <h2>{title}</h2>
    </div>
  );
}

// Retrato/bandeira com iniciais no lugar quando a imagem não existe.
function Img({ className, src, name }: { className: string; src: string; name: string }) {
  if (!src) {
    return <div className={`${className} ini`}>{profileInitials(name)}</div>;
  }
  return <img className={className} src={src} alt="" />;
}

function AxisRow({ axis, result }: { axis: Axis; result: AxisResult }) {
  const { balanced, rightWins, leftWins, accent } = axisLeaning(axis, result);
  const style = { '--ac': accent, '--al': axis.leftColor, '--ar': axis.rightColor } as CSSProperties;
  const winnerPct = pct(rightWins ? result.rightPercent : result.leftPercent);
  const dotAt = Math.max(0, Math.min(100, result.rightPercent));
  return (
    <li className="ax" style={style}>
      <div className="ax-h">
        <b>{result.label}</b>
        <span className="ax-v">{balanced ? result.intensity : `${winnerPct}% ${result.dominantPole}`}</span>
      </div>
      <div className="tr">
        <i className="fill" style={{ left: `${Math.min(dotAt, 50)}%`, width: `${Math.abs(dotAt - 50)}%` }} />
        <span className="mid" />
        <span className="dot" style={{ left: `${dotAt}%` }} />
      </div>
      <div className="ax-e">
        <div className={leftWins ? 'pl l win' : 'pl l'}>
          <span>{result.leftPole}</span>
        </div>
        <div className={rightWins ? 'pl r win' : 'pl r'}>
          <span>{result.rightPole}</span>
        </div>
      </div>
    </li>
  );
}

function SignatureCard({ outlier, strong, label, axisResults }: {
  outlier: AxisOutlier;
  strong: boolean;
  label: string;
  axisResults: Map<string, AxisResult>;
}) {
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  // O backend manda % do polo esquerdo; a regua tem o polo esquerdo na ponta esquerda.
  const median = clamp(100 - outlier.catalogMedian);
  const you = clamp(100 - outlier.userPercent);
  const axisResult = axisResults.get(outlier.axisId);

  let big: string;
  let cap: string;
  if (strong) {
    big = outlier.balanced ? '' : String(outlier.abovePercent >= 99.5 ? 100 : Math.round(outlier.abovePercent));
    cap = outlier.balanced ? unusualLead(outlier) : t.signatureBigCap(outlier.abovePole);
  } else {
    big = outlier.balanced ? t.signatureAtCentre : t.signatureAtMedian;
    cap = commonNote(outlier);
  }

  return (
    <article className={strong ? 'dcard s' : 'dcard'}>
      <div className="dc-h">
        <span className={strong ? 'tag tw' : 'tag tc'}>{label}</span>
        <h3>{outlier.label}</h3>
      </div>
      <div className="dc-b">
        {big && (
          <p className="big">
            {big}
            {strong && <small>%</small>}
          </p>
        )}
        <p className="cap">{cap}</p>
      </div>
      <div className="mbar">
        <span className="mfill" style={{ left: `${Math.min(median, you)}%`, width: `${Math.abs(you - median)}%` }} />
        <span className="mm" style={{ left: `${median}%` }} />
        <span className={strong ? 'my s' : 'my'} style={{ left: `${you}%` }} />
      </div>
      {axisResult && (
        <div className="ml">
          <span>{axisResult.leftPole}</span>
          <span>{axisResult.rightPole}</span>
        </div>
      )}
      <p className="mleg">
        <span>
          <i className="k-m" />
          {t.signatureMedian}
        </span>
        <span>
          <i className="k-y" />
          {t.signatureYou}
        </span>
      </p>
    </article>
  );
}

function TensionBlock({ tension, axes, axisResults }: {
  tension: AxisTension;
  axes: Axis[];
  axisResults: Map<string, AxisResult>;
}) {
  const colorOf = (axisLabel: string, pole: string): string | undefined => {
    const axis = axes.find((candidate) => axisResults.get(candidate.id)?.label === axisLabel);
    const axisResult = axis ? axisResults.get(axis.id) : undefined;
    if (!axis || !axisResult) {
      return undefined;
    }
    return axisResult.rightPole === pole ? axis.rightColor : axis.leftColor;
  };
  const hidden = tension.matchingFootballIdeologies - tension.examples.length;
  return (
    <article className="tension">
      <div>
        <span className="tag tw">{t.tensionLabel}</span>
        <div className="pair">
          <span style={{ '--c': colorOf(tension.firstAxisLabel, tension.firstPole) } as CSSProperties}>{tension.firstPole}</span>
          <em>+</em>
          <span style={{ '--c': colorOf(tension.secondAxisLabel, tension.secondPole) } as CSSProperties}>{tension.secondPole}</span>
        </div>
      </div>
      <div>
        <p>
          {tension.matchingFootballIdeologies === 0 ? (
            t.tensionUnique
          ) : (
            <b>{t.tensionRareShort(tension.matchingFootballIdeologies, tension.catalogSize)}</b>
          )}
        </p>
        {tension.examples.length > 0 && (
          <ul className="chips">
            {tension.examples.map((name) => (
              <li key={name}>{name}</li>
            ))}
            {hidden > 0 && <li>+{hidden}</li>}
          </ul>
        )}
      </div>
    </article>
  );
}

function MatchCard({ visual, compatibility, name, tags, description, pes = false }: {
  visual: ReactNode;
  pes?: boolean;
  compatibility: number;
  name: string;
  tags: string[];
  description: string;
}) {
  return (
    <article className={pes ? 'mc mc-pes' : 'mc'}>
      {visual}
      <div>
        <div className="tags">
          <span className="tag tc">{t.matchTopKicker}</span>
          <span className="tag ts">
            {Math.round(compatibility)}% {t.matchWord}
          </span>
        </div>
        <h3>{name}</h3>
        {tags.length > 0 && <p className="mc-cap">{tags.join(' · ')}</p>}
        <p>{description}</p>
      </div>
    </article>
  );
}

function teamCaption(match: TeamMatch): string {
  return match.period || match.category;
}

function TeamBlock({ match, dimensions, distant }: {
  match: TeamMatch;
  dimensions?: TeamDimensionMatch[];
  distant?: TeamMatch[];
}) {
  return (
    <>
      <MatchCard
        visual={<Img className="fl-b" src={resolveProfileImageSrc(match.imagePath)} name={match.name} />}
        compatibility={match.compatibility}
        name={match.name}
        tags={[match.category, match.period].filter(Boolean)}
        description={match.description}
        pes
      />
      {dimensions && dimensions.length > 0 && (
        <>
          <p className="lbl">{t.dimensionsTitleShort}</p>
          <ul className="dims">
            {dimensions.map(({ dimension, match: item }) => (
              <li className="dc" key={dimension}>
                <Img className="fl-s" src={resolveProfileImageSrc(item.imagePath)} name={item.name} />
                <span className="dim">{t.dimensionLabels[dimension]}</span>
                <b>{item.name}</b>
                <RatingBadge value={item.compatibility} />
              </li>
            ))}
          </ul>
        </>
      )}
      {distant && distant.length > 0 && (
        <FarList
          title={t.teamsDistantTitle}
          items={distant.map((item) => ({ key: item.teamId, name: item.name, caption: teamCaption(item) }))}
        />
      )}
    </>
  );
}

function FarList({ title, items }: {
  title: string;
  items: { key: string; name: string; caption?: string }[];
}) {
  return (
    <div className="far">
      <span className="lab">{title}</span>
      <ul className="fars">
        {items.map((item) => (
          <li className="fr" key={item.key}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
