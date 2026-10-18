export type AnswerValue =
  | 'STRONGLY_AGREE'
  | 'AGREE'
  | 'NEUTRAL'
  | 'DISAGREE'
  | 'STRONGLY_DISAGREE';

export type Pole = 'LEFT' | 'RIGHT';

export type QuizVariant = 'short' | 'extended';

export interface Axis {
  id: string;
  label: string;
  leftPole: string;
  rightPole: string;
  leftColor: string;
  rightColor: string;
}

/** Termo do glossário no texto da pergunta: `start`/`end` são índices (UTF-16) em `text`. */
export interface QuestionTerm {
  start: number;
  end: number;
  term: string;
  definition: string;
}

/** O que significa concordar e discordar; `note` avisa quem pensa fora do enquadramento da pergunta. */
export interface QuestionHelp {
  agree: string;
  disagree: string;
  note?: string | null;
}

export interface Question {
  id: string;
  axisId: string;
  text: string;
  agreePole: Pole;
  weight: number;
  secondary?: { axisId: string; agreePole: Pole; weight: number } | null;
  terms?: QuestionTerm[];
  help?: QuestionHelp | null;
}

export interface AnswerOption {
  id: AnswerValue;
  label: string;
  scoreTowardAgreement: number;
}

export interface QuizPayload {
  title: string;
  description: string;
  variant: QuizVariant;
  questionCount: number;
  questionsPerAxis: number;
  axes: Axis[];
  questions: Question[];
  answerOptions: AnswerOption[];
  /** Perguntas de arquétipo exibidas ao fim do quiz (cada alternativa pontua em vários eixos). */
  archetypeQuestions?: ArchetypeQuestion[];
}

/** Ícone preenchido (mesmo formato de data/filledPoleIcons.ts). */
export interface QuestionIcon {
  viewBox: string;
  paths: string[];
  fillRule?: 'evenodd' | 'nonzero';
}

export interface ArchetypeQuestion {
  id: string;
  label: string;
  text: string;
  /** Selo do cabeçalho; sem ele, usa o ícone do tema pelo id. */
  icon?: QuestionIcon;
  /** Com icon, a alternativa mostra o ícone no lugar da letra. */
  options: { id: string; text: string; icon?: QuestionIcon }[];
  /** "tiles": alternativas em botões numa grade (3 colunas no desktop, 2 no mobile). Padrão: lista. */
  layout?: 'list' | 'tiles';
}

export interface SubmittedAnswer {
  questionId: string;
  answer: AnswerValue;
}

export interface AxisResult {
  axisId: string;
  label: string;
  leftPole: string;
  rightPole: string;
  leftPercent: number;
  rightPercent: number;
  dominantPole: string;
  intensity: string;
}

export interface FootballIdeologyMatch {
  footballIdeologyId: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  phrase: string;
  compatibility: number;
}

export interface TeamMatch {
  teamId: string;
  name: string;
  category: string;
  description: string;
  period: string;
  imagePath?: string | null;
  imageSourceName?: string;
  imageSourceUrl?: string;
  imageNote?: string;
  compatibility: number;
  /** Vetor de 12 eixos (leftPercent) do time. */
  vector?: Record<string, number>;
}

export interface ManagerMatch {
  managerId: string;
  name: string;
  category: string;
  period: string;
  description: string;
  imagePath?: string | null;
  imageSourceName?: string;
  imageSourceUrl?: string;
  imageNote?: string;
  compatibility: number;
  /** Vetor de 12 eixos (leftPercent) do treinador. */
  vector?: Record<string, number>;
}

export interface AxisOutlier {
  axisId: string;
  label: string;
  userPercent: number;
  catalogMedian: number;
  distanceFromMedian: number;
  dominantPole: string | null;
  balanced: boolean;
  abovePole: string;
  abovePercent: number;
}

export interface AxisTension {
  firstAxisLabel: string;
  firstPole: string;
  secondAxisLabel: string;
  secondPole: string;
  matchingFootballIdeologies: number;
  catalogSize: number;
  examples: string[];
}

export type ProfileDimension = 'tactics' | 'philosophy' | 'management';

export interface ManagerDimensionMatch {
  dimension: ProfileDimension;
  match: ManagerMatch;
}

export interface TeamDimensionMatch {
  dimension: ProfileDimension;
  match: TeamMatch;
}

/** Com um catálogo vazio, os destaques dele vêm null e as listas vazias. */
export interface QuizResult {
  axes: AxisResult[];
  topMatch: FootballIdeologyMatch | null;
  matches: FootballIdeologyMatch[];
  bottomFootballIdeologyMatch: FootballIdeologyMatch | null;
  topTeamMatch: TeamMatch | null;
  topTeamMatches: TeamMatch[];
  teamDimensionMatches: TeamDimensionMatch[];
  bottomTeamMatches: TeamMatch[];
  topManagerMatch: ManagerMatch | null;
  managerMatches: ManagerMatch[];
  managerDimensionMatches: ManagerDimensionMatch[];
  categoryBestMatches: ManagerMatch[];
  bottomManagerMatches: ManagerMatch[];
  mostUnusualAxis: AxisOutlier | null;
  mostCommonAxis: AxisOutlier | null;
  // null quando o perfil nao contraria padrao nenhum (moderados).
  axisTension: AxisTension | null;
}

export type CompareType = 'manager' | 'team' | 'football-ideology';

/** Perfil pesquisável na seção de comparação. */
export interface CompareItem {
  type: CompareType;
  id: string;
  name: string;
  caption: string;
  /** Foto (treinador) ou escudo (time); ausente nas ideias de jogo. */
  imagePath?: string | null;
  category: string;
}

export interface CompareDetail {
  item: CompareItem;
  description: string;
  compatibility: number;
  /** Vetor de 12 eixos (leftPercent) do perfil comparado. */
  vector: Record<string, number>;
}
