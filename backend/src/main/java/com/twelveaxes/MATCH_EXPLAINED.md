# 12 Axes Football - explicacao do matching

Este documento descreve a logica atual do backend para transformar respostas do quiz nos 12 eixos do futebol e, depois, em correspondencias de ideia de jogo, time e treinador. Use como referencia antes de pedir alteracoes em outros chats.

## Arquivos principais

- `backend/src/main/java/com/twelveaxes/controller/QuizController.java`
  - Exposes `/api/quiz`, `/api/results` e `/api/results/by-axes`.
- `backend/src/main/java/com/twelveaxes/service/ScoringService.java`
  - Transforma respostas em 12 `AxisResult`.
- `backend/src/main/java/com/twelveaxes/service/ProfileMatchScorer.java`
  - Formula central de compatibilidade, usada pelos tres catalogos.
- `backend/src/main/java/com/twelveaxes/service/FootballIdeologyMatcherService.java`
  - Ranking e percentil para as 4 ideias de jogo retornadas.
- `backend/src/main/java/com/twelveaxes/service/ManagerMatcherService.java`
  - Ranking de treinadores (top 8, melhor por categoria, opostos).
- `backend/src/main/java/com/twelveaxes/service/TeamMatcherService.java`
  - Ranking de times (top 3, opostos).
- `backend/src/main/java/com/twelveaxes/service/QuizDataService.java`
  - Carrega JSONs, traducoes e perfis canonicos.

## Fluxo da API

### `GET /api/quiz`

Retorna perguntas e opcoes de resposta.

Variantes:

- `short`: 3 perguntas por eixo.
- `extended`: 5 perguntas por eixo.

Idiomas:

- `pt` por padrao.
- `en`, `en-us`, `en-gb` viram `en`.
- Qualquer outro valor cai para `pt`.

### `POST /api/results`

Recebe respostas do quiz, calcula eixos e retorna, entre outros:

- `axes`: os 12 eixos calculados.
- `topMatch`: primeira ideia de jogo do ranking final.
- `matches`: 4 ideias de jogo finais.
- `topTeamMatch` / `topTeamMatches`: time mais compativel e os 3 primeiros.
- `topManagerMatch` / `managerMatches`: treinador mais compativel e os 8 primeiros.

Com um catalogo vazio, os destaques dele vem `null` e as listas vazias.

### `GET /api/results/by-axes?v=...`

Reconstrói um resultado compartilhado a partir de 12 valores `leftPercent`, separados por virgula, na ordem de `axes.json`.

Exemplo conceitual:

```text
/api/results/by-axes?v=48,35,70,58,53,44,55,54,58,34,34,43
```

Esse endpoint nao recalcula respostas; ele usa diretamente o vetor de eixos.

## Como respostas viram eixos

Cada resposta tem um valor normalizado:

```text
STRONGLY_AGREE    = 1.00
AGREE             = 0.75
NEUTRAL           = 0.50
DISAGREE          = 0.25
STRONGLY_DISAGREE = 0.00
```

Cada pergunta tem:

- `axisId`: eixo que ela mede.
- `agreePole`: polo para o qual a concordancia aponta.
- `weight`: peso da pergunta.

Para cada resposta:

```text
if agreePole == LEFT:
  leftScore = scoreTowardAgreement
else:
  leftScore = 1 - scoreTowardAgreement
```

O resultado de cada eixo e uma media ponderada:

```text
leftPercent = 100 * sum(leftScore * questionWeight) / sum(questionWeight)
rightPercent = 100 - leftPercent
```

Se um eixo nao recebeu resposta, ele fica neutro: `50`.

Intensidade exibida:

- distancia do centro `< 7.5`: equilibrado.
- `< 22.5`: inclinado.
- `< 37.5`: forte.
- `>= 37.5`: muito forte.

## Vetores de matching

O scorer trabalha com um vetor de 12 valores `leftPercent`, um por eixo:

```text
pos  pro  est  lar  blo  mar   (tatica)
pla  res  sis  jog             (filosofia)
bas  lid                       (gestao)
```

O usuario vira vetor via `ProfileMatchScorer.userVectorFor(axisResults)`.

Os alvos vêm de:

- `data/football-ideology-profiles.json`
- `data/manager-profiles.json`
- `data/team-profiles.json`

