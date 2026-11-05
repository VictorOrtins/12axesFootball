import type { ArchetypeQuestion } from '../types/quiz';

interface ArchetypeCardProps {
  question: ArchetypeQuestion;
  selected?: string;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
}

/** Pergunta de arquétipo do fim do quiz: uma escolha entre as alternativas. */
export function ArchetypeCard({ question, selected, disabled = false, onSelect }: ArchetypeCardProps) {
  return (
    <article className="qz" aria-labelledby="archetype-title">
      <header className="qz-head">
        <p className="qz-tag">{question.label}</p>
        <h2 id="archetype-title" className="qz-title"><span>{question.text}</span></h2>
      </header>
      <div className="qz-answers" role="radiogroup" aria-label={question.text}>
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              className={isSelected ? 'qz-answer is-selected' : 'qz-answer'}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option.id)}
            >
              {option.text}
            </button>
          );
        })}
      </div>
    </article>
  );
}
