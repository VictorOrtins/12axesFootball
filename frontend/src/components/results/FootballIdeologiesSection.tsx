import { useState } from 'react';
import { t } from '../../i18n';
import type { FootballIdeologyMatch } from '../../types/quiz';
import { RatingBadge } from '../editorial/primitives';
import type { ProfileRef } from './CompareSection';
import { NameButton } from './parts';

interface IdeologiesSectionProps {
  others: FootballIdeologyMatch[];
  distant: FootballIdeologyMatch;
  onOpenProfile: (profile: ProfileRef) => void;
}

function ideologyRef(match: FootballIdeologyMatch): ProfileRef {
  return { type: 'football-ideology', id: match.footballIdeologyId, name: match.name };
}

export function FootballIdeologiesSection({ others, distant, onOpenProfile }: IdeologiesSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const columns = others.map((match) => (!openId || match.footballIdeologyId === openId ? '1fr' : '0fr')).join(' ');

  return (
    <section className="e-panel" id="ideologias" data-reveal>
      <h2>{t.otherMatches}</h2>
      <ul className={openId ? 'e-others is-open' : 'e-others'} style={{ gridTemplateColumns: columns }}>
        {others.map((match) => {
          const open = openId === match.footballIdeologyId;
          const hidden = Boolean(openId) && !open;
          const text = match.longDescription || match.description;
          return (
            <li
              className={open ? 'e-ocard is-open' : hidden ? 'e-ocard is-hidden' : 'e-ocard'}
              key={match.footballIdeologyId}
              aria-hidden={hidden}
            >
              <div className="e-ocard-top">
                <span className="e-tag e-osolid">{match.category}</span>
                <RatingBadge value={match.compatibility} />
              </div>
              <h3 className={match.name.length >= 18 ? 'e-long-name' : undefined}>
                <NameButton name={match.name} onOpen={() => onOpenProfile(ideologyRef(match))} tabIndex={hidden ? -1 : undefined} />
              </h3>
              <div className="e-ocard-more">
                <p className="e-ocard-text">{text}</p>
              </div>
              <button
                type="button"
                className="e-morebtn"
                aria-expanded={open}
                tabIndex={hidden ? -1 : undefined}
                onClick={() => setOpenId(open ? null : match.footballIdeologyId)}
              >
                {open ? t.showLess : t.knowMoreAbout(match.name)}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="e-distant">
        <p className="e-sub">{t.footballIdeologyDistantTitle}</p>
        <strong>
          <NameButton name={distant.name} onOpen={() => onOpenProfile(ideologyRef(distant))} />
        </strong>
        <span className="e-tag">
          {distant.category}
        </span>
        <More name={distant.name} text={distant.longDescription || distant.description} />
      </div>
    </section>
  );
}

function More({ name, text }: { name: string; text: string }) {
  if (!text) {
    return null;
  }
  return (
    <details className="e-more">
      <summary>{t.knowMoreAbout(name)}</summary>
      <p>{text}</p>
    </details>
  );
}
