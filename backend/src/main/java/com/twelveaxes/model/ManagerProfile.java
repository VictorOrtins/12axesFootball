package com.twelveaxes.model;

import java.util.Map;

public record ManagerProfile(
        String managerId,
        Map<String, Double> vector,
        double hubOffset
) {
}
