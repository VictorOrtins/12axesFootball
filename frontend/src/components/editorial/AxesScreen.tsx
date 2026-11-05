import { useEffect, useState, type CSSProperties } from 'react';
import { t } from '../../i18n';
import { fetchAxisExemplars } from '../../services/quizApi';
import type { Axis, AxisExemplar, AxisExemplars } from '../../types/quiz';
import { ProfileFace } from '../results/CompareSection';

interface AxesScreenProps {
  axes: Axis[];
  onOpenManager: (id: string) => void;
  onStartQuiz: () => void;
}

type Side = 'left' | 'right';

type Exemplars = Record<string, AxisExemplars> | 'loading' | 'error';

function ExemplarList({ people, side, onOpen }: { people: AxisExemplar[] | 'loading' | 'error'; side: Side; onOpen: (id: string) => void }) {
  if (people === 'loading') return <p className="e-ax-none">{t.axesPageLoading}</p>;
  if (people === 'error') return <p className="e-ax-none">{t.axesPageError}</p>;
  if (people.length === 0) return <p className="e-ax-none">{t.axesPageNoExamples}</p>;
  return (
    <ul className="e-ax-people">
      {people.map((person) => {
        const lean = Math.round(side === 'left' ? person.leftPercent : 100 - person.leftPercent);
        return (
          <li key={person.id}>
            <a
              href={`/catalog/manager/${person.id}`}
              onClick={(event) => {
                event.preventDefault();
                onOpen(person.id);
              }}
            >
              <ProfileFace
                className="e-ax-face"
                item={{ type: 'manager', id: person.id, name: person.name, caption: '', imagePath: person.imagePath, category: '' }}
              />
              <span className="e-ax-who">
                <strong>{person.name}</strong>
                <span>{person.period}</span>
              </span>
              <span className="e-ax-lean">{t.axesPageLean(lean)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function PoleColumn({ axis, side, people, onOpen }: { axis: Axis; side: Side; people: AxisExemplar[] | 'loading' | 'error'; onOpen: (id: string) => void }) {
  const name = side === 'left' ? axis.leftPole : axis.rightPole;
  const color = side === 'left' ? axis.leftColor : axis.rightColor;
  return (
    <div className="e-ax-pole" style={{ '--pole': color } as CSSProperties}>
      <h3>{name}</h3>
      <p>{t.axisPoles[axis.id]?.[side]}</p>
      <p className="e-ax-label">{t.axesPageExamples}</p>
      <ExemplarList people={people} side={side} onOpen={onOpen} />
    </div>
  );
}

export function AxesScreen({ axes, onOpenManager, onStartQuiz }: AxesScreenProps) {
  const [exemplars, setExemplars] = useState<Exemplars>('loading');

  useEffect(() => {
    let active = true;
    fetchAxisExemplars()
      .then((list) => active && setExemplars(Object.fromEntries(list.map((entry) => [entry.axisId, entry]))))
      .catch(() => active && setExemplars('error'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="ed e-axes-page">
      <section className="e-sec">
        <div className="e-wrap">
          <header className="e-ax-intro">
            <h1>{t.axesPageTitle}</h1>
            <p className="e-lead">{t.axesPageLead}</p>
          </header>
          <nav className="e-ax-index" aria-label={t.axesPageIndexAria}>
            {axes.map((axis, index) => (
              <a key={axis.id} href={`#eixo-${axis.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {axis.label}
              </a>
            ))}
          </nav>
          {axes.map((axis, index) => {
            const people = (side: Side) => (typeof exemplars === 'string' ? exemplars : (exemplars[axis.id]?.[side] ?? []));
            return (
              <article className="e-ax" id={`eixo-${axis.id}`} key={axis.id}>
                <header className="e-ax-head">
                  <span className="e-num">{String(index + 1).padStart(2, '0')}</span>
                  <h2>{axis.label}</h2>
                </header>
                <p className="e-ax-text">{t.axisExplanations[axis.id]}</p>
                <div className="e-ax-poles">
                  <PoleColumn axis={axis} side="left" people={people('left')} onOpen={onOpenManager} />
                  <PoleColumn axis={axis} side="right" people={people('right')} onOpen={onOpenManager} />
                </div>
              </article>
            );
          })}
          <aside className="e-ax-cta">
            <h2>{t.axesPageCtaTitle}</h2>
            <p>{t.axesPageCtaText}</p>
            <button className="e-btn e-btn-primary" type="button" onClick={onStartQuiz}>
              {t.startQuiz}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
