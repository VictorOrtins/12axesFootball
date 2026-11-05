import { t } from '../../i18n';
import type { FootballIdeologyMatch } from '../../types/quiz';
import type { ProfileRef } from './CompareSection';
import { NameButton } from './parts';

// Dentro do cartao da ideia de jogo do topo: a frase curada (uma por ideia) e,
// recolhida, a descricao longa.
export function PhraseSection({ match, onOpenProfile }: { match: FootballIdeologyMatch; onOpenProfile: (profile: ProfileRef) => void }) {
  const about = match.longDescription || match.description;
  const exemplars: ProfileRef[] = [
    ...(match.teamName ? [{ type: 'team' as const, name: match.teamName }] : []),
    ...(match.managerName ? [{ type: 'manager' as const, name: match.managerName }] : [])
  ];

  if (!match.phrase && !about) {
    return null;
  }

  return (
    <div className="e-top-body">
      {match.phrase && (
        <figure className="e-phrase">
          <span className="e-q" aria-hidden="true">“</span>
          <div>
            <p className="e-eyebrow">{t.phraseTitle}</p>
            <blockquote>{match.phrase}</blockquote>
          </div>
        </figure>
      )}
      {exemplars.length > 0 && (
        <div className="e-exemplars">
          <p className="e-eyebrow">{t.exemplarsTitle}</p>
          <p>
            {exemplars.map((profile, index) => (
              <span key={profile.type}>
                {index > 0 && ' · '}
                <NameButton name={profile.name} onOpen={() => onOpenProfile(profile)} />
              </span>
            ))}
          </p>
        </div>
      )}
      {about && (
        <details className="e-about">
          <summary>{t.aboutFootballIdeology(match.name)}</summary>
          <p>{about}</p>
        </details>
      )}
    </div>
  );
}
