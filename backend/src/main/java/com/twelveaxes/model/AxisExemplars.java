package com.twelveaxes.model;

import java.util.List;

/** Treinadores do catálogo que mais puxam para cada polo de um eixo. */
public record AxisExemplars(
        String axisId,
        List<AxisExemplar> left,
        List<AxisExemplar> right
) {
    public record AxisExemplar(
            String id,
            String name,
            String period,
            String imagePath,
            double leftPercent
    ) {
    }
}
