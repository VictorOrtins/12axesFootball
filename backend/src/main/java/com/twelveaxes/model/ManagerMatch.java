package com.twelveaxes.model;

import java.util.Map;

public record ManagerMatch(
        String managerId,
        String name,
        String category,
        String period,
        String description,
        String imagePath,
        String imageSourceName,
        String imageSourceUrl,
        String imageNote,
        double compatibility,
        double compatibilityPercentile,
        // Vetor de 12 eixos (leftPercent) do treinador, usado pelo front para
        // mostrar os eixos que aproximam o usuario dele.
        Map<String, Double> vector
) {
}
