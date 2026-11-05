package com.twelveaxes.model;

import java.util.Map;

public record FootballIdeologyProfile(
        String footballIdeologyId,
        Map<String, Double> vector
) {
}
