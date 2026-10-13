import { t } from '../../i18n';
import type { FootballIdeologyMatch } from '../../types/quiz';

// Dentro do cartao da ideia de jogo do topo: a frase curada (uma por ideia) e,
// recolhida, a descricao longa.
export function PhraseSection({ match }: { match: FootballIdeologyMatch }) {
  const about = match.longDescription || match.description;

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
      {about && (
        <details className="e-about">
          <summary>{t.aboutFootballIdeology(match.name)}</summary>
          <p>{about}</p>
        </details>
      )}
    </div>
  );
}