Fallbacks: se faltar o perfil, ideia de jogo e time tentam o `vector` dos metadados; depois, vetor neutro. Treinador sem perfil usa o vetor neutro. Na pratica, o carregamento exige um perfil para cada item dos catalogos.

## Formula atual de compatibilidade

A formula fica em `ProfileMatchScorer`.

Hoje ela tem 4 componentes:

```text
compatibilidade =
  0.42 * axisSimilarity
+ 0.33 * directionSimilarity
+ 0.18 * magnitudeSimilarity
+ 0.07 * outlierSimilarity
```

O resultado final e:

```text
round1(clamp(compatibilidade, 0, 100))
```

### 1. `axisSimilarity`

Pergunta: em quantos eixos os dois perfis batem?

Para cada eixo:

```text
diff = abs(userValue - targetValue)
similarity = max(0, 1 - (diff / 50)^2)
```

Isso e quadratico: diferencas pequenas quase nao punem; diferencas grandes punem muito.

Se usuario e alvo estao em lados opostos do centro no mesmo eixo, aplica uma penalidade suave:

```text
factor =
  1
- 0.45
* tanh(abs(userValue - 50) / 25)
* tanh(abs(targetValue - 50) / 25)
```

Depois:

```text
axisSimilarity = 100 * average(similarityPorEixo)
```

### 2. `directionSimilarity`

Pergunta: os vetores apontam para a mesma direcao?

O scorer centraliza os valores em torno de `50`:

```text
centered = value - 50
```

Depois calcula o **cosseno aumentado** entre vetor do usuario e vetor do alvo:

```text
k = 12 * DIRECTION_AUGMENT_RADIUS^2        (DIRECTION_AUGMENT_RADIUS = 8)
cosAug = (dot(user, target) + k) / sqrt((norm(user)^2 + k) * (norm(target)^2 + k))
directionSimilarity = 50 + 50 * cosAug
```

O termo `k` equivale a somar a mesma componente constante aos dois vetores antes do cosseno. Efeitos:

- Longe do centro (`norm^2` muito maior que `k`), converge para o cosseno puro: nada muda para perfis com lado definido.
- Perto do centro, onde a direcao e so ruido de resposta, o termo constante domina e o componente tende a `100` entre perfis parecidos.
- Centro x centro da `100` (antes dava `50`, porque a direcao era indefinida).
- E a mesma formula para todo alvo, continua e sem limiar.

Interpretacao:

- `100`: mesma direcao (ou os dois perto do centro).
- `50`: direcoes ortogonais com intensidade alta.
- `0`: direcao oposta.

`DIRECTION_AUGMENT_RADIUS = 8` e o raio RMS, em pontos por eixo, abaixo do qual a direcao pesa menos que o termo constante.

### 3. `magnitudeSimilarity`

Pergunta: os dois perfis têm intensidade parecida?

Esse componente existe para corrigir um bug real: usuario moderado recebia perfil extremo com compatibilidade quase perfeita, porque o cosseno mede direcao e ignora intensidade.

Primeiro calcula a extremidade media:

```text
intensity = average(abs(value - 50))
```

Depois compara a intensidade do usuario e do alvo:

```text
magnitudeSimilarity = 100 - 2 * abs(userIntensity - targetIntensity)
```

Como a intensidade vai de `0` a `50`, o fator `2` coloca o resultado em escala `0..100`.

Exemplo:

- usuario com intensidade media `8`.
- alvo com intensidade media `8`.
- magnitude = `100`.

Outro exemplo:

- usuario com intensidade media `8`.
- alvo com intensidade media `28`.
- magnitude = `60`.

Isso impede que um usuario "morno" ganhe nota quase perfeita contra um perfil radical apenas por apontar para o mesmo lado.

### 4. `outlierSimilarity`

Pergunta: existe algum eixo isolado onde usuario e alvo divergem muito, mesmo que a media geral va bem?

Esse componente existe para o seguinte problema: um perfil pode ter compatibilidade alta na media (11 dos 12 eixos proximos) e ainda assim ter 1 eixo com diferenca enorme (ex.: usuario que quer a bola vs. alvo que entrega a posse). Os outros 3 componentes diluem esse outlier na media geral e o usuario ve uma nota alta para um perfil que diverge muito dele nesse eixo especifico.

