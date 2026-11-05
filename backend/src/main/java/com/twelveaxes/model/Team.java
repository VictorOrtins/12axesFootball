package com.twelveaxes.model;

import java.util.Map;

/**
 * Um time em uma era ("Liverpool 2021/22", "Holanda, Copa de 1974").
 *
 * @param period a era do perfil, como texto de exibição
 * @param imagePath escudo ou foto do time nos recursos da aplicação
 */
public record Team(
        String id,
        String name,
        String category,
        String description,
        String period,
        String imagePath,
        String imageSourceName,
        String imageSourceUrl,
        String imageNote,
        Map<String, Double> vector
) {
}
