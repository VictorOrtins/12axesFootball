import type { AnswerValue, QuizPayload, QuizVariant } from '../types/quiz';

// Progresso do quiz guardado no navegador: se a aba recarregar, travar ou
// quebrar no meio, a pessoa continua de onde parou em vez de recomeçar.
const STORAGE_KEY = '12axes-progress';
// v3: quiz de futebol. Progresso de versões anteriores (quiz político) é descartado.
const VERSION = 3;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type ProgressStage = 'quiz' | 'archetype';

export interface SavedProgress {
  v: number;
  variant: QuizVariant;
  /** Ordem das perguntas sorteada nesta tentativa, para reconstruir a mesma sequência. */
  questionIds: string[];
  answers: Record<string, AnswerValue>;
  archetypeChoices: Record<string, string>;
  stage: ProgressStage;
  /** Índice da pergunta (stage quiz) ou da pergunta de arquétipo (stage archetype). */
  index: number;
  savedAt: number;
}

const ANSWER_VALUES: ReadonlySet<string> = new Set([
  'STRONGLY_AGREE',
  'AGREE',
  'NEUTRAL',
  'DISAGREE',
  'STRONGLY_DISAGREE'
]);

const VARIANTS: ReadonlySet<string> = new Set(['short', 'extended']);

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

// Valida o que veio do disco: dado antigo, editado à mão ou de outra versão é descartado.
export function parseProgress(raw: string | null, now = Date.now()): SavedProgress | null {
  if (!raw) {
    return null;
  }
  try {
    const data = JSON.parse(raw) as Partial<SavedProgress> | null;
    if (!data || typeof data !== 'object' || data.v !== VERSION) {
      return null;
    }
    if (typeof data.savedAt !== 'number' || now - data.savedAt > MAX_AGE_MS || data.savedAt > now + 60_000) {
      return null;
    }
    if (typeof data.variant !== 'string' || !VARIANTS.has(data.variant)) {
      return null;
    }
    if (data.stage !== 'quiz' && data.stage !== 'archetype') {
      return null;
    }
    if (!Array.isArray(data.questionIds) || data.questionIds.length === 0 || !data.questionIds.every((id) => typeof id === 'string')) {
      return null;
    }
    if (!Number.isInteger(data.index) || (data.index as number) < 0) {
      return null;
    }
    if (!isRecordOfStrings(data.answers) || !Object.values(data.answers).every((answer) => ANSWER_VALUES.has(answer))) {
      return null;
    }
    if (!isRecordOfStrings(data.archetypeChoices)) {
      return null;
    }
    return data as SavedProgress;
  } catch {
    return null;
  }
}

export function loadProgress(): SavedProgress | null {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveProgress(progress: Omit<SavedProgress, 'v' | 'savedAt'>): void {
  try {
    const payload: SavedProgress = { ...progress, v: VERSION, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage indisponível ou cheio: o quiz segue funcionando, só sem retomada.
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a limpar.
  }
}

export function answeredCount(progress: SavedProgress): number {
  return progress.questionIds.filter((id) => progress.answers[id]).length;
}

// Remonta o quiz com as mesmas perguntas, na mesma ordem. Se alguma pergunta não
// existe mais (conteúdo mudou depois de um deploy), não dá para retomar com
// segurança e devolve null.
export function restoreQuiz(payload: QuizPayload, progress: SavedProgress): QuizPayload | null {
  const byId = new Map(payload.questions.map((question) => [question.id, question]));
  const questions = progress.questionIds.map((id) => byId.get(id));
  if (questions.some((question) => !question)) {
    return null;
  }
  return {
    ...payload,
    variant: progress.variant,
    questions: questions as QuizPayload['questions'],
    questionCount: questions.length
  };
}

// Último resultado terminado: os 12 leftPercents bastam para reconstruí-lo via /results?...
const LAST_RESULT_KEY = '12axes-last-result';
const AXIS_COUNT = 12;

export function parseLastResult(raw: string | null): number[] | null {
  if (!raw) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || data.length !== AXIS_COUNT) {
      return null;
    }
    const valid = data.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100);
    return valid ? (data as number[]) : null;
  } catch {
    return null;
  }
}

export function loadLastResult(): number[] | null {
  try {
    return parseLastResult(window.localStorage.getItem(LAST_RESULT_KEY));
  } catch {
    return null;
  }
}

export function saveLastResult(leftPercents: number[]): void {
  try {
    window.localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(leftPercents));
  } catch {
    // localStorage indisponível: o resultado só não fica guardado.
  }
}