Primeiro calcula a maior diferenca absoluta entre os dois vetores, em qualquer eixo:

```text
maxDiff = max(abs(userValue - targetValue)) para todo eixo
```

Depois converte isso em uma nota, com queda suave (nao e um corte binario):

```text
outlierSimilarity = 100 * max(0, 1 - (maxDiff / 100)^2.5)
```

O expoente `2.5` deixa a penalidade branda para diffs moderados (ate uns 40-50 pontos) e mais dura conforme o diff se aproxima de 100. Diferente de um filtro por limiar, isso nunca remove um perfil do ranking: so reduz a nota dele proporcionalmente ao pior eixo, permitindo que o perfil ainda vença se for o melhor candidato disponivel nos outros 3 componentes.

Esse componente tem peso baixo (`0.07`) de proposito: ele deve desempatar e suavizar outliers, nao dominar a formula. Pesos mais altos (testados em ate `0.20`) prejudicam a recuperacao do proprio perfil sob ruido (`ScorerBenchmarkTest`), porque penalizam demais qualquer eixo que receba ruido moderado.

## Caso neutro

Neutro contra neutro da `100`:

```text
0.42 * 100 + 0.33 * 100 + 0.18 * 100 + 0.07 * 100 = 100
```

- `axisSimilarity = 100`: os eixos sao identicos.
- `directionSimilarity = 100`: com o cosseno aumentado, centro x centro tem direcao `100`.
- `magnitudeSimilarity = 100`: os dois têm intensidade zero.
- `outlierSimilarity = 100`: maior diferenca entre eixos e zero.

Antes do cosseno aumentado (ate 2026-09-26) a direcao entre dois vetores neutros era `50`, e o total ficava travado em `83.5`: um usuario com 50 em tudo nunca passava de 83,5% com um perfil que e 50 em todos os eixos.

## Percentil

Cada catalogo calcula percentil contra todos os scores daquele mesmo catalogo:

```text
percentile = 100 * count(score < compatibility) / catalogSize
```

Importante:

- Usa comparacao estrita `<`.
- Nao e uma probabilidade.
- Significa "mais compativel que X% do catalogo".

## Matching de ideias de jogo

`FootballIdeologyMatcherService.findMatches`:

1. Converte os eixos do usuario em vetor.
2. Calcula compatibilidade contra todas as ideias de jogo.
3. Calcula percentil dentro do catalogo.
4. Retorna o top 4 por compatibilidade desc e nome asc.

`findBottomMatch` devolve a mais distante. A descricao longa le os trechos `Taticamente: ... | Filosoficamente: ... | Na gestao: ...` da descricao, quando existem.

## Matching de treinadores

`ManagerMatcherService`: mesmo ranking, com top 8, o mais compativel de cada categoria e os 3 mais distantes. `ManagerDimensionMatcherService` repete o calculo so com os eixos de cada dimensao (tatica, filosofia, gestao).

## Matching de times

`TeamMatcherService`: top 3 e os 3 mais distantes. `TeamDimensionMatcherService` faz o recorte por dimensao, excluindo o time em destaque.

## Testes que protegem a logica

### `ProfileMatchScorerTest`

Protege:

- vetor identico = `100`.
- mesma direcao bate direcao oposta a distancia comparavel.
- penalidade de lado oposto muda continuamente.
- neutro contra neutro = `100`.
- usuario/alvo neutro usa a direcao aumentada, derivada das constantes.
- longe do centro, o cosseno aumentado preserva a preferencia pelo perfil alinhado e intenso.
- usuario morno prefere perfil moderado a perfil extremo perfeitamente alinhado.
- um outlier extremo em 1 eixo isolado reduz a nota mesmo com os outros 11 eixos identicos.
- pesos somam `1.0`.

### `ScorerBenchmarkTest`

Benchmark intra-catalogo. Mede:

- recuperacao com ruido moderado.
- recuperacao com ruido forte.
- rejeicao de vetor oposto.
- rejeicao de perfis centrais para usuarios extremos.
- estabilidade do top-1 sob pequena mudanca.
- discriminacao entre primeiro e segundo.
- controle de inflacao de extremidade para usuarios mornos.

Os limites do benchmark foram calibrados nos catalogos politicos do projeto original. O teste fica desligado (`@Disabled`) ate existirem os catalogos de futebol, e os limites precisam ser recalibrados com eles.

