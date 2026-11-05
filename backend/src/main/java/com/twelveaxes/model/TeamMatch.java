package com.twelveaxes.model;

import java.util.Map;

public record TeamMatch(
        String teamId,
        String name,
        String category,
        String description,
        String period,
        String imagePath,
        String imageSourceName,
        String imageSourceUrl,
        String imageNote,
        double compatibility,
        double compatibilityPercentile,
        // Vetor de 12 eixos (leftPercent) do time, usado pelo front para
        // mostrar os eixos que aproximam o usuario dele.
        Map<String, Double> vector
) {
}
