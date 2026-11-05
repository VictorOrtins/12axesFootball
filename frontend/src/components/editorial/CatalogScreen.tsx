import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { fetchCatalogDescriptions, fetchCompareCatalog } from '../../services/quizApi';
import type { Axis, CompareItem, CompareType } from '../../types/quiz';
import { CatalogProfile } from './CatalogProfile';
import { ArrowIcon } from './primitives';
import { ProfileFace } from '../results/CompareSection';

const TABS: { type: CompareType; label: () => string }[] = [
  { type: 'manager', label: () => t.catalogTabManagers },
  { type: 'team', label: () => t.catalogTabTeams },
  { type: 'football-ideology', label: () => t.catalogTabIdeologies }
];

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function itemPath(item: CompareItem): string {
  return `/catalog/${item.type}/${encodeURIComponent(item.id)}`;
}

function itemFromPath(items: CompareItem[]): CompareItem | null {
  const [, root, type, id] = window.location.pathname.split('/');
  if (root !== 'catalog' || !id) return null;
  return items.find((item) => item.type === type && item.id === decodeURIComponent(id)) ?? null;
}

export function CatalogScreen({ axes, onStartQuiz, onHome }: { axes: Axis[]; onStartQuiz: () => void; onHome: () => void }) {
  const [items, setItems] = useState<CompareItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<CompareType>('football-ideology');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CompareItem | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchCompareCatalog()
      .then((raw) => {
        const loaded = raw.map((item) =>
          item.type === 'manager' ? { ...item, category: t.managerCategories[item.category] ?? item.category } : item
        );
        setItems(loaded);
        const fromUrl = itemFromPath(loaded);
        if (fromUrl) {
          setSelected(fromUrl);
          setTab(fromUrl.type);
        }
      })
      .catch(() => setFailed(true));
    fetchCatalogDescriptions().then(setDescriptions).catch(() => undefined);
  }, []);

  useEffect(() => {
    const onPop = () => setSelected(items ? itemFromPath(items) : null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [items]);

  const open = (item: CompareItem) => {
    window.history.pushState(null, '', itemPath(item));
    setSelected(item);
    window.scrollTo(0, 0);
  };

  const openById = (type: CompareType, id: string) => {
    const item = items?.find((candidate) => candidate.type === type && candidate.id === id);
    if (item) open(item);
  };

  const close = () => {
    window.history.pushState(null, '', '/catalog');
    setSelected(null);
  };

  const ofTab = useMemo(() => (items ?? []).filter((item) => item.type === tab), [items, tab]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    ofTab.forEach((item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1));
    return [...counts.entries()];
  }, [ofTab]);

  const groups = useMemo(() => {
    const needle = fold(query.trim());
    const matching = ofTab.filter(
      (item) => (!category || item.category === category) && fold(`${item.name} ${item.caption}`).includes(needle)
    );
    return categories
      .map(([name]) => ({ name, items: matching.filter((item) => item.category === name) }))
      .filter((group) => group.items.length > 0);
  }, [ofTab, categories, category, query]);

  const switchTab = (next: CompareType) => {
    setTab(next);
    setCategory(null);
    setQuery('');
  };

  if (selected) {
    return (
      <main className="ed e-catalog">
        <div className="e-wrap">
          <CatalogProfile key={`${selected.type}-${selected.id}`} item={selected} axes={axes} onOpen={openById} onBack={close} onStartQuiz={onStartQuiz} />
        </div>
      </main>
    );
  }

  const tabLabel = TABS.find((entry) => entry.type === tab)?.label() ?? '';

  return (
    <main className="ed e-catalog">
      <div className="e-wrap">
        <nav className="e-crumbs" aria-label="breadcrumb">
          <button type="button" onClick={onHome}>
            {t.catalogHome}
          </button>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t.catalogTitle}</span>
        </nav>
        <div className="e-tabs" role="tablist">
          {TABS.map(({ type, label }) => (
            <button key={type} type="button" role="tab" aria-selected={tab === type} onClick={() => switchTab(type)}>
              {label()}
            </button>
          ))}
        </div>
        <p className="e-cat-eyebrow">{t.catalogTitle}</p>
        <h1 className="e-cat-title">{tabLabel}</h1>
        <p className="e-cat-lead">{t.catalogLeads[tab](ofTab.length)}</p>
        <dl className="e-cat-stats">
          <div>
            <dt>{t.catalogStats[0]}</dt>
            <dd>{ofTab.length}</dd>
          </div>
          <div>
            <dt>{t.catalogStats[1]}</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>{t.catalogStats[2]}</dt>
            <dd>12</dd>
          </div>
        </dl>
        <ul className="e-cat-tiles">
          {categories.map(([name, count]) => (
            <li key={name}>
              <button type="button" aria-pressed={category === name} onClick={() => setCategory(category === name ? null : name)}>
                <b>{count}</b>
                <span>{name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="e-cat-toolbar">
        <div className="e-wrap">
          <input
            className="e-cmp-input"
            type="search"
            aria-label={t.catalogSearchLabel}
            placeholder={t.catalogSearchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="e-cat-chips" role="group" aria-label={t.catalogFilterAria}>
            {categories.map(([name, count]) => (
              <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(category === name ? null : name)}>
                {name} <small>{count}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="e-wrap">
        {failed && <p className="e-cmp-empty">{t.catalogError}</p>}
        {!items && !failed && <p className="e-cmp-empty">{t.catalogLoading}</p>}
        {items && groups.length === 0 && <p className="e-cmp-empty">{t.catalogEmpty}</p>}
        {groups.map((group) => (
          <section key={group.name} className="e-cat-group">
            <header className="e-cat-group-head">
              <h2>{group.name}</h2>
              <span className="e-tag e-tag-neutral">{t.catalogCount(group.items.length)}</span>
            </header>
            <ul className="e-cat-grid">
              {group.items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button className="e-cat-card" type="button" onClick={() => open(item)}>
                    <span className="e-cat-card-head">
                      {item.type !== 'football-ideology' && (
                        <ProfileFace item={item} className={item.type === 'team' ? 'e-cat-face e-cat-crest' : 'e-cat-face'} />
                      )}
                      <span className="e-cat-card-name">
                        <strong>{item.name}</strong>
                        {item.caption !== item.category && <span className="e-tag e-tag-neutral">{item.caption}</span>}
                      </span>
                    </span>
                    <span className="e-cat-desc">{descriptions.get(`${item.type}:${item.id}`) ?? ''}</span>
                    <span className="e-cat-more">
                      {t.catalogViewProfile} <ArrowIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
