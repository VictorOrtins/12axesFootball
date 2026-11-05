import { useState, type CSSProperties } from 'react';
import { t } from '../i18n';
import type { AnswerOption, AnswerValue, Axis, Question, QuestionHelp } from '../types/quiz';
import { GlossaryText } from './GlossaryText';
import { InfoButton, InfoSheet } from './results/InfoSheet';

interface QuestionCardProps {
  question: Question;
  axisLabel?: string;
  /** Eixo da pergunta: icone e cor do polo de concordancia no selo. */
  axis?: Axis;
  options: AnswerOption[];
  selected?: AnswerValue;
  disabled?: boolean;
  onSelect: (answer: AnswerValue) => void;
}

export function QuestionCard({ question, axisLabel, axis, options, selected, disabled = false, onSelect }: QuestionCardProps) {
  const [isAxisInfoOpen, setIsAxisInfoOpen] = useState(false);
  const agreeColor = axis && (question.agreePole === 'LEFT' ? axis.leftColor : axis.rightColor);

  return (
    <article className="qz" aria-labelledby="question-title">
      <header className="qz-head">
        {axis ? (
          <div className="qz-tagrow">
            <p className="qz-tag" style={{ '--pole': agreeColor } as CSSProperties}>
              {question.agreePole === 'LEFT' ? axis.leftPole : axis.rightPole}
            </p>
            <InfoButton label={question.help ? t.questionHelpAria : t.axisInfoAria(axis.label)} onClick={() => setIsAxisInfoOpen(true)} />
          </div>
        ) : (
          <p className="qz-tag">{axisLabel ?? question.axisId.replace('-', ' ')}</p>
        )}
        <h2 id="question-title" className="qz-title"><span><GlossaryText key={question.text} text={question.text} terms={question.terms} /></span></h2>
      </header>
      <div className="qz-answers" role="radiogroup" aria-label={t.answersAria}>
        {options.map((option) => {
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
              {option.label}
            </button>
          );
        })}
      </div>
      {axis && isAxisInfoOpen && (
        <InfoSheet
          titleId="quiz-axis-sheet-title"
          className={question.help ? 'e-question-sheet' : undefined}
          style={{ '--ac': agreeColor } as CSSProperties}
          onClose={() => setIsAxisInfoOpen(false)}
        >
          {question.help ? (
            <QuestionHelpContent help={question.help} />
          ) : (
            <>
              <p className="e-axis-sheet-label">{axis.label}</p>
              <h3 id="quiz-axis-sheet-title">
                {question.agreePole === 'LEFT' ? (
                  <><span>{axis.leftPole}</span> × {axis.rightPole}</>
                ) : (
                  <>{axis.leftPole} × <span>{axis.rightPole}</span></>
                )}
              </h3>
              <p className="e-axis-sheet-text">{t.axisExplanations[axis.id]}</p>
            </>
          )}
        </InfoSheet>
      )}
    </article>
  );
}

// O que concordar e discordar significam; a nota avisa quem pensa fora do enquadramento da pergunta.
function QuestionHelpContent({ help }: { help: QuestionHelp }) {
  const sides = [
    { key: 'agree', label: t.questionHelpAgree, text: help.agree },
    { key: 'disagree', label: t.questionHelpDisagree, text: help.disagree }
  ];
  return (
    <>
      <h3 id="quiz-axis-sheet-title">{t.questionHelpTitle}</h3>
      <div className="e-question-sides">
        {sides.map((side) => (
          <section key={side.key} className={`e-question-side is-${side.key}`}>
            <h4>
              <i aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d={side.key === 'agree' ? 'm6 12 4 4 8-8' : 'm7 7 10 10M17 7 7 17'} />
                </svg>
              </i>
              {side.label}
            </h4>
            <p>{side.text}</p>
          </section>
        ))}
      </div>
      {help.note && (
        <p className="e-question-note"><strong>{t.questionHelpNote}:</strong> {help.note}</p>
      )}
    </>
  );
}
