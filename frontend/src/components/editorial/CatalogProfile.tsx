import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { fetchCompare, fetchSharedResult } from '../../services/quizApi';
import type {
  Axis,
  AxisOutlier,
  AxisResult,
  CompareItem,
  CompareType,
  FootballIdeologyMatch,
  ManagerMatch,
  ProfileDimension,
  QuizResult,
  TeamMatch
} from '../../types/quiz';
import { profileInitials, resolveProfileImageSrc } from '../../utils/profileImage';
import { AxisRow } from '../results/AxesSection';
import { Tabs } from '../results/parts';
import { ArrowIcon, SafeImg } from './primitives';

type Tab = 'axes' | 'ideologies' | 'managers' | 'teams';

const SIMILAR_COUNT = 8;

interface Entry {
  type: CompareType;
  id: string;
  name: string;
  caption: string;
  description: string;
  imagePath?: string | null;
  imageSourceName?: string;
  imageSourceUrl?: string;
  score: number;
}

interface DimEntry {
  dimension: ProfileDimension;
  entry: Entry;
}

const fromManager = (m: ManagerMatch): Entry => ({
  type: 'manager',
  id: m.managerId,
  name: m.name,
  caption: m.period,
  description: m.description,
  imagePath: m.imagePath,
  imageSourceName: m.imageSourceName,
  imageSourceUrl: m.imageSourceUrl,
  score: m.compatibility
});

const fromTeam = (m: TeamMatch): Entry => ({
  type: 'team',
  id: m.teamId,
  name: m.name,
  caption: m.period,
  description: m.description,
  imagePath: m.imagePath,
  imageSourceName: m.imageSourceName,
  imageSourceUrl: m.imageSourceUrl,
  score: m.compatibility
});

const fromIdeology = (m: FootballIdeologyMatch): Entry => ({
  type: 'football-ideology',
  id: m.footballIdeologyId,
  name: m.name,
  caption: m.category,
  description: m.description,
  score: m.compatibility
});

function Face({ entry, className }: { entry: Pick<Entry, 'type' | 'name' | 'imagePath'>; className: string }) {
  if (entry.type === 'football-ideology') return null;
  return (
    <SafeImg
      className={className}
      src={resolveProfileImageSrc(entry.imagePath)}
      alt={entry.type === 'manager' ? t.portraitAlt(entry.name) : t.crestAlt(entry.name)}
      fallback={entry.type === 'manager' ? profileInitials(entry.name) : t.crestUnavailable}
    />
  );
}

interface Ranked {
  top: Entry | null;
  dims: DimEntry[];
  similar: Entry[];
  far: Entry[];
}

// O perfil aparece no próprio ranking (100%); ele sai antes de montar as listas.
function rankGroup(list: Entry[], dims: DimEntry[], far: Entry[], selfId: string): Ranked {
  const others = list.filter((e) => e.id !== selfId);
  const top = others[0] ?? null;
  const shownDims = dims.filter((d) => d.entry.id !== selfId && d.entry.id !== top?.id);
  const shown = new Set([top?.id, ...shownDims.map((d) => d.entry.id)]);
  return {
    top,
    dims: shownDims,
    similar: others.filter((e) => !shown.has(e.id)).slice(0, SIMILAR_COUNT),
    far: far.filter((e) => e.id !== selfId).reverse()
  };
}

interface ProfileProps {
  item: CompareItem;
  axes: Axis[];
  onOpen: (type: CompareType, id: string) => void;
  onBack: () => void;
  onStartQuiz: () => void;
}