### Testes de fluxo

- `FootballIdeologyMatcherServiceTest`: perfis explicitos, vetor canonico, neutro, ordem final por compatibilidade e categorias esperadas.
- `QuizFlowAutomationTest`: contrato da API para variantes do quiz.
- `SharedResultsTest`: endpoint compartilhado por vetor de eixos.

Os testes rodam sobre um catalogo sintetico de futebol em `backend/src/test/resources/data`, que substitui os dados de `main` no classpath de teste.

## Erros ja cometidos

### Confiar so em direcao e proximidade por eixo

O cosseno e cego a intensidade. Um usuario moderado e um perfil extremo podem apontar para a mesma direcao, e o cosseno vai dar quase `100`.

Foi o bug observado em producao: usuario com extremidade media baixa recebeu um perfil extremo com compatibilidade muito alta. O componente de magnitude existe para impedir esse tipo de inflacao.

### Tratar `compatibility` como probabilidade

`compatibility` e uma nota de proximidade no espaco dos 12 eixos, nao uma chance estatistica.

### Fixar numero magico em teste de fluxo

Valor absoluto de compatibilidade depende dos pesos da formula. Teste de API deve validar invariantes de comportamento; teste de formula deve derivar o valor esperado das constantes.

### Confundir ranking bruto com ranking diversificado

Hoje a API de ideias de jogo retorna ranking bruto. Se no futuro voltar a existir uma camada de diversidade ou curadoria visual, isso deve ser exposto separadamente para nao mascarar a ordem real de compatibilidade.

### Descartar perfil por limiar de diferenca em 1 eixo

Foi cogitado (e simulado, nao implementado) um corte binario: remover do ranking qualquer perfil com `diff > 60` (ou `70`) em algum eixo. Simulacoes mostraram que isso descarta entre 45% e 100% do catalogo dependendo do perfil do usuario, e o pior caso e justamente o usuario coerente e extremo (respostas fortes mas nao contraditorias): o corte remove o melhor candidato objetivo (o perfil mais proximo de um usuario coerente e extremo) e o substitui por um candidato com compatibilidade agregada menor, so porque ele nao tem nenhum eixo isolado acima do limiar. Um corte binario sempre cria um penhasco artificial perto do limiar escolhido, qualquer que seja o valor.

O componente `outlierSimilarity` foi escolhido no lugar do corte porque penaliza o outlier de forma continua, sem nunca zerar um candidato — ele pode cair no ranking, mas nao desaparece, e ainda vence quando e genuinamente o melhor candidato disponivel.

### Direcao indefinida perto do centro

O cosseno puro mede so o angulo. Perto do centro, uma inclinacao de 3 pontos pesa o mesmo que uma de 40, entao a direcao virava ruido de resposta com peso de 33% da nota. Efeitos medidos: centristas recebiam perfis de lado definido por acaso, e dois vetores no centro exato tinham direcao `50` (total travado em `83.5`).

Alternativas descartadas em simulacao:

- Multiplicar o cosseno por uma "confianca" so do usuario (`conf = I / (I + 8)`): nao resolve centro x centro (continua `83.5`) e, como `conf` nunca chega a 1, tira de 3 a 4 pontos da compatibilidade de todo mundo.
- Trocar a direcao pela `axisSimilarity` quando os vetores estao perto do centro: cria um bonus estrutural so para os alvos centrais (as duas medidas estao em escalas diferentes) e transforma o perfil central num ralo que absorve todo usuario moderado.
- Usar so a distancia por eixo: aumenta o acerto nos extremos, mas troca de 20% a 50% dos resultados dos tres catalogos.

## Como alterar a formula com seguranca

1. Alterar constantes ou componentes em `ProfileMatchScorer`.
2. Atualizar `ProfileMatchScorerTest` usando valores derivados das constantes.
3. Rodar `ScorerBenchmarkTest`.
4. Conferir trade-off: recuperacao, oposto, centro, estabilidade, discriminacao e extremidade.
5. Rodar fluxo de API e shared results.
6. Atualizar este documento com a formula e os numeros novos do benchmark.

Comando:

```bash
./mvnw "-Dtest=ProfileMatchScorerTest,ScorerBenchmarkTest,FootballIdeologyMatcherServiceTest,QuizFlowAutomationTest,SharedResultsTest" test
```
