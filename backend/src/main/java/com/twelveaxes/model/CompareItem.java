package com.twelveaxes.model;

/**
 * Entrada leve do catalogo de comparacao (busca da tela de resultados).
 *
 * @param type "manager", "team" ou "football-ideology"
 * @param id identificador do perfil no catalogo do tipo
 * @param name nome exibido
 * @param caption linha de apoio: periodo (treinador, time) ou categoria (ideia de jogo)
 * @param imagePath foto ou escudo; null para ideias de jogo, que nao tem imagem
 * @param category categoria do perfil
 */
public record CompareItem(
        String type,
        String id,
        String name,
        String caption,
        String imagePath,
        String category
) {
}
