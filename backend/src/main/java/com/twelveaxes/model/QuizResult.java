package com.twelveaxes.model;

import java.util.List;

/**
 * Resultado completo do quiz: a posicao do usuario nos 12 eixos e os recortes
 * de afinidade e de distancia em cada catalogo (ideias de jogo, times e
 * treinadores). Com um catalogo vazio, os matches dele vem null ou vazios.
 *
 * @param axes resultado do usuario em cada um dos 12 eixos
 * @param topMatch ideia de jogo mais compativel
 * @param matches ideias de jogo mais compativeis, a comecar pela do topo
 * @param bottomFootballIdeologyMatch ideia de jogo mais distante do catalogo
 * @param topTeamMatch time mais compativel
 * @param topTeamMatches os 3 times mais compativeis, a comecar pelo topo
 * @param teamDimensionMatches time mais compativel em cada dimensao (tatica, filosofia, gestao)
 * @param bottomTeamMatches times mais distantes do catalogo
 * @param topManagerMatch treinador mais compativel
 * @param managerMatches treinadores mais compativeis
 * @param managerDimensionMatches treinador mais compativel em cada dimensao
 * @param categoryBestMatches treinador mais compativel de cada categoria
 * @param bottomManagerMatches treinadores mais distantes do catalogo
 * @param mostUnusualAxis eixo em que o usuario mais destoa do catalogo de ideias de jogo
 * @param mostCommonAxis eixo em que o usuario mais se aproxima do catalogo
 * @param axisTension par de eixos em que o usuario contraria o padrao do catalogo, ou null
 */
public record QuizResult(
        List<AxisResult> axes,
        FootballIdeologyMatch topMatch,
        List<FootballIdeologyMatch> matches,
        FootballIdeologyMatch bottomFootballIdeologyMatch,
        TeamMatch topTeamMatch,
        List<TeamMatch> topTeamMatches,
        List<TeamDimensionMatch> teamDimensionMatches,
        List<TeamMatch> bottomTeamMatches,
        ManagerMatch topManagerMatch,
        List<ManagerMatch> managerMatches,
        List<ManagerDimensionMatch> managerDimensionMatches,
        List<ManagerMatch> categoryBestMatches,
        List<ManagerMatch> bottomManagerMatches,
        AxisOutlier mostUnusualAxis,
        AxisOutlier mostCommonAxis,
        AxisTension axisTension
) {
}
