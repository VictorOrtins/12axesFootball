import type { ReactNode } from 'react';
import { t } from '../../i18n';
import type { Axis, QuizVariant } from '../../types/quiz';
import { QUIZ_FORMATS } from './formats';
import { ArrowIcon, ClockIcon, PitchMarkings } from './primitives';

interface HomeScreenProps {
  axes: Axis[];
  showBelowFold: boolean;
  onOpenChooser: () => void;
  onOpenAxes: () => void;
  onStart: (variant: QuizVariant) => void;
}

const DISCOVERY_ICONS: Record<string, ReactNode> = {
  footballIdeology: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M4 19a2 2 0 0 1 2-2h13" />
      <path d="M9 7h6" />
    </>
  ),
  team: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
      <path d="M12 3v18" />
    </>
  ),
  manager: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  profile: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 17a3.5 3.5 0 0 1 7 0" />
      <path d="M15 10h3" />
      <path d="M15 14h3" />
    </>
  ),
  compatibility: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  )
};

export function HomeScreen({ axes, showBelowFold, onOpenChooser, onOpenAxes, onStart }: HomeScreenProps) {
  return (
    <div className="ed">
      <section className="e-hero" id="inicio">
        <PitchMarkings withBall />
        <div className="e-wrap">
          <div>
            <h1>
              {t.h1Pre}
              <span className="e-accent">
                {t.h1Em}
                {t.h1Post}
              </span>
            </h1>
            <p className="e-lead">{t.introLead}</p>
            <div className="e-hero-actions">
              <button className="e-btn e-btn-primary" type="button" onClick={onOpenChooser}>
                {t.startQuiz} <ArrowIcon />
              </button>
              <a
                className="e-btn e-btn-ghost"
                href="/axes"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenAxes();
                }}
              >
                {t.seeAxes}
              </a>
            </div>
          </div>
        </div>
      </section>

      {showBelowFold && (
        <>
          <section className="e-sec" id="descubra" style={{ paddingTop: 24 }}>
            <div className="e-wrap" data-reveal>
              <div className="e-split-head">
                <div>
                  <h2>{t.discoveryTitle}</h2>
                </div>
                <p className="e-lead">{t.discoveryLead}</p>
              </div>
              <ul className="e-disc-list">
                {t.discoveryItems.map((item) => (
                  <li className="e-disc-item" key={item.title}>
                    <svg className="e-ico" viewBox="0 0 24 24" aria-hidden="true">
                      {DISCOVERY_ICONS[item.icon]}
                    </svg>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="e-sec e-dark" id="como-funciona">
            <div className="e-wrap" data-reveal>
              <div className="e-sec-head">
                <h2>{t.howTitle}</h2>
                <p className="e-lead">{t.howLead}</p>
              </div>
              <ol className="e-steps">
                {t.steps.map((step, index) => (
                  <li className="e-step" key={step.title}>
                    <span className="e-n">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="e-sec" id="guia-eixos">
            <div className="e-wrap" data-reveal>
              <div className="e-split-head">
                <div>
                  <h2>{t.axesGuideTitle}</h2>
                </div>
                <p className="e-lead">{t.axesGuideLead}</p>
              </div>
              <ol className="e-axes-mini">
                {axes.map((axis, index) => (
                  <li key={axis.id}>
                    <span className="e-num">{String(index + 1).padStart(2, '0')}</span>
                    <strong>{axis.label}</strong>
                    <span className="e-poles">
                      {axis.leftPole} <em>↔</em> {axis.rightPole}
                    </span>
                  </li>
                ))}
              </ol>
              <a
                className="e-btn e-btn-primary"
                href="/axes"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenAxes();
                }}
              >
                {t.homeAxesMore}
              </a>
            </div>
          </section>

          <section className="e-sec e-dark" id="versoes">
            <div className="e-wrap" data-reveal>
              <div className="e-sec-head">
                <h2>{t.versionsTitle}</h2>
                <p className="e-lead">{t.versionsLead}</p>
              </div>
              <ul className="e-ver-grid">
                {QUIZ_FORMATS.map((format) => (
                  <li className={format.featured ? 'e-ver-card e-hi' : 'e-ver-card'} key={format.variant}>
                    <div className="e-ver-top">
                      <span className="e-ver-tag">{format.label}</span>
                      {format.featured && <span className="e-rec">{t.recommended}</span>}
                    </div>
                    <p className="e-ver-num">
                      <strong>{format.count}</strong> {format.countWord}
                    </p>
                    <p className="e-ver-desc">{format.description}</p>
                    <p className="e-ver-time">
                      <ClockIcon />
                      {format.duration}
                    </p>
                    <button
                      className={format.featured ? 'e-btn e-btn-light' : 'e-btn e-btn-primary'}
                      type="button"
                      onClick={() => onStart(format.variant)}
                    >
                      {format.action}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
