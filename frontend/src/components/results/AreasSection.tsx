import { useState } from 'react';
import { t } from '../../i18n';
import type { Axis, AxisResult, ManagerMatch } from '../../types/quiz';
import { topAgreements } from '../../utils/agreement';
import { FutCard } from './FutCard';
import { ManagerInfoSheet } from './ManagersSection';
import { Tabs } from './parts';

interface AreasSectionProps {
  axes: Axis[];
  results: Map<string, AxisResult>;
  generalMatches: ManagerMatch[];
  areaMatches: ManagerMatch[];
}

export function AreasSection({ generalMatches, areaMatches, axes, results }: AreasSectionProps) {
  const [tab, setTab] = useState<'general' | 'area'>('general');
  const [info, setInfo] = useState<ManagerMatch | null>(null);
  const matches = tab === 'general' ? generalMatches : areaMatches;

  if (generalMatches.length === 0 && areaMatches.length === 0) {
    return null;
  }

  return (
    <section className="e-panel" id="areas" data-reveal>
      <h2>{tab === 'general' ? t.areasGeneralTitle : t.areasSectionTitle}</h2>
      <Tabs
        label={t.areasTabsAria}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'general', label: t.areasGeneralTab },
          { value: 'area', label: t.areasByAreaTab }
        ]}
      />
      <ol className="fut-grid">
        {matches.map((match, index) => (
          <li key={match.managerId}>
            <span className="fut-label">{String(index + 1).padStart(2, '0')}</span>
            <FutCard match={match} stats={topAgreements(match.vector, axes, results, 6)} onOpen={() => setInfo(match)} />
          </li>
        ))}
      </ol>
      {info && <ManagerInfoSheet match={info} axes={axes} results={results} onClose={() => setInfo(null)} />}
    </section>
  );
}
