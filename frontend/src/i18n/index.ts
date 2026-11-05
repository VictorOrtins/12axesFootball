// Dicionário de UI PT/EN. O idioma é resolvido uma vez por carga de página
// (?lang → localStorage → navigator) e trocar de idioma recarrega a página,
// para que quiz e resultados sejam rebuscados já no idioma novo.
import type { ProfileDimension } from '../types/quiz';

export type Lang = 'pt' | 'en';

const STORAGE_KEY = '12axes-lang';

// Idioma forçado pelo caminho: /en sempre inglês, /br sempre português,
// independente do aparelho ou da preferência salva.
function langForcedByPath(pathname: string): Lang | null {
  const path = (pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/');
  if (path === '/en') return 'en';
  if (path === '/br') return 'pt';
  return null;
}

export function resolveLang(): Lang {
  if (typeof window === 'undefined') {
    return 'pt';
  }
  const forced = langForcedByPath(window.location.pathname);
  if (forced) {
    return forced;
  }
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'pt' || fromUrl === 'en') {
    window.localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt' || stored === 'en') {
    return stored;
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export const LANG: Lang = resolveLang();

export function setLang(lang: Lang) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  const url = new URL(window.location.href);
  url.searchParams.delete('lang');
  // Em /en ou /br a URL é o que define o idioma, então o toggle troca de rota.
  if (langForcedByPath(url.pathname)) {
    url.pathname = lang === 'en' ? '/en' : '/br';
  }
  if (url.toString() === window.location.href) {
    window.location.reload();
    return;
  }
  window.location.href = url.toString();
}

interface QuizFormatStrings {
  label: string;
  questionCount: string;
  description: string;
  duration: string;
  action: string;
}

interface Strings {
  htmlLang: string;
  docTitle: string;
  loadingAnalysis: string;
  loadingQuiz: string;
  loadingResult: string;
  tryAgain: string;
  crashTitle: string;
  crashBody: string;
  crashBodyWithProgress: string;
  crashReload: string;
  resumeEyebrow: string;
  resumeTitle: string;
  resumeBody: (answered: number, total: number) => string;
  resumeContinue: string;
  resumeDiscard: string;
  lastResultEyebrow: string;
  lastResultTitle: string;
  lastResultBody: string;
  lastResultOpen: string;
  resumeUnavailable: string;
  skipToContent: string;
  backToStartAria: string;
  mainNavAria: string;
  navHow: string;
  navAxes: string;
  navCatalog: string;
  catalogTitle: string;
  catalogHome: string;
  catalogLeads: Record<'manager' | 'team' | 'football-ideology', (n: number) => string>;
  catalogStats: [string, string, string];
  catalogViewProfile: string;
  catalogFilterAria: string;
  catalogTabManagers: string;
  catalogTabTeams: string;
  catalogTabIdeologies: string;
  catalogSearchLabel: string;
  catalogSearchPlaceholder: string;
  catalogCount: (n: number) => string;
  catalogEmpty: string;
  catalogError: string;
  catalogLoading: string;
  profile: {
    tabsAria: string;
    tabs: { axes: string; ideologies: string; managers: string; teams: string };
    kpiIdeology: string;
    kpiManager: string;
    kpiTeam: string;
    axesTitle: string;
    distinctTitle: (name: string) => string;
    rareTag: string;
    commonTag: string;
    rareText: (name: string, pole: string, percent: number) => string;
    rareNote: (axis: string, name: string) => string;
    commonText: (name: string) => string;
    ideologiesTitle: (name: string) => string;
    managersTitle: string;
    teamsTitle: string;
    mostCompatible: string;
    matchWord: string;
    byDimension: string;
    similar: string;
    distant: (name: string) => string;
    ctaTitle: string;
    ctaText: (name: string) => string;
    ctaButton: string;
    imageSource: string;
  };
  langToggleLabel: string;
  langToggleAria: string;
  redoQuiz: string;
  restartQuiz: string;
  h1Pre: string;
  h1Em: string;
  h1Post: string;
  introLead: string;
  startQuiz: string;
  seeAxes: string;
  formats: { short: QuizFormatStrings; extended: QuizFormatStrings };
  axisExplanations: Record<string, string>;
  axisPoles: Record<string, { left: string; right: string }>;
  axesPageTitle: string;
  axesPageLead: string;
  axesPageExamples: string;
  axesPageNoExamples: string;
  axesPageLean: (percent: number) => string;
  axesPageLoading: string;
  axesPageError: string;
  axesPageCtaTitle: string;
  axesPageCtaText: string;
  axesPageIndexAria: string;
  homeAxesMore: string;
  axisInfoAria: (label: string) => string;
  questionHelpAria: string;
  themeToDarkAria: string;
  themeToLightAria: string;
  questionHelpTitle: string;
  questionHelpAgree: string;
  questionHelpDisagree: string;
  questionHelpNote: string;
  closeLabel: string;
  managerInfoAria: (name: string) => string;
  closenessTitle: string;
  closenessYou: string;
  compareEyebrow: string;
  compareTitle: string;
  compareLead: string;
  compareSearchLabel: string;
  compareSearchPlaceholder: string;
  compareView: string;
  compareAxesTitle: string;
  compareNoResults: string;
  compareLoading: string;
  compareLoadError: string;
  compareTypeLabels: Record<'manager' | 'team' | 'football-ideology', string>;
  compareAxisAdverbs: Partial<Record<string, string>>;
  compareClosestLine: (adverb: string, name: string) => string;
  compareFarthestLine: (adverb: string, name: string) => string;
  compareClosestFallback: (axis: string, name: string) => string;
  compareFarthestFallback: (axis: string, name: string) => string;
  compareIdentical: (name: string) => string;
  compareNearestLine: (axis: string, name: string) => string;
  compareNoFarLine: (name: string) => string;
  compareValues: (pole: string, you: number, them: number, name: string) => string;
  compareOptionAria: (name: string, type: string) => string;
  homeAxes: Record<string, { label: string; leftPole: string; rightPole: string }>;
  howTitle: string;
  howLead: string;
  steps: { title: string; text: string }[];
  axesGuideTitle: string;
  axesGuideLead: string;
  discoveryTitle: string;
  discoveryLead: string;
  discoveryItems: { icon: string; title: string; text: string }[];
  navStart: string;
  menuAria: string;
  roseAria: string;
  versionsTitle: string;
  versionsLead: string;
  variantEyebrow: string;
  variantTitlePre: string;
  variantTitleEm: string;
  backToStart: string;
  depthLabel: string;
  depthAria: (level: number) => string;
  recommended: string;
  formatNotes: string[];
  variantLead: string;
  quizNavAria: string;
  back: string;
  calculating: string;
  seeResult: string;
  archetypeSkip: string;
  errMissingAnswer: string;
  errLoadQuiz: string;
  errCalc: string;
  errImage: string;
  errHttp: (status: number) => string;
  resultsH1Pre: string;
  resultsH1Em: string;
  resultsLead: (count: number) => string;
  resultsLeadShared: string;
  resultsSummaryAria: string;
  resultsEmptyCatalog: string;
  metaTop: string;
  axesSectionEyebrow: string;
  axesSectionTitle: string;
  proximityEyebrow: string;
  otherMatches: string;
  navOnThisPage: string;
  resultsNavAxes: string;
  resultsNavSignature: string;
  resultsNavTeams: string;
  resultsNavManagers: string;
  resultsNavCategories: string;
  resultsNavFootballIdeologies: string;
  resultsNavCompass: string;
  compassTitle: string;
  compassWith: string;
  compassBalanced: (axis: string) => string;
  compassInfo: {
    aria: string;
    title: string;
    xText: string;
    yText: string;
    stripText: string;
  };
  compassAria: (counter: number, deep: number, result: number) => string;
  teamsSectionTitle: string;
  teamsDistantTitle: string;
  managersSectionTitle: string;
  dimensionsTitle: string;
  dimensionLabels: Record<ProfileDimension, string>;
  areasGeneralTitle: string;
  areasSectionTitle: string;
  areasTabsAria: string;
  areasGeneralTab: string;
  areasByAreaTab: string;
  managersDistantTitle: string;
  footballIdeologyDistantTitle: string;
  phraseTitle: string;
  phraseNote: (idea: string) => string;
  aboutFootballIdeology: (idea: string) => string;
  exemplarsTitle: string;
  knowMoreAbout: (name: string) => string;
  showLess: string;
  matchTopKicker: string;
  dimensionsTitleShort: string;
  signatureTitle: string;
  signatureUnusualLabel: string;
  signatureCommonLabel: string;
  signatureUnusualLead: (pole: string, percent: number) => string;
  signatureUnusualLeadMax: (pole: string) => string;
  signatureUnusualLeadBalanced: (axis: string, pole: string, percent: number) => string;
  signatureUnusualNote: (axis: string) => string;
  signatureCommonLead: (axis: string) => string;
  signatureCommonNote: (pole: string) => string;
  signatureCommonNoteBalanced: (axis: string) => string;
  tensionLabel: string;
  tensionCombo: (firstPole: string, secondPole: string) => string;
  tensionRare: (count: number, total: number) => string;
  tensionUnique: string;
  tensionExamples: (names: string) => string;
  tensionNote: (firstAxis: string, secondAxis: string) => string;
  signatureMedian: string;
  signatureYou: string;
  signatureBigCap: (pole: string) => string;
  signatureAtMedian: string;
  signatureAtCentre: string;
  tensionRareShort: (count: number, total: number) => string;
  /** Nome exibido de cada categoria de treinador; sem entrada, mostra a categoria como veio da API. */
  managerCategories: Record<string, string>;
  futPosition: string;
  futOpenAria: (name: string, rating: number) => string;
  pesPrev: string;
  pesNext: string;
  pesStarsAria: (stars: number) => string;
  pesPickAria: (label: string, name: string) => string;
  similarityNote: string;
  matchShort: string;
  agreeTitle: string;
  pesKeysHint: string;
  redoAnalysis: string;
  share: string;
  saveOrShare: string;
  generatingPng: string;
  downloadPdf: string;
  generatingPdf: string;
  report: {
    fileName: string;
    docLabel: string;
    profileEyebrow: string;
    headerLabel: (idea: string) => string;
    kpiTeam: string;
    kpiManager: string;
    kpiAxes: string;
    kpiAnswered: (count: number) => string;
    tocTitle: string;
    generatedOn: (date: string) => string;
    axesIntro: string;
    intensityLegend: string;
    intensityLevels: [string, string, string, string];
    alsoClose: string;
    continued: string;
    areasIntro: string;
    aboutTitle: string;
    aboutText: string;
    ctaTitle: string;
  };
  shareFilePrefix: string;
  shareMessage: (
    idea: string,
    ideaPct: number,
    team: string,
    teamPct: number,
    manager: string,
    managerPct: number
  ) => string;
  progress: (current: number, total: number) => string;
  archetypeStep: (current: number, total: number) => string;
  progressAria: (percent: number) => string;
  answersAria: string;
  teamKicker: string;
  crestAlt: (name: string) => string;
  crestUnavailable: string;
  crestUnavailableAria: (name: string) => string;
  managerKicker: string;
  portraitAlt: (name: string) => string;
  portraitUnavailableAria: (name: string) => string;
  compatibilityAria: (pct: string) => string;
  matchWord: string;
  compatibilityLevels: { veryHigh: string; high: string; medium: string; low: string; veryLow: string };
  shareTitle: string;
  shareTopMatch: string;
  shareTeam: string;
  shareManager: string;
  shareResultLabel: string;
  shareMostCompatible: string;
  shareYourAxes: string;
  shareOtherManagers: string;
  shareNearbyTeams: string;
  shareFooterCta: string;
  shareFooterUrl: string;
  feedbackTitle: string;
  feedbackReport: string;
  feedbackSuggest: string;
}

const pt: Strings = {
  htmlLang: 'pt-BR',
  docTitle: '12 Axes Football — Quiz de Filosofia de Futebol em 12 Eixos',
  loadingAnalysis: 'Carregando análise...',
  loadingQuiz: 'Carregando quiz...',
  loadingResult: 'Carregando resultado...',
  tryAgain: 'Tentar novamente',
  crashTitle: 'Algo deu errado',
  crashBody: 'A página encontrou um erro inesperado. Recarregue para tentar de novo.',
  crashBodyWithProgress: 'A página encontrou um erro inesperado, mas suas respostas estão guardadas. Recarregue e escolha continuar de onde parou.',
  crashReload: 'Recarregar a página',
  resumeEyebrow: 'Quiz em andamento',
  resumeTitle: 'Continue de onde parou',
  resumeBody: (answered, total) => `Você já respondeu ${answered} de ${total} perguntas. Suas respostas estão guardadas neste navegador.`,
  resumeContinue: 'Continuar',
  resumeDiscard: 'Começar de novo',
  lastResultEyebrow: 'Seu último resultado',
  lastResultTitle: 'Veja de novo o seu perfil',
  lastResultBody: 'O resultado do seu último quiz ficou guardado neste navegador.',
  lastResultOpen: 'Ver resultado',
  resumeUnavailable: 'Não foi possível retomar o quiz anterior. Comece um novo.',
  skipToContent: 'Pular para o conteúdo',
  backToStartAria: 'Voltar para o início',
  mainNavAria: 'Navegação principal',
  navHow: 'Como funciona',
  navAxes: '12 Eixos',
  navCatalog: 'Catálogo',
  catalogTitle: 'Catálogo',
  catalogHome: 'Início',
  catalogLeads: {
    manager: (n) => `${n} treinadores mapeados pelo 12 Axes, organizados pelo estilo de jogo. Cada um tem foto, resumo da carreira e perfil completo nos 12 eixos.`,
    team: (n) => `${n} times, cada um num período definido, com escudo, resumo e perfil completo nos 12 eixos.`,
    'football-ideology': (n) => `${n} ideias e escolas de jogo, das origens do futebol aos dias de hoje, cada uma com perfil completo nos 12 eixos.`
  },
  catalogStats: ['perfis', 'categorias', 'eixos por perfil'],
  catalogViewProfile: 'Ver perfil',
  catalogFilterAria: 'Filtrar por categoria',
  catalogTabManagers: 'Treinadores',
  catalogTabTeams: 'Times',
  catalogTabIdeologies: 'Ideias de jogo',
  catalogSearchLabel: 'Buscar no catálogo',
  catalogSearchPlaceholder: 'Buscar por nome',
  catalogCount: (n) => (n === 1 ? '1 perfil' : `${n} perfis`),
  catalogEmpty: 'Nenhum perfil encontrado.',
  catalogError: 'Não foi possível carregar o catálogo.',
  catalogLoading: 'Carregando o catálogo…',
  profile: {
    tabsAria: 'Seções do perfil',
    tabs: { axes: 'Eixos', ideologies: 'Ideias de jogo', managers: 'Treinadores', teams: 'Times' },
    kpiIdeology: 'Ideia de jogo mais próxima',
    kpiManager: 'Treinador mais próximo',
    kpiTeam: 'Time mais próximo',
    axesTitle: 'Perfil nos 12 eixos',
    distinctTitle: (name) => `O que distingue ${name}`,
    rareTag: 'Posição mais incomum',
    commonTag: 'Posição mais comum',
    rareText: (name, pole, percent) =>
      percent >= 99.5
        ? `Nenhuma ideia de jogo do catálogo puxa tanto para ${pole.toLowerCase()} quanto ${name}.`
        : `${name} puxa mais para ${pole.toLowerCase()} que ${Math.round(percent)}% das ideias de jogo do catálogo.`,
    rareNote: (axis, name) => `De todos os eixos, ${axis} é onde ${name} mais se afasta do conjunto.`,
    commonText: (name) => `Aqui ${name} está em terreno comum com a maioria das ideias de jogo.`,
    ideologiesTitle: (name) => `As ideias de jogo mais próximas de ${name}`,
    managersTitle: 'Treinadores mais próximos',
    teamsTitle: 'Times mais próximos',
    mostCompatible: 'Mais compatível',
    matchWord: 'de afinidade',
    byDimension: 'Também próximos, por dimensão',
    similar: 'Outros perfis parecidos',
    distant: (name) => `Os mais distantes de ${name}`,
    ctaTitle: 'E você, com quem se parece?',
    ctaText: (name) => `Responda ao quiz e veja sua compatibilidade com ${name} e com os outros treinadores, times e ideias de jogo nos 12 eixos.`,
    ctaButton: 'Fazer o teste',
    imageSource: 'Fonte da imagem'
  },
  langToggleLabel: 'EN',
  langToggleAria: 'Switch to English',
  redoQuiz: 'Refazer quiz',
  restartQuiz: 'Reiniciar quiz',
  h1Pre: 'Que futebol ',
  h1Em: 'você defende',
  h1Post: '?',
  introLead:
    'Posse ou contra-ataque, pressão alta ou bloco baixo, espetáculo ou resultado. Responda e descubra com que escola de jogo, time e treinador você mais combina.',
  startQuiz: 'Descobrir meu perfil',
  seeAxes: 'Ver os 12 eixos',
  formats: {
    short: {
      label: 'Curta',
      questionCount: '36 perguntas',
      description: 'Resultado rápido, ideal para uma primeira leitura do seu perfil.',
      duration: 'Aprox. 5 min',
      action: 'Começar versão curta'
    },
    extended: {
      label: 'Completa',
      questionCount: '60 perguntas',
      description: 'Mais precisão para aproximar seu resultado dos perfis do catálogo.',
      duration: 'Aprox. 9 min',
      action: 'Começar versão completa'
    },
  },
  axisInfoAria: (label) => `O que significa o eixo ${label}?`,
  questionHelpAria: 'Entender esta pergunta',
  themeToDarkAria: 'Ativar modo escuro',
  themeToLightAria: 'Ativar modo claro',
  questionHelpTitle: 'Sobre esta pergunta',
  questionHelpAgree: 'Se você concorda',
  questionHelpDisagree: 'Se você discorda',
  questionHelpNote: 'Vale lembrar',
  closeLabel: 'Fechar',
  managerInfoAria: (name) => `Ver detalhes de ${name}`,
  closenessTitle: 'O que te aproxima',
  closenessYou: 'Você',
  compareEyebrow: 'Análise comparativa',
  compareTitle: 'Análise comparativa',
  compareLead: 'Escolha um treinador, time ou ideia de jogo e veja, eixo por eixo, onde você se aproxima ou se afasta.',
  compareSearchLabel: 'Buscar perfil para comparar',
  compareSearchPlaceholder: 'Busque um treinador, time ou ideia de jogo',
  compareView: 'Visualizar',
  compareAxesTitle: 'Seus 12 eixos',
  compareNoResults: 'Nenhum perfil encontrado.',
  compareLoading: 'Comparando…',
  compareLoadError: 'Não foi possível carregar a comparação. Tente de novo.',
  compareTypeLabels: { manager: 'Treinador', team: 'Time', 'football-ideology': 'Ideia de jogo' },
  compareAxisAdverbs: {},
  compareClosestLine: (adverb, name) => `Você é ${adverb} compatível com ${name}.`,
  compareFarthestLine: (adverb, name) => `Você é ${adverb} distante de ${name}.`,
  compareClosestFallback: (axis, name) => `Em ${axis}, você é compatível com ${name}.`,
  compareFarthestFallback: (axis, name) => `Em ${axis}, você é distante de ${name}.`,
  compareIdentical: (name) => `Você e ${name} têm posições praticamente idênticas em todos os eixos.`,
  compareNearestLine: (axis, name) => `Seu eixo mais próximo de ${name} é ${axis}.`,
  compareNoFarLine: (name) => `Nenhum eixo está muito distante de ${name}.`,
  compareValues: (pole, you, them, name) => `${pole}: você ${you}% · ${name} ${them}%.`,
  compareOptionAria: (name, type) => `${name}, ${type}`,
  axisExplanations: {
    pos: 'Mede se o seu time deve querer a bola e controlar o jogo com ela ou ceder a posse e ferir o adversário no contra-ataque.',
    pro: 'Compara a construção paciente, de trás e com passes curtos, com o jogo direto, que busca o ataque no menor número de toques.',
    est: 'Avalia se os jogadores devem ocupar posições fixas e ensaiadas ou se aproximar e trocar de lugar livremente perto da bola.',
    lar: 'Mede se o ataque deve passar por dentro, com combinações centrais, ou pelas pontas, com pontas, laterais e cruzamentos.',
    blo: 'Compara pressionar alto, logo depois de perder a bola e perto da área rival, com recuar e defender num bloco baixo e compacto.',
    mar: 'Avalia se a defesa deve marcar espaços (zona) ou adversários (individual), seguindo cada um por onde ele for.',
    pla: 'Mede se o time deve impor a própria identidade em qualquer jogo ou mudar o plano conforme o adversário.',
    res: 'Compara jogar para encantar, com futebol ofensivo e bonito, com jogar para vencer, aceitando o feio quando ele dá resultado.',
    sis: 'Avalia se quem decide é o sistema coletivo treinado ou o talento individual, com liberdade para os craques resolverem.',
    jog: 'Mede se o jogador ideal é o técnico, que trata bem a bola, ou o físico, forte, rápido e incansável.',
    bas: 'Compara dar minutos a jovens e formar o elenco com apostar em jogadores experientes e prontos.',
    lid: 'Avalia se o treinador deve liderar com autoridade e disciplina ou com diálogo, confiança e harmonia no vestiário.'
  },
  axisPoles: {
    pos: {
      left: 'Ter a bola é a melhor forma de atacar e de se defender. O time circula, empurra o rival para trás e escolhe a hora de acelerar.',
      right: 'A bola pode ficar com o rival. O time se organiza sem ela e ataca o espaço que o adversário deixa quando sobe.'
    },
    pro: {
      left: 'A jogada nasce no goleiro e nos zagueiros, com passes curtos que atraem a pressão até aparecer o homem livre.',
      right: 'Quanto menos toques até a área, melhor: bola longa, disputa da segunda bola e ataque antes de a defesa se arrumar.'
    },
    est: {
      left: 'Cada jogador ocupa uma zona definida e o time se espalha pelo campo, com movimentos treinados para criar superioridade.',
      right: 'Os jogadores se aproximam da bola, trocam de posição e criam as jogadas pela tabela e pelo improviso.'
    },
    lar: {
      left: 'O ataque passa pelo meio, com meias e atacantes próximos, tabelas curtas e passes entre as linhas.',
      right: 'O campo é aberto pelos pontas e laterais, com um contra um, ultrapassagens e cruzamentos.'
    },
    blo: {
      left: 'O time marca perto da área rival e tenta recuperar a bola nos primeiros segundos depois de perdê-la.',
      right: 'O time recua, fecha os espaços perto da própria área e espera o erro do rival ou a hora de sair.'
    },
    mar: {
      left: 'Cada defensor cuida de um espaço, e a linha se move junta conforme a bola.',
      right: 'Cada defensor tem um adversário para seguir, por onde ele for.'
    },
    pla: {
      left: 'O time joga do mesmo jeito contra qualquer adversário: quem se adapta é o outro.',
      right: 'O plano muda a cada jogo, conforme as forças e as fraquezas do rival.'
    },
    res: {
      left: 'Vencer importa, mas do jeito certo: futebol ofensivo, bonito e que valha o ingresso.',
      right: 'O que conta é o placar. Um 1 a 0 feio vale o mesmo que uma goleada.'
    },
    sis: {
      left: 'O coletivo treinado decide os jogos, e cada jogador cumpre uma função dentro dele.',
      right: 'Os craques têm liberdade para resolver, e o time se organiza para servir a eles.'
    },
    jog: {
      left: 'O jogador ideal domina, passa e pensa rápido, mesmo que não seja o mais forte.',
      right: 'O jogador ideal corre, disputa cada bola e aguenta o ritmo do jogo inteiro.'
    },
    bas: {
      left: 'O elenco aposta nos jovens, que ganham minutos, crescem jogando e aprendem com os erros.',
      right: 'O elenco confia em jogadores prontos, que já sabem ganhar e lidar com a pressão.'
    },
    lid: {
      left: 'O treinador manda, cobra disciplina e decide sem consultar o grupo.',
      right: 'O treinador lidera pelo diálogo, cuida do ambiente e ganha a confiança dos jogadores.'
    }
  },
  axesPageTitle: 'Os 12 eixos',
  axesPageLead:
    'Cada eixo vai de um polo a outro, e seu resultado mostra onde você fica entre os dois. Ao lado de cada polo estão os treinadores do catálogo que mais puxam para ele.',
  axesPageExamples: 'Quem mais puxa para este lado',
  axesPageNoExamples: 'Nenhum treinador do catálogo puxa forte para este lado.',
  axesPageLean: (percent) => `${percent}%`,
  axesPageLoading: 'Carregando treinadores…',
  axesPageError: 'Não foi possível carregar os treinadores. Recarregue a página para tentar de novo.',
  axesPageCtaTitle: 'Onde você fica em cada eixo?',
  axesPageCtaText: 'Responda ao quiz e veja sua posição nos 12 eixos.',
  axesPageIndexAria: 'Ir para um eixo',
  homeAxesMore: 'Conheça os 12 eixos',
  homeAxes: {},
  howTitle: 'Como funciona o 12 Axes Football',
  howLead:
    'Você responde a afirmações sobre como o futebol deve ser jogado e conduzido, e o 12 Axes calcula onde você fica em cada dimensão.',
  steps: [
    {
      title: 'Responda às perguntas',
      text: 'Concorde ou discorde de afirmações sobre tática, filosofia de jogo e gestão de elenco.'
    },
    {
      title: 'Análise em 12 eixos',
      text: 'Cada resposta posiciona você em 12 eixos independentes, da posse ao contra-ataque, da pressão alta ao bloco baixo.'
    },
    {
      title: 'Descubra seu perfil',
      text: 'Veja sua posição em cada eixo e com que ideias de jogo, times e treinadores você mais combina.'
    }
  ],
  axesGuideTitle: 'O que significa cada eixo?',
  axesGuideLead:
    'Seis eixos táticos, quatro de filosofia de jogo e dois de gestão. Cada um é medido separadamente, então seu resultado guarda combinações incomuns.',
  discoveryTitle: 'Um retrato completo do seu futebol',
  discoveryLead: 'Mais do que um rótulo: seu resultado mostra com quem e com que intensidade suas ideias combinam.',
  discoveryItems: [
    { icon: 'footballIdeology', title: 'Sua ideia de jogo', text: 'Qual escola de futebol combina com você' },
    { icon: 'team', title: 'Seu time', text: 'Que time jogava do jeito que você gosta' },
    { icon: 'manager', title: 'Seu treinador', text: 'Qual técnico pensa o jogo como você' },
    { icon: 'compass', title: 'Sua bússola', text: 'Onde você fica entre posse e contra-ataque, pressão e bloco' },
    { icon: 'profile', title: 'Seu perfil', text: 'Sua posição em cada um dos 12 eixos' },
    { icon: 'compatibility', title: 'Compatibilidade', text: 'O quanto você realmente concorda com cada perfil' }
  ],
  navStart: 'Começar',
  menuAria: 'Abrir menu',
  roseAria: 'Rosa dos 12 eixos',
  versionsTitle: 'Escolha a profundidade',
  versionsLead:
    'Comece pelo quiz rápido ou aprofunde a análise para um retrato mais preciso. Todas as versões usam os mesmos 12 eixos e mostram o resultado na hora.',
  variantEyebrow: 'Escolha o formato',
  variantTitlePre: 'Você quer velocidade ou ',
  variantTitleEm: 'precisão?',
  backToStart: 'Voltar ao início',
  depthLabel: 'Profundidade',
  depthAria: (level) => `Profundidade ${level} de 3`,
  recommended: 'Recomendada',
  formatNotes: ['Todas as versões usam os mesmos 12 eixos', 'Anônimo, sem cadastro', 'Resultado imediato'],
  variantLead: 'A versão curta revela o resultado de forma rápida. A completa aumenta a precisão.',
  quizNavAria: 'Navegação do quiz',
  back: 'Voltar',
  calculating: 'Calculando…',
  seeResult: 'Ver resultado',
  archetypeSkip: 'Pular',
  errMissingAnswer: 'Ainda falta responder esta pergunta antes de ver o resultado.',
  errLoadQuiz: 'Não foi possível carregar o quiz.',
  errCalc: 'Não foi possível calcular o resultado.',
  errImage: 'Não foi possível gerar a imagem do resultado.',
  errHttp: (status) => `Erro HTTP ${status}`,
  resultsH1Pre: 'Seu perfil ',
  resultsH1Em: 'de futebol',
  resultsLead: (count) =>
    `Análise baseada em ${count} respostas distribuídas nos 12 eixos. Confira sua posição em cada eixo e com quem você mais combina.`,
  resultsLeadShared:
    'Resultado compartilhado: a posição em cada um dos 12 eixos e as compatibilidades calculadas a partir dela. Faça o teste para descobrir o seu.',
  resultsSummaryAria: 'Resumo da análise',
  resultsEmptyCatalog: 'Os catálogos de ideias de jogo, times e treinadores ainda estão sendo montados.',
  metaTop: 'Top match',
  axesSectionEyebrow: 'Eixos do futebol',
  axesSectionTitle: 'Seus 12 eixos',
  proximityEyebrow: 'Proximidade',
  otherMatches: 'Outras ideias de jogo',
  navOnThisPage: 'Nesta página',
  resultsNavAxes: 'Os 12 eixos',
  resultsNavSignature: 'O que te distingue',
  resultsNavTeams: 'Times',
  resultsNavManagers: 'Treinadores',
  resultsNavCategories: 'Por categoria',
  resultsNavFootballIdeologies: 'Outras ideias de jogo',
  resultsNavCompass: 'Bússola',
  compassTitle: 'Bússola do futebol',
  compassWith: 'com',
  compassBalanced: (axis) => `equilíbrio em ${axis.toLowerCase()}`,
  compassInfo: {
    aria: 'Como a bússola é feita',
    title: 'Como a bússola é feita',
    xText: 'é o eixo horizontal: da posse, à esquerda, ao contra-ataque, à direita.',
    yText: 'é o eixo vertical: da pressão alta, em cima, ao bloco baixo, embaixo.',
    stripText: 'é a barra: do espetáculo ao resultado.'
  },
  compassAria: (counter, deep, result) =>
    `Sua posição: ${counter}% rumo ao contra-ataque, ${deep}% rumo ao bloco baixo e ${result}% rumo ao resultado.`,
  teamsSectionTitle: 'Times mais próximos de você',
  teamsDistantTitle: 'Os mais distantes de você',
  managersSectionTitle: 'Treinadores mais próximos de você',
  dimensionsTitle: 'Também próximos, por dimensão do seu perfil',
  dimensionLabels: {
    tactics: 'Taticamente',
    philosophy: 'Filosoficamente',
    management: 'Na gestão'
  },
  areasGeneralTitle: 'Os mais próximos dos seus resultados',
  areasSectionTitle: 'Os mais próximos por categoria',
  areasTabsAria: 'Modo de exibição dos treinadores',
  areasGeneralTab: 'Compatibilidade geral',
  areasByAreaTab: 'Categoria',
  managersDistantTitle: 'Os mais distantes de você',
  footballIdeologyDistantTitle: 'A ideia de jogo mais distante de você',
  phraseTitle: 'Uma frase que te descreve',
  phraseNote: (idea) => `É assim que alguém do ${idea} resumiria o futebol que quer.`,
  aboutFootballIdeology: (idea) => `Sobre o ${idea}`,
  exemplarsTitle: 'Exemplos',
  knowMoreAbout: (name) => `Saber mais sobre ${name}`,
  showLess: 'Mostrar menos',
  matchTopKicker: 'Mais compatível',
  dimensionsTitleShort: 'Também próximos, por dimensão',
  signatureTitle: 'O que te distingue',
  signatureUnusualLabel: 'Sua posição mais incomum',
  signatureCommonLabel: 'Sua posição mais comum',
  signatureUnusualLead: (pole, percent) => `Você puxa mais para ${pole.toLowerCase()} que ${Math.round(percent)}% das ideias de jogo do catálogo.`,
  signatureUnusualLeadMax: (pole) => `Nenhuma ideia de jogo do catálogo puxa tanto para ${pole.toLowerCase()} quanto você.`,
  signatureUnusualLeadBalanced: (axis, pole, percent) =>
    `Sua posição em ${axis} é de meio-termo. Mesmo assim, isso já te coloca mais para ${pole.toLowerCase()} que ${Math.round(percent)}% das ideias de jogo do catálogo.`,
  signatureUnusualNote: (axis) => `De todos os 12 eixos, ${axis} é onde você mais se afasta do conjunto. É o traço que mais te diferencia.`,
  signatureCommonLead: (axis) => `Sua posição em ${axis} é praticamente a mediana do catálogo.`,
  signatureCommonNote: (pole) => `Aqui você está em terreno comum. Não puxa para ${pole.toLowerCase()} nem para o polo oposto.`,
  signatureCommonNoteBalanced: (axis) => `Você fica no centro em ${axis}, e o catálogo também. É onde seu perfil menos se distingue.`,
  tensionLabel: 'Sua tensão interna',
  tensionCombo: (firstPole, secondPole) => `${firstPole} e ${secondPole} ao mesmo tempo`,
  tensionRare: (count, total) => `Só ${count} das ${total} ideias de jogo do catálogo juntam essas duas posições.`,
  tensionUnique: 'Nenhuma ideia de jogo do catálogo junta essas duas posições.',
  tensionExamples: (names) => `Quem chega perto: ${names}.`,
  tensionNote: (firstAxis, secondAxis) => `No catálogo, ${firstAxis} e ${secondAxis} costumam andar na mesma direção. Você inverte esse padrão.`,
  signatureMedian: 'Mediana das ideias de jogo',
  signatureYou: 'Você',
  signatureBigCap: (pole) => `das ideias de jogo puxam menos que você para ${pole.toLowerCase()}.`,
  signatureAtMedian: 'Na mediana',
  signatureAtCentre: 'No centro',
  tensionRareShort: (count, total) => `Só ${count} de ${total} ideias de jogo juntam essas duas posições.`,
  managerCategories: {},
  futPosition: 'TÉC',
  futOpenAria: (name, rating) => `${name}, ${rating} de compatibilidade: ver detalhes`,
  pesPrev: 'Time anterior',
  pesNext: 'Próximo time',
  pesStarsAria: (stars) => `${stars} de 5 estrelas`,
  pesPickAria: (label, name) => `${label}: ${name}`,
  similarityNote: 'Os números mostram o quanto vocês pensam parecido (0 a 100%), não força nem importância.',
  matchShort: 'de afinidade',
  agreeTitle: 'Onde vocês mais concordam',
  pesKeysHint: 'Use ← → para trocar',
  redoAnalysis: 'Refazer análise',
  share: 'Compartilhar',
  saveOrShare: 'Compartilhar resultado',
  generatingPng: 'Gerando PNG...',
  generatingPdf: 'Gerando PDF...',
  downloadPdf: 'Download PDF',
  report: {
    fileName: '12axes-football-relatorio',
    docLabel: 'Relatório completo',
    profileEyebrow: 'Seu perfil de futebol',
    headerLabel: (idea) => `Relatório do perfil · ${idea}`,
    kpiTeam: 'Time mais próximo',
    kpiManager: 'Treinador',
    kpiAxes: 'Eixos analisados',
    kpiAnswered: (count) => `${count} perguntas respondidas`,
    tocTitle: 'Neste relatório',
    generatedOn: (date) => `Gerado em ${date}`,
    axesIntro: 'Sua posição em cada um dos 12 eixos. A barra parte do centro (50%) em direção ao polo para onde você pende; o selo indica a intensidade.',
    intensityLegend: 'Intensidade',
    intensityLevels: ['Equilibrado · até 57%', 'Inclinado · 58 a 72%', 'Forte · 73 a 87%', 'Muito forte · 88% ou mais'],
    alsoClose: 'Também próximos, por dimensão do seu perfil',
    continued: 'continuação',
    areasIntro: 'Os treinadores do catálogo cujo perfil nos 12 eixos mais se parece com o seu.',
    aboutTitle: 'Sobre este relatório',
    aboutText:
      'O 12 Axes Football compara suas respostas com perfis de ideias de jogo, times e treinadores nos mesmos 12 eixos. A compatibilidade mede proximidade entre perfis; não é rótulo definitivo. Suas respostas não são armazenadas.',
    ctaTitle: 'Refaça o teste ou compartilhe'
  },
  shareFilePrefix: '12axes-football-perfil',
  shareMessage: (idea, ideaPct, team, teamPct, manager, managerPct) =>
    `Descobri meu perfil de futebol no 12 Axes Football!\n\n` +
    `⚽ Ideia de jogo mais compatível:\n` +
    `${idea} - ${ideaPct}% de compatibilidade\n\n` +
    `🏟️ Time mais compatível:\n` +
    `${team} - ${teamPct}% de compatibilidade\n\n` +
    `📋 Treinador mais compatível:\n` +
    `${manager} - ${managerPct}% de compatibilidade\n\n` +
    `👉 Faça o teste e compartilhe seu resultado:\nhttps://12axes.vercel.app/`,
  progress: (current, total) => `Pergunta ${current} de ${total}`,
  archetypeStep: (current, total) => `${current} de ${total}`,
  progressAria: (percent) => `Progresso do quiz: ${percent}%`,
  answersAria: 'Opções de resposta',
  teamKicker: 'Time mais compatível',
  crestAlt: (name) => `Escudo de ${name}`,
  crestUnavailable: 'Escudo indisponível',
  crestUnavailableAria: (name) => `Escudo indisponível de ${name}`,
  managerKicker: 'Treinador mais compatível',
  portraitAlt: (name) => `Retrato de ${name}`,
  portraitUnavailableAria: (name) => `Retrato indisponível de ${name}`,
  compatibilityAria: (pct) => `Compatibilidade: ${pct} por cento`,
  matchWord: 'match',
  compatibilityLevels: {
    veryHigh: 'Compatibilidade muito alta',
    high: 'Compatibilidade alta',
    medium: 'Compatibilidade média',
    low: 'Compatibilidade baixa',
    veryLow: 'Compatibilidade muito baixa'
  },
  shareTitle: 'Seu perfil de futebol | 12axes.vercel.app',
  shareTopMatch: 'Top match',
  shareTeam: 'Time mais compatível',
  shareManager: 'Treinador',
  shareResultLabel: 'MEU RESULTADO',
  shareMostCompatible: 'MAIS COMPATÍVEL',
  shareYourAxes: 'SEUS 12 EIXOS',
  shareOtherManagers: 'OUTROS TREINADORES',
  shareNearbyTeams: 'TIMES PRÓXIMOS',
  shareFooterCta: 'DESCUBRA SEU PERFIL',
  shareFooterUrl: '12AXES.VERCEL.APP',
  feedbackTitle: 'Encontrou um problema ou tem uma ideia?',
  feedbackReport: 'Reportar um problema',
  feedbackSuggest: 'Sugerir melhorias'
};

const en: Strings = {
  htmlLang: 'en',
  docTitle: '12 Axes Football — Football Philosophy Quiz Across 12 Axes',
  loadingAnalysis: 'Loading analysis...',
  loadingQuiz: 'Loading quiz...',
  loadingResult: 'Loading results...',
  tryAgain: 'Try again',
  crashTitle: 'Something went wrong',
  crashBody: 'The page hit an unexpected error. Reload to try again.',
  crashBodyWithProgress: 'The page hit an unexpected error, but your answers are saved. Reload and choose to continue where you left off.',
  crashReload: 'Reload the page',
  resumeEyebrow: 'Quiz in progress',
  resumeTitle: 'Pick up where you left off',
  resumeBody: (answered, total) => `You have answered ${answered} of ${total} questions. Your answers are saved in this browser.`,
  resumeContinue: 'Continue',
  resumeDiscard: 'Start over',
  lastResultEyebrow: 'Your last result',
  lastResultTitle: 'See your profile again',
  lastResultBody: 'The result of your last quiz is saved in this browser.',
  lastResultOpen: 'See result',
  resumeUnavailable: 'The previous quiz could not be resumed. Start a new one.',
  skipToContent: 'Skip to content',
  backToStartAria: 'Back to start',
  mainNavAria: 'Main navigation',
  navHow: 'How it works',
  navAxes: '12 Axes',
  navCatalog: 'Catalog',
  catalogTitle: 'Catalog',
  catalogHome: 'Home',
  catalogLeads: {
    manager: (n) => `${n} managers mapped by 12 Axes, organised by style of play. Each one has a photo, a career summary and a full profile across the 12 axes.`,
    team: (n) => `${n} teams, each in a defined period, with crest, summary and a full profile across the 12 axes.`,
    'football-ideology': (n) => `${n} ideas and schools of play, from the origins of football to today, each with a full profile across the 12 axes.`
  },
  catalogStats: ['profiles', 'categories', 'axes per profile'],
  catalogViewProfile: 'View profile',
  catalogFilterAria: 'Filter by category',
  catalogTabManagers: 'Managers',
  catalogTabTeams: 'Teams',
  catalogTabIdeologies: 'Football ideas',
  catalogSearchLabel: 'Search the catalog',
  catalogSearchPlaceholder: 'Search by name',
  catalogCount: (n) => (n === 1 ? '1 profile' : `${n} profiles`),
  catalogEmpty: 'No profile found.',
  catalogError: 'Could not load the catalog.',
  catalogLoading: 'Loading the catalog…',
  profile: {
    tabsAria: 'Profile sections',
    tabs: { axes: 'Axes', ideologies: 'Football ideas', managers: 'Managers', teams: 'Teams' },
    kpiIdeology: 'Closest football idea',
    kpiManager: 'Closest manager',
    kpiTeam: 'Closest team',
    axesTitle: 'Profile across the 12 axes',
    distinctTitle: (name) => `What sets ${name} apart`,
    rareTag: 'Most unusual position',
    commonTag: 'Most common position',
    rareText: (name, pole, percent) =>
      percent >= 99.5
        ? `No football idea in the catalog leans as far toward ${pole.toLowerCase()} as ${name}.`
        : `${name} leans further toward ${pole.toLowerCase()} than ${Math.round(percent)}% of the football ideas in the catalog.`,
    rareNote: (axis, name) => `Of all the axes, ${axis} is where ${name} stands furthest from the rest.`,
    commonText: (name) => `Here ${name} is on common ground with most football ideas.`,
    ideologiesTitle: (name) => `The football ideas closest to ${name}`,
    managersTitle: 'Closest managers',
    teamsTitle: 'Closest teams',
    mostCompatible: 'Most compatible',
    matchWord: 'match',
    byDimension: 'Also close, by dimension',
    similar: 'Other similar profiles',
    distant: (name) => `Furthest from ${name}`,
    ctaTitle: 'And you, who are you most like?',
    ctaText: (name) => `Take the quiz and see how you match ${name} and the other managers, teams and football ideas across the 12 axes.`,
    ctaButton: 'Take the quiz',
    imageSource: 'Image source'
  },
  langToggleLabel: 'PT',
  langToggleAria: 'Mudar para português',
  redoQuiz: 'Retake quiz',
  restartQuiz: 'Restart quiz',
  h1Pre: 'What football ',
  h1Em: 'do you believe in',
  h1Post: '?',
  introLead:
    'Possession or counter-attack, high press or low block, spectacle or result. Answer and find the school of play, team and manager that match you best.',
  startQuiz: 'Find my profile',
  seeAxes: 'See the 12 axes',
  formats: {
    short: {
      label: 'Quick',
      questionCount: '36 questions',
      description: 'A fast result, ideal for a first read of your profile.',
      duration: 'About 5 min',
      action: 'Start the quick version'
    },
    extended: {
      label: 'Full',
      questionCount: '60 questions',
      description: 'More precision to bring your result closer to the catalog profiles.',
      duration: 'About 9 min',
      action: 'Start the full version'
    },
  },
  axisInfoAria: (label) => `What does the ${label} axis mean?`,
  questionHelpAria: 'Understand this question',
  themeToDarkAria: 'Switch to dark mode',
  themeToLightAria: 'Switch to light mode',
  questionHelpTitle: 'About this question',
  questionHelpAgree: 'If you agree',
  questionHelpDisagree: 'If you disagree',
  questionHelpNote: 'Keep in mind',
  closeLabel: 'Close',
  managerInfoAria: (name) => `See details for ${name}`,
  closenessTitle: 'What brings you close',
  closenessYou: 'You',
  compareEyebrow: 'Comparison',
  compareTitle: 'Comparison',
  compareLead: 'Pick a manager, team or football idea and see, axis by axis, where you are close and where you differ.',
  compareSearchLabel: 'Search a profile to compare',
  compareSearchPlaceholder: 'Search a manager, team or football idea',
  compareView: 'View',
  compareAxesTitle: 'Your 12 axes',
  compareNoResults: 'No profile found.',
  compareLoading: 'Comparing…',
  compareLoadError: 'The comparison could not be loaded. Try again.',
  compareTypeLabels: { manager: 'Manager', team: 'Team', 'football-ideology': 'Football idea' },
  compareAxisAdverbs: {},
  compareClosestLine: (adverb, name) => `You are ${adverb} compatible with ${name}.`,
  compareFarthestLine: (adverb, name) => `You are ${adverb} distant from ${name}.`,
  compareClosestFallback: (axis, name) => `On ${axis}, you are compatible with ${name}.`,
  compareFarthestFallback: (axis, name) => `On ${axis}, you are distant from ${name}.`,
  compareIdentical: (name) => `You and ${name} hold practically identical positions on every axis.`,
  compareNearestLine: (axis, name) => `Your closest axis to ${name} is ${axis}.`,
  compareNoFarLine: (name) => `No axis is far from ${name}.`,
  compareValues: (pole, you, them, name) => `${pole}: you ${you}% · ${name} ${them}%.`,
  compareOptionAria: (name, type) => `${name}, ${type}`,
  axisExplanations: {
    pos: 'Whether your team should want the ball and control the game with it, or give up possession and hurt the opponent on the counter.',
    pro: 'Patient build-up, from the back with short passes, against direct play that looks for the attack in as few touches as possible.',
    est: 'Whether players should hold fixed, rehearsed positions or come close and swap places freely around the ball.',
    lar: 'Whether attacks should go through the middle, with central combinations, or down the wings, with wingers, full-backs and crosses.',
    blo: 'Pressing high, right after losing the ball and near the opponent’s box, against dropping into a compact low block.',
    mar: 'Whether the defence should mark spaces (zone) or opponents (man), following each one wherever he goes.',
    pla: 'Whether the team should impose its own identity in every game or change the plan to fit the opponent.',
    res: 'Playing to entertain, with bold attacking football, against playing to win, accepting ugly when it gets results.',
    sis: 'Whether the trained collective system decides games, or individual talent with freedom for the stars to settle them.',
    jog: 'Whether the ideal player is the technician who treats the ball well, or the athlete who is strong, fast and tireless.',
    bas: 'Giving minutes to young players and building the squad, against trusting experienced, ready-made players.',
    lid: 'Whether the manager should lead with authority and discipline, or with dialogue, trust and harmony in the dressing room.'
  },
  axisPoles: {
    pos: {
      left: 'Having the ball is the best way to attack and to defend. The team circulates it, pushes the opponent back and picks the moment to speed up.',
      right: 'The opponent can keep the ball. The team organises without it and attacks the space left behind when the opponent pushes up.'
    },
    pro: {
      left: 'Moves start with the goalkeeper and centre-backs, with short passes that draw the press until a free man appears.',
      right: 'The fewer touches to the box, the better: long balls, winning the second ball and attacking before the defence is set.'
    },
    est: {
      left: 'Each player holds a set zone and the team spreads across the pitch, with rehearsed movements to create overloads.',
      right: 'Players come close to the ball, swap positions and build moves through one-twos and improvisation.'
    },
    lar: {
      left: 'Attacks go through the middle, with midfielders and forwards close together, quick one-twos and passes between the lines.',
      right: 'Wingers and full-backs stretch the pitch, with one-on-ones, overlaps and crosses.'
    },
    blo: {
      left: 'The team defends near the opponent’s box and tries to win the ball back in the first seconds after losing it.',
      right: 'The team drops back, closes the space near its own box and waits for a mistake or the moment to break.'
    },
    mar: {
      left: 'Each defender covers a space, and the line moves together with the ball.',
      right: 'Each defender has an opponent to follow, wherever he goes.'
    },
    pla: {
      left: 'The team plays the same way against anyone: it is the opponent who has to adapt.',
      right: 'The plan changes every game, to fit the opponent’s strengths and weaknesses.'
    },
    res: {
      left: 'Winning matters, but the right way: attacking, good-looking football that is worth the ticket.',
      right: 'The score is what counts. An ugly 1–0 is worth as much as a thrashing.'
    },
    sis: {
      left: 'The trained collective decides games, and each player has a job inside it.',
      right: 'The stars are free to decide, and the team is organised to serve them.'
    },
    jog: {
      left: 'The ideal player controls, passes and thinks quickly, even if he is not the strongest.',
      right: 'The ideal player runs, fights for every ball and keeps up the pace for the whole game.'
    },
    bas: {
      left: 'The squad backs young players, who get minutes, grow by playing and learn from their mistakes.',
      right: 'The squad trusts ready-made players who already know how to win and handle pressure.'
    },
    lid: {
      left: 'The manager is in charge, demands discipline and decides without consulting the group.',
      right: 'The manager leads through dialogue, looks after the atmosphere and earns the players’ trust.'
    }
  },
  axesPageTitle: 'The 12 axes',
  axesPageLead:
    'Each axis runs from one pole to another, and your result shows where you sit between them. Next to each pole are the catalog managers who lean furthest towards it.',
  axesPageExamples: 'Who leans furthest this way',
  axesPageNoExamples: 'No manager in the catalog leans strongly to this side.',
  axesPageLean: (percent) => `${percent}%`,
  axesPageLoading: 'Loading managers…',
  axesPageError: 'Could not load the managers. Reload the page to try again.',
  axesPageCtaTitle: 'Where do you sit on each axis?',
  axesPageCtaText: 'Take the quiz and see your position on all 12 axes.',
  axesPageIndexAria: 'Go to an axis',
  homeAxesMore: 'Explore the 12 axes',
  homeAxes: {
    pos: { label: 'Possession', leftPole: 'Ball', rightPole: 'Counter' },
    pro: { label: 'Progression', leftPole: 'Patient build-up', rightPole: 'Direct play' },
    est: { label: 'Structure', leftPole: 'Positional', rightPole: 'Relational' },
    lar: { label: 'Width', leftPole: 'Through the middle', rightPole: 'Down the wings' },
    blo: { label: 'Block', leftPole: 'Press high', rightPole: 'Sit deep' },
    mar: { label: 'Marking', leftPole: 'Zone', rightPole: 'Man' },
    pla: { label: 'Game plan', leftPole: 'Own identity', rightPole: 'Adapt to the opponent' },
    res: { label: 'Purpose', leftPole: 'Spectacle', rightPole: 'Result' },
    sis: { label: 'Who decides', leftPole: 'System', rightPole: 'Talent' },
    jog: { label: 'Player type', leftPole: 'Technique', rightPole: 'Physicality' },
    bas: { label: 'Squad', leftPole: 'Youth', rightPole: 'Experience' },
    lid: { label: 'Leadership', leftPole: 'Authority', rightPole: 'Harmony' }
  },
  howTitle: 'How 12 Axes Football works',
  howLead: 'You answer statements about how football should be played and run, and 12 Axes works out where you stand on each dimension.',
  steps: [
    {
      title: 'Answer the questions',
      text: 'Agree or disagree with statements about tactics, philosophy of play and squad management.'
    },
    {
      title: 'Analysis on 12 axes',
      text: 'Each answer places you on 12 independent axes, from possession to counter-attack, from high press to low block.'
    },
    {
      title: 'Find your profile',
      text: 'See where you stand on each axis and which football ideas, teams and managers match you best.'
    }
  ],
  axesGuideTitle: 'What does each axis mean?',
  axesGuideLead:
    'Six tactical axes, four on philosophy of play and two on management. Each one is measured separately, so your result keeps unusual combinations.',
  discoveryTitle: 'A full picture of your football',
  discoveryLead: 'More than a label: your result shows who your ideas match, and how strongly.',
  discoveryItems: [
    { icon: 'footballIdeology', title: 'Your football idea', text: 'Which school of football matches you' },
    { icon: 'team', title: 'Your team', text: 'Which team played the way you like' },
    { icon: 'manager', title: 'Your manager', text: 'Which coach thinks about the game like you' },
    { icon: 'compass', title: 'Your compass', text: 'Where you stand between possession and counter, press and block' },
    { icon: 'profile', title: 'Your profile', text: 'Your position on each of the 12 axes' },
    { icon: 'compatibility', title: 'Compatibility', text: 'How much you really agree with each profile' }
  ],
  navStart: 'Start',
  menuAria: 'Open menu',
  roseAria: 'Rose of the 12 axes',
  versionsTitle: 'Choose the depth',
  versionsLead:
    'Start with the quick quiz or go deeper for a more precise picture. Every version uses the same 12 axes and shows the result right away.',
  variantEyebrow: 'Choose the format',
  variantTitlePre: 'Do you want speed or ',
  variantTitleEm: 'precision?',
  backToStart: 'Back to start',
  depthLabel: 'Depth',
  depthAria: (level) => `Depth ${level} of 3`,
  recommended: 'Recommended',
  formatNotes: ['Every version uses the same 12 axes', 'Anonymous, no sign-up', 'Instant result'],
  variantLead: 'The quick version gives a fast result. The full version adds precision.',
  quizNavAria: 'Quiz navigation',
  back: 'Back',
  calculating: 'Calculating…',
  seeResult: 'See result',
  archetypeSkip: 'Skip',
  errMissingAnswer: 'This question still needs an answer before you can see the result.',
  errLoadQuiz: 'The quiz could not be loaded.',
  errCalc: 'The result could not be calculated.',
  errImage: 'The result image could not be generated.',
  errHttp: (status) => `HTTP error ${status}`,
  resultsH1Pre: 'Your ',
  resultsH1Em: 'football profile',
  resultsLead: (count) =>
    `Analysis based on ${count} answers spread across the 12 axes. See where you stand on each axis and who you match best.`,
  resultsLeadShared:
    'Shared result: the position on each of the 12 axes and the matches calculated from it. Take the quiz to find yours.',
  resultsSummaryAria: 'Analysis summary',
  resultsEmptyCatalog: 'The catalogs of football ideas, teams and managers are still being built.',
  metaTop: 'Top match',
  axesSectionEyebrow: 'Football axes',
  axesSectionTitle: 'Your 12 axes',
  proximityEyebrow: 'Proximity',
  otherMatches: 'Other football ideas',
  navOnThisPage: 'On this page',
  resultsNavAxes: 'The 12 axes',
  resultsNavSignature: 'What sets you apart',
  resultsNavTeams: 'Teams',
  resultsNavManagers: 'Managers',
  resultsNavCategories: 'By category',
  resultsNavFootballIdeologies: 'Other football ideas',
  resultsNavCompass: 'Compass',
  compassTitle: 'Football compass',
  compassWith: 'with',
  compassBalanced: (axis) => `balance on ${axis.toLowerCase()}`,
  compassInfo: {
    aria: 'How the compass is made',
    title: 'How the compass is made',
    xText: 'is the horizontal axis: from possession, on the left, to counter-attack, on the right.',
    yText: 'is the vertical axis: from high press, at the top, to low block, at the bottom.',
    stripText: 'is the bar: from spectacle to result.'
  },
  compassAria: (counter, deep, result) =>
    `Your position: ${counter}% toward counter-attack, ${deep}% toward a low block and ${result}% toward result.`,
  teamsSectionTitle: 'Teams closest to you',
  teamsDistantTitle: 'The most distant from you',
  managersSectionTitle: 'Managers closest to you',
  dimensionsTitle: 'Also close, by dimension of your profile',
  dimensionLabels: {
    tactics: 'Tactically',
    philosophy: 'Philosophically',
    management: 'In management'
  },
  areasGeneralTitle: 'The closest to your results',
  areasSectionTitle: 'The closest by category',
  areasTabsAria: 'How to show managers',
  areasGeneralTab: 'Overall compatibility',
  areasByAreaTab: 'Category',
  managersDistantTitle: 'The most distant from you',
  footballIdeologyDistantTitle: 'The football idea most distant from you',
  phraseTitle: 'A sentence that describes you',
  phraseNote: (idea) => `This is how someone from ${idea} would sum up the football they want.`,
  aboutFootballIdeology: (idea) => `About ${idea}`,
  exemplarsTitle: 'Examples',
  knowMoreAbout: (name) => `Learn more about ${name}`,
  showLess: 'Show less',
  matchTopKicker: 'Most compatible',
  dimensionsTitleShort: 'Also close, by dimension',
  signatureTitle: 'What sets you apart',
  signatureUnusualLabel: 'Your most unusual position',
  signatureCommonLabel: 'Your most common position',
  signatureUnusualLead: (pole, percent) => `You lean further toward ${pole.toLowerCase()} than ${Math.round(percent)}% of the football ideas in the catalog.`,
  signatureUnusualLeadMax: (pole) => `No football idea in the catalog leans as far toward ${pole.toLowerCase()} as you do.`,
  signatureUnusualLeadBalanced: (axis, pole, percent) =>
    `Your position on ${axis} is middle-ground. Even so, that already puts you further toward ${pole.toLowerCase()} than ${Math.round(percent)}% of the football ideas in the catalog.`,
  signatureUnusualNote: (axis) => `Of all 12 axes, ${axis} is where you stand furthest from the rest. It is the trait that sets you apart most.`,
  signatureCommonLead: (axis) => `Your position on ${axis} is practically the catalog median.`,
  signatureCommonNote: (pole) => `Here you are on common ground. You lean neither toward ${pole.toLowerCase()} nor toward the opposite pole.`,
  signatureCommonNoteBalanced: (axis) => `You sit in the centre on ${axis}, and so does the catalog. It is where your profile stands out least.`,
  tensionLabel: 'Your inner tension',
  tensionCombo: (firstPole, secondPole) => `${firstPole} and ${secondPole} at the same time`,
  tensionRare: (count, total) => `Only ${count} of the ${total} football ideas in the catalog combine these two positions.`,
  tensionUnique: 'No football idea in the catalog combines these two positions.',
  tensionExamples: (names) => `Coming close: ${names}.`,
  tensionNote: (firstAxis, secondAxis) => `In the catalog, ${firstAxis} and ${secondAxis} usually move in the same direction. You reverse that pattern.`,
  signatureMedian: 'Median of football ideas',
  signatureYou: 'You',
  signatureBigCap: (pole) => `of football ideas lean less than you toward ${pole.toLowerCase()}.`,
  signatureAtMedian: 'At the median',
  signatureAtCentre: 'At the centre',
  tensionRareShort: (count, total) => `Only ${count} of ${total} football ideas combine these two positions.`,
  managerCategories: {
    'Posse e estrutura': 'Possession and structure',
    'Pressão e intensidade': 'Pressing and intensity',
    'Defensiva e reativa': 'Defensive and reactive',
    'Relacional e liberdade': 'Relational and freedom-based',
    'Híbrida e moderna': 'Hybrid and modern'
  },
  futPosition: 'MGR',
  futOpenAria: (name, rating) => `${name}, ${rating} compatibility: see details`,
  pesPrev: 'Previous team',
  pesNext: 'Next team',
  pesStarsAria: (stars) => `${stars} of 5 stars`,
  pesPickAria: (label, name) => `${label}: ${name}`,
  similarityNote: 'The numbers show how alike you think (0 to 100%), not strength or importance.',
  matchShort: 'affinity',
  agreeTitle: 'Where you agree most',
  pesKeysHint: 'Use ← → to switch',
  redoAnalysis: 'Retake analysis',
  share: 'Share',
  saveOrShare: 'Share result',
  generatingPng: 'Generating PNG...',
  generatingPdf: 'Generating PDF...',
  downloadPdf: 'Download PDF',
  report: {
    fileName: '12axes-football-report',
    docLabel: 'Full report',
    profileEyebrow: 'Your football profile',
    headerLabel: (idea) => `Profile report · ${idea}`,
    kpiTeam: 'Closest team',
    kpiManager: 'Manager',
    kpiAxes: 'Axes analysed',
    kpiAnswered: (count) => `${count} questions answered`,
    tocTitle: 'In this report',
    generatedOn: (date) => `Generated on ${date}`,
    axesIntro: 'Your position on each of the 12 axes. The bar starts at the centre (50%) and runs toward the pole you lean to; the badge shows the intensity.',
    intensityLegend: 'Intensity',
    intensityLevels: ['Balanced · up to 57%', 'Leaning · 58 to 72%', 'Strong · 73 to 87%', 'Very strong · 88% or more'],
    alsoClose: 'Also close, by dimension of your profile',
    continued: 'continued',
    areasIntro: 'The managers in the catalog whose profile on the 12 axes looks most like yours.',
    aboutTitle: 'About this report',
    aboutText:
      '12 Axes Football compares your answers with profiles of football ideas, teams and managers on the same 12 axes. Compatibility measures how close two profiles are; it is not a definitive label. Your answers are not stored.',
    ctaTitle: 'Retake the quiz or share'
  },
  shareFilePrefix: '12axes-football-profile',
  shareMessage: (idea, ideaPct, team, teamPct, manager, managerPct) =>
    `I found my football profile on 12 Axes Football!\n\n` +
    `⚽ Most compatible football idea:\n` +
    `${idea} - ${ideaPct}% compatibility\n\n` +
    `🏟️ Most compatible team:\n` +
    `${team} - ${teamPct}% compatibility\n\n` +
    `📋 Most compatible manager:\n` +
    `${manager} - ${managerPct}% compatibility\n\n` +
    `👉 Take the quiz and share your result:\nhttps://12axes.vercel.app/en`,
  progress: (current, total) => `Question ${current} of ${total}`,
  archetypeStep: (current, total) => `${current} of ${total}`,
  progressAria: (percent) => `Quiz progress: ${percent}%`,
  answersAria: 'Answer options',
  teamKicker: 'Most compatible team',
  crestAlt: (name) => `Crest of ${name}`,
  crestUnavailable: 'Crest unavailable',
  crestUnavailableAria: (name) => `Crest unavailable for ${name}`,
  managerKicker: 'Most compatible manager',
  portraitAlt: (name) => `Portrait of ${name}`,
  portraitUnavailableAria: (name) => `Portrait unavailable for ${name}`,
  compatibilityAria: (pct) => `Compatibility: ${pct} percent`,
  matchWord: 'match',
  compatibilityLevels: {
    veryHigh: 'Very high compatibility',
    high: 'High compatibility',
    medium: 'Medium compatibility',
    low: 'Low compatibility',
    veryLow: 'Very low compatibility'
  },
  shareTitle: 'Your football profile | 12axes.vercel.app',
  shareTopMatch: 'Top match',
  shareTeam: 'Most compatible team',
  shareManager: 'Manager',
  shareResultLabel: 'MY RESULT',
  shareMostCompatible: 'MOST COMPATIBLE',
  shareYourAxes: 'YOUR 12 AXES',
  shareOtherManagers: 'OTHER MANAGERS',
  shareNearbyTeams: 'NEARBY TEAMS',
  shareFooterCta: 'FIND YOUR PROFILE',
  shareFooterUrl: '12AXES.VERCEL.APP',
  feedbackTitle: 'Found a problem or have an idea?',
  feedbackReport: 'Report a problem',
  feedbackSuggest: 'Suggest improvements'
};

export const t: Strings = LANG === 'en' ? en : pt;