export function CatalogProfile({ item, axes, onOpen, onBack, onStartQuiz }: ProfileProps) {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('axes');

  useEffect(() => {
    let cancelled = false;
    const neutral = axes.map(() => 50);
    fetchCompare(item.type, item.id, neutral)
      .then((detail) => {
        if (cancelled) return null;
        setDescription(detail.description);
        const values = axes.map((axis) => Math.round((detail.vector[axis.id] ?? 50) * 10) / 10);
        return fetchSharedResult(values);
      })
      .then((next) => {
        if (!cancelled && next) setResult(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item, axes]);

  const groups = useMemo(() => {
    if (!result) return null;
    const ideologies = result.matches.map(fromIdeology).filter((e) => e.id !== item.id);
    const farIdeology = result.bottomFootballIdeologyMatch ? fromIdeology(result.bottomFootballIdeologyMatch) : null;
    return {
      ideologies: ideologies.slice(0, 3),
      farIdeology: farIdeology && farIdeology.id !== item.id ? farIdeology : null,
      managers: rankGroup(
        result.managerMatches.map(fromManager),
        result.managerDimensionMatches.map((d) => ({ dimension: d.dimension, entry: fromManager(d.match) })),
        result.bottomManagerMatches.map(fromManager),
        item.id
      ),
      teams: rankGroup(
        result.topTeamMatches.map(fromTeam),
        result.teamDimensionMatches.map((d) => ({ dimension: d.dimension, entry: fromTeam(d.match) })),
        result.bottomTeamMatches.map(fromTeam),
        item.id
      ),
      self:
        result.managerMatches.map(fromManager).find((e) => e.id === item.id && item.type === 'manager') ??
        result.topTeamMatches.map(fromTeam).find((e) => e.id === item.id && item.type === 'team') ??
        null
    };
  }, [result, item]);

  const axisResults = useMemo(
    () => new Map<string, AxisResult>((result?.axes ?? []).map((axis) => [axis.axisId, axis])),
    [result]
  );

  const open = (entry: Entry) => onOpen(entry.type, entry.id);
  const name = item.name;

  return (
    <div className="e-prof">
      <nav className="e-crumbs" aria-label="breadcrumb">
        <button type="button" onClick={onBack}>
          {t.catalogTitle}
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{name}</span>
      </nav>

      <article className={item.type === 'football-ideology' ? 'e-panel e-prof-hero e-no-img' : 'e-panel e-prof-hero'}>
        <div className="e-prof-txt">
          <div className="e-prof-tags">
            <span className="e-tag e-tag-solid">{item.category}</span>
            {item.caption !== item.category && <span className="e-tag e-tag-neutral">{item.caption}</span>}
          </div>
          <h1>{name}</h1>
          {description && <p className="e-prof-lead">{description}</p>}
          {groups && (
            <dl className="e-prof-kpis">
              <Kpi label={t.profile.kpiIdeology} entry={groups.ideologies[0]} onOpen={open} />
              <Kpi label={t.profile.kpiManager} entry={groups.managers.top} onOpen={open} />
              <Kpi label={t.profile.kpiTeam} entry={groups.teams.top} onOpen={open} />
            </dl>
          )}
        </div>
        {item.type !== 'football-ideology' && (
          <figure className={item.type === 'team' ? 'e-prof-img e-crest' : 'e-prof-img'}>
            <Face entry={{ type: item.type, name, imagePath: item.imagePath }} className="e-prof-photo" />
            {groups?.self?.imageSourceUrl && (
              <figcaption>
                <a href={groups.self.imageSourceUrl} target="_blank" rel="noopener nofollow">
                  {groups.self.imageSourceName || t.profile.imageSource}
                </a>
              </figcaption>
            )}
          </figure>
        )}
      </article>

      {failed && <p className="e-cmp-empty">{t.catalogError}</p>}
      {!result && !failed && <p className="e-cmp-empty">{t.catalogLoading}</p>}

      {result && groups && (
        <>
          <div className="e-prof-tabs">
            <Tabs
              label={t.profile.tabsAria}
              value={tab}
              onChange={setTab}
              options={(['axes', 'ideologies', 'managers', 'teams'] as Tab[]).map((value) => ({
                value,
                label: t.profile.tabs[value]
              }))}
            />
          </div>

          {tab === 'axes' && (
            <>
              <section className="e-panel">
                <h2 className="e-sec-title">{t.profile.axesTitle}</h2>
                <ul className="e-axes-list">
                  {axes.map((axis) => {
                    const row = axisResults.get(axis.id);
                    return row ? <AxisRow key={axis.id} axis={axis} result={row} /> : null;
                  })}
                </ul>
              </section>
              {result.mostUnusualAxis && result.mostCommonAxis && (
                <section className="e-panel">
                  <div className="e-sec-head">
                    <h2 className="e-sec-title">{t.profile.distinctTitle(name)}</h2>
                    <p className="e-mleg" aria-hidden="true">
                      <span>
                        <i className="e-k-m" />
                        {t.signatureMedian}
                      </span>
                      <span>
                        <i className="e-k-y" />
                        {name}
                      </span>
                    </p>
                  </div>
                  <div className="e-dist">
                    <DistinctCard outlier={result.mostUnusualAxis} strong name={name} results={axisResults} />
                    <DistinctCard outlier={result.mostCommonAxis} strong={false} name={name} results={axisResults} />
                  </div>
                </section>
              )}
            </>
          )}

          {tab === 'ideologies' && (
            <section className="e-panel">
              <h2>{t.profile.ideologiesTitle(name)}</h2>
              <ul className="e-prof-ideas">
                {groups.ideologies.map((entry) => (
                  <li key={entry.id}>
                    <button type="button" className="e-prof-idea" onClick={() => open(entry)}>
                      <span className="e-prof-idea-top">
                        <span className="e-tag e-tag-solid">{entry.caption}</span>
                        <b>{Math.round(entry.score)}%</b>
                      </span>
                      <strong>{entry.name}</strong>
                      <span>{entry.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {groups.farIdeology && (
                <>
                  <p className="e-sub">{t.profile.distant(name)}</p>
                  <FarRows entries={[groups.farIdeology]} onOpen={open} />
                </>
              )}
            </section>
          )}

          {tab === 'managers' && (
            <RankedPanel title={t.profile.managersTitle} name={name} group={groups.managers} onOpen={open} />
          )}
          {tab === 'teams' && <RankedPanel title={t.profile.teamsTitle} name={name} group={groups.teams} onOpen={open} />}

          <aside className="e-panel e-prof-cta">
            <div>
              <h2>{t.profile.ctaTitle}</h2>
              <p>{t.profile.ctaText(name)}</p>
            </div>
            <button className="e-btn e-btn-light" type="button" onClick={onStartQuiz}>
              {t.profile.ctaButton} <ArrowIcon />
            </button>
          </aside>
        </>
      )}
    </div>
  );
}

function Kpi({ label, entry, onOpen }: { label: string; entry: Entry | null | undefined; onOpen: (e: Entry) => void }) {
  if (!entry) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <button type="button" onClick={() => onOpen(entry)}>
          {entry.name}
        </button>
      </dd>
    </div>
  );
}

function RankedPanel({ title, name, group, onOpen }: { title: string; name: string; group: Ranked; onOpen: (e: Entry) => void }) {
  const top = group.top;
  return (
    <section className="e-panel">
      <h2>{title}</h2>
      {top && (
        <button type="button" className="e-prof-match" onClick={() => onOpen(top)}>
          <Face entry={top} className="e-prof-match-img" />
          <span className="e-prof-match-txt">
            <span className="e-prof-tags">
              <span className="e-tag e-tag-neutral">{t.profile.mostCompatible}</span>
              <span className="e-tag e-tag-solid">
                {Math.round(top.score)}% {t.profile.matchWord}
              </span>
            </span>
            <strong>{top.name}</strong>
            <span className="e-tag e-tag-neutral">{top.caption}</span>
            <span className="e-prof-match-desc">{top.description}</span>
          </span>
        </button>
      )}
      {group.dims.length > 0 && (
        <>
          <p className="e-sub">{t.profile.byDimension}</p>
          <ul className="e-prof-grid e-prof-dims">
            {group.dims.map(({ dimension, entry }) => (
              <li key={dimension}>
                <MiniCard entry={entry} label={t.dimensionLabels[dimension]} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </>
      )}
      {group.similar.length > 0 && (
        <>
          <p className="e-sub">{t.profile.similar}</p>
          <ul className="e-prof-grid">
            {group.similar.map((entry) => (
              <li key={entry.id}>
                <MiniCard entry={entry} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </>
      )}
      {group.far.length > 0 && (
        <>
          <p className="e-sub">{t.profile.distant(name)}</p>
          <FarRows entries={group.far} onOpen={onOpen} />
        </>
      )}
    </section>
  );
}

function MiniCard({ entry, label, onOpen }: { entry: Entry; label?: string; onOpen: (e: Entry) => void }) {
  return (
    <button type="button" className="e-prof-mini" onClick={() => onOpen(entry)}>
      <Face entry={entry} className="e-prof-mini-img" />
      {label && <span className="e-prof-dim">{label}</span>}
      <strong>{entry.name}</strong>
      <small>{entry.caption}</small>
      <b>{Math.round(entry.score)}%</b>
    </button>
  );
}

function FarRows({ entries, onOpen }: { entries: Entry[]; onOpen: (e: Entry) => void }) {
  return (
    <ul className="e-prof-fars">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button type="button" onClick={() => onOpen(entry)}>
            <span>
              <strong>{entry.name}</strong>
              <small>{entry.caption}</small>
            </span>
            <b>{Math.round(entry.score)}%</b>
          </button>
        </li>
      ))}
    </ul>
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function DistinctCard({ outlier, strong, name, results }: { outlier: AxisOutlier; strong: boolean; name: string; results: Map<string, AxisResult> }) {
  const axisResult = results.get(outlier.axisId);
  const median = clamp(100 - outlier.catalogMedian);
  const you = clamp(100 - outlier.userPercent);
  return (
    <article className={strong ? 'e-dcard e-strong' : 'e-dcard'}>
      <div className="e-dcard-head">
        <span className={strong ? 'e-tag e-tag-white' : 'e-tag e-tag-cat'}>{strong ? t.profile.rareTag : t.profile.commonTag}</span>
        <h3>{outlier.label}</h3>
      </div>
      <div className="e-dcard-body">
        <p className="e-cap">
          {strong ? t.profile.rareText(name, outlier.abovePole, outlier.abovePercent) : t.profile.commonText(name)}
        </p>
      </div>
      <div className="e-mbar" aria-hidden="true">
        <span className="e-mtrack" />
        <span className="e-mfill" style={{ left: `${Math.min(median, you)}%`, width: `${Math.abs(you - median)}%` }} />
        <span className="e-mmed" style={{ left: `${median}%` }} />
        <span className={strong ? 'e-myou e-strong' : 'e-myou'} style={{ left: `${you}%` }} />
      </div>
      {axisResult && (
        <div className="e-mlab">
          <span>{axisResult.leftPole}</span>
          <span>{axisResult.rightPole}</span>
        </div>
      )}
      {strong && <p className="e-cap">{t.profile.rareNote(outlier.label, name)}</p>}
    </article>
  );
}
