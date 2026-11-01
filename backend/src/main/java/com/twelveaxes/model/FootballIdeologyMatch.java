package com.twelveaxes.model;

public record FootballIdeologyMatch(
        String footballIdeologyId,
        String name,
        String category,
        String description,
        String longDescription,
        String phrase,
        double compatibility,
        double compatibilityPercentile,
        String teamName,
        String managerName
) {
}
