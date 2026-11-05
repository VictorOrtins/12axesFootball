import { useState } from 'react';
import { t } from '../../i18n';
import type { Axis, AxisResult, ManagerDimensionMatch, ManagerMatch } from '../../types/quiz';
import { profileInitials, resolveProfileImageSrc } from '../../utils/profileImage';
import { SafeImg } from '../editorial/primitives';
import { Closeness } from './Closeness';
import { InfoSheet } from './InfoSheet';
import { topAgreements } from '../../utils/agreement';
import { FutCard } from './FutCard';
import { FarList } from './parts';
import { SheetMatch } from './SheetMatch';

interface ManagersSectionProps {
  axes: Axis[];
  results: Map<string, AxisResult>;
  top: ManagerMatch;
  dimensions: ManagerDimensionMatch[];
  distant: ManagerMatch[];
}

export function Portrait({ match, className }: { match: ManagerMatch; className: string }) {
  return (
    <SafeImg
      className={className}
      src={resolveProfileImageSrc(match.imagePath)}
      alt={t.portraitAlt(match.name)}
      fallback={profileInitials(match.name)}
    />
  );
}

export function ManagersSection({ top, dimensions, distant, axes, results }: ManagersSectionProps) {
  const [info, setInfo] = useState<ManagerMatch | null>(null);

  return (
    <section className="e-panel" id="treinadores" data-reveal>
      <h2>{t.managersSectionTitle}</h2>

      <div className="fut-hero">
        <FutCard match={top} size="lg" special stats={topAgreements(top.vector, axes, results, 6)} />
        <div className="fut-hero-info">
          <span className="e-tag e-tag-solid">{t.matchTopKicker}</span>
          <h3>{top.name}</h3>
          <p>{top.period}</p>
          {top.description && (
            <details className="e-more">
              <summary>{t.knowMoreAbout(top.name)}</summary>
              <p>{top.description}</p>
            </details>
          )}
        </div>
      </div>

      {dimensions.length > 0 && (
        <>
          <p className="e-sub">{t.dimensionsTitleShort}</p>
          <ul className="fut-row">
            {dimensions.map(({ dimension, match }) => (
              <li key={dimension}>
                <span className="fut-label">{t.dimensionLabels[dimension]}</span>
                <FutCard match={match} stats={topAgreements(match.vector, axes, results, 6)} onOpen={() => setInfo(match)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <FarList
        title={t.managersDistantTitle}
        items={distant.map((match) => ({
          key: match.managerId,
          name: match.name,
          caption: match.period,
          onOpen: () => setInfo(match)
        }))}
      />
      {info && <ManagerInfoSheet match={info} axes={axes} results={results} onClose={() => setInfo(null)} />}
    </section>
  );
}

// Detalhe completo de um treinador: todos os metadados exibíveis do catálogo.
export function ManagerInfoSheet({ match, axes, results, onClose }: {
  match: ManagerMatch;
  axes: Axis[];
  results: Map<string, AxisResult>;
  onClose: () => void;
}) {
  return (
    <InfoSheet titleId="e-person-sheet-title" onClose={onClose}>
      <div className="e-person-sheet-head">
        <Portrait match={match} className="e-avatar" />
        <div>
          <span className="e-tag e-tag-neutral">{t.managerCategories[match.category] ?? match.category}</span>
          <h3 id="e-person-sheet-title">{match.name}</h3>
          <p className="e-axis-sheet-label">{match.period}</p>
        </div>
      </div>
      <SheetMatch compatibility={match.compatibility} />
      <p className="e-axis-sheet-text">{match.description}</p>
      <Closeness
        vector={match.vector}
        name={match.name}
        face={<Portrait match={match} className="e-close-face" />}
        axes={axes}
        results={results}
      />
    </InfoSheet>
  );
}
