import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import type { Axis, AxisResult, QuizPayload, QuizResult } from '../../types/quiz';
import { PdfReport } from '../report/PdfReport';
import '../../styles/report.css';
import { AreasSection } from '../results/AreasSection';
import { AxesSection } from '../results/AxesSection';
import { CompareSection, ProfileSheet, type ProfileRef } from '../results/CompareSection';
import { TeamsSection } from '../results/TeamsSection';
import { FootballIdeologiesSection } from '../results/FootballIdeologiesSection';
import { ManagersSection } from '../results/ManagersSection';
import { CompassSection, findCompassAxes } from '../results/CompassSection';
import { PhraseSection } from '../results/PhraseSection';
import { ResultsNav } from '../results/ResultsNav';
import { SignatureSection } from '../results/SignatureSection';
import { NameButton } from '../results/parts';
import { computeCompass } from '../../utils/compass';
import { DownloadIcon, Ring, ShareImageIcon } from './primitives';

interface ResultsScreenProps {
  result: QuizResult;
  quiz: QuizPayload | null;
  axes: Axis[];
  axisResults: Map<string, AxisResult>;
  isSharing: boolean;
  error: string | null;
  onShare: () => void;
}

export function ResultsScreen({ result, quiz, axes, axisResults, isSharing, error, onShare }: ResultsScreenProps) {
  const top = result.topMatch;
  const compass = computeCompass(axisResults);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [profile, setProfile] = useState<ProfileRef | null>(null);

  // O relatório é montado fora da tela; quando imagens e fontes carregam, o diálogo de
  // impressão do navegador gera o PDF. O título da aba vira o nome sugerido do arquivo.
  useEffect(() => {
    if (!printingPdf) {
      return;
    }
    let cancelled = false;
    const previousTitle = document.title;
    const finish = () => {
      document.title = previousTitle;
      setPrintingPdf(false);
    };
    (async () => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('.rp-root img'));
      await Promise.allSettled(images.map((img) => (img.complete ? Promise.resolve() : img.decode())));
      await document.fonts?.ready;
      if (cancelled) {
        return;
      }
      document.title = `${t.report.fileName}-${new Date().toISOString().slice(0, 10)}`;
      window.addEventListener('afterprint', finish, { once: true });
      window.print();
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', finish);
    };
  }, [printingPdf]);

  return (
    <main className="ed e-res" id="resultados">
      <div className="e-wrap e-res-grid">
        <div className="e-res-main">
          <header className="e-res-head">
            <h1>
              {t.resultsH1Pre}
              <span>{t.resultsH1Em}</span>
            </h1>
          </header>

          {top ? (
            <article className="e-panel e-top">
              <div className="e-top-head">
                <div>
                  <span className="e-tag e-tag-solid">{top.category}</span>
                  <h2 className={top.name.length >= 18 ? 'e-long-name' : undefined}>
                    <NameButton
                      name={top.name}
                      onOpen={() => setProfile({ type: 'football-ideology', id: top.footballIdeologyId, name: top.name })}
                    />
                  </h2>
                </div>
                <Ring pct={top.compatibility} size={120} stroke={6} />
              </div>
              <PhraseSection match={top} onOpenProfile={setProfile} />
            </article>
          ) : (
            <p className="e-panel">{t.resultsEmptyCatalog}</p>
          )}

          <AxesSection axes={axes} results={axisResults} />

          <div className="e-actions">
            <button className="e-btn e-btn-ghost" type="button" onClick={onShare} disabled={isSharing}>
              {isSharing ? t.generatingPng : t.saveOrShare} <ShareImageIcon />
            </button>
          </div>

          {result.mostUnusualAxis && result.mostCommonAxis && (
            <SignatureSection unusual={result.mostUnusualAxis} common={result.mostCommonAxis} tension={result.axisTension} axes={axes} results={axisResults} onOpenProfile={setProfile} />
          )}

          {result.topTeamMatch && (
            <TeamsSection
              top={result.topTeamMatch}
              dimensions={result.teamDimensionMatches}
              distant={result.bottomTeamMatches}
              axes={axes}
              results={axisResults}
            />
          )}

          {result.topManagerMatch && (
            <ManagersSection
              top={result.topManagerMatch}
              dimensions={result.managerDimensionMatches}
              distant={result.bottomManagerMatches}
              axes={axes}
              results={axisResults}
            />
          )}

          <AreasSection generalMatches={result.managerMatches} areaMatches={result.categoryBestMatches} axes={axes} results={axisResults} />

          {result.bottomFootballIdeologyMatch && (
            <FootballIdeologiesSection
              others={result.matches.slice(1, 4)}
              distant={result.bottomFootballIdeologyMatch}
              onOpenProfile={setProfile}
            />
          )}

          {compass && <CompassSection position={compass} axes={findCompassAxes(axes)} />}

          <div className="e-actions">
            <button className="e-btn e-btn-primary" type="button" onClick={onShare} disabled={isSharing}>
              {isSharing ? t.generatingPng : t.saveOrShare} <ShareImageIcon />
            </button>
            <button className="e-btn e-btn-ghost" type="button" onClick={() => setPrintingPdf(true)} disabled={printingPdf}>
              {printingPdf ? t.generatingPdf : t.downloadPdf} <DownloadIcon />
            </button>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}

          <CompareSection axes={axes} results={axisResults} />
        </div>

        <aside className="e-side" aria-label={t.resultsSummaryAria}>
          <ResultsNav hasCompass={compass !== null} />
        </aside>
      </div>
      {profile && <ProfileSheet profile={profile} axes={axes} results={axisResults} onClose={() => setProfile(null)} />}
      {printingPdf &&
        createPortal(
          <div className="rp-root" aria-hidden="true">
            <PdfReport
              result={result}
              axes={axes}
              axisResults={axisResults}
              answeredCount={quiz ? quiz.questions.length : null}
            />
          </div>,
          document.body
        )}
    </main>
  );
}
