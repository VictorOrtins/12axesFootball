package com.twelveaxes.model;

import java.util.Map;

public record TeamProfile(
        String teamId,
        Map<String, Double> vector
) {
}
