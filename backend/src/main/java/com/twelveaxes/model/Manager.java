package com.twelveaxes.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Um treinador, perfilado pelo trabalho que o tornou conhecido.
 *
 * @param period anos dos trabalhos que contam no perfil, como texto de exibição
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Manager(
        String id,
        String name,
        String category,
        String period,
        String description,
        String imagePath,
        String imageSourceName,
        String imageSourceUrl,
        String imageNote
) {
}
