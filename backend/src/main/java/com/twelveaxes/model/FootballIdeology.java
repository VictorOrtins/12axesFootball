package com.twelveaxes.model;

import java.util.Map;

/**
 * Escola ou ideia de jogo (Futebol Total, Gegenpressing, Catenaccio...).
 *
 * @param teamId time que melhor representa a ideia (id do catálogo de times)
 * @param managerId treinador que melhor representa a ideia (id do catálogo de treinadores)
 */
public record FootballIdeology(
        String id,
        String name,
        String category,
        String description,
        String phrase,
        String teamId,
        String managerId,
        Map<String, Double> vector
) {
}
