import { LANG, t } from '../i18n';
import type { AxisExemplars, CompareDetail, CompareItem, CompareType, QuizPayload, QuizResult, QuizVariant, SubmittedAnswer } from '../types/quiz';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Content-Type só quando há corpo: num GET ele transforma a chamada entre origens em uma
  // requisição "não simples", e o navegador gasta uma ida e volta extra (preflight OPTIONS).
  const headers = options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(formatApiError(message, response.status));
  }

  return response.json() as Promise<T>;
}

function formatApiError(message: string, status: number): string {
  if (!message) {
    return t.errHttp(status);
  }

  try {
    const payload = JSON.parse(message) as { error?: unknown; message?: unknown };
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // The backend may return plain text for non-Spring errors.
  }

  return message;
}

// The free Render instance sleeps when idle; pinging it on page load starts it while the visitor reads.
export function wakeBackend(): void {
  fetch(`${API_URL}/api/health`, { mode: 'no-cors' }).catch(() => {});
}

export function fetchQuiz(variant: QuizVariant = 'short'): Promise<QuizPayload> {
  return request<QuizPayload>(`/api/quiz?variant=${variant}&lang=${LANG}`);
}

export function submitResults(
  variant: QuizVariant,
  answers: SubmittedAnswer[],
  archetype: Record<string, string> = {}
): Promise<QuizResult> {
  return request<QuizResult>(`/api/results?lang=${LANG}`, {
    method: 'POST',
    body: JSON.stringify({ variant, answers, archetype })
  });
}

export function fetchSharedResult(leftPercents: number[]): Promise<QuizResult> {
  return request<QuizResult>(`/api/results/by-axes?v=${leftPercents.join(',')}&lang=${LANG}`);
}

export function fetchAxisExemplars(): Promise<AxisExemplars[]> {
  return request<AxisExemplars[]>(`/api/axes/exemplars?lang=${LANG}`);
}

export function fetchCompareCatalog(): Promise<CompareItem[]> {
  return request<CompareItem[]>(`/api/compare/catalog?lang=${LANG}`);
}

export function fetchCompare(type: CompareType, id: string, leftPercents: number[]): Promise<CompareDetail> {
  const values = leftPercents.map((value) => Math.round(value * 10) / 10).join(',');
  return request<CompareDetail>(
    `/api/compare?type=${type}&id=${encodeURIComponent(id)}&v=${values}&lang=${LANG}`
  );
}

interface Described {
  id: string;
  description: string;
}

// Descrições dos três catálogos, chaveadas por "tipo:id" (o catálogo de comparação não as traz).
export async function fetchCatalogDescriptions(): Promise<Map<string, string>> {
  const sources: [CompareType, string][] = [
    ['manager', '/api/managers'],
    ['team', '/api/teams'],
    ['football-ideology', '/api/football-ideologies']
  ];
  const lists = await Promise.all(sources.map(([, path]) => request<Described[]>(`${path}?lang=${LANG}`)));
  const out = new Map<string, string>();
  lists.forEach((list, index) => list.forEach((item) => out.set(`${sources[index][0]}:${item.id}`, item.description)));
  return out;
}
