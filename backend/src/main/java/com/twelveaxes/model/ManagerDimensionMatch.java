package com.twelveaxes.model;

/**
 * Treinador mais compativel com o usuario em UMA dimensao do perfil
 * (tatica, filosofia ou gestao), e nao nos 12 eixos somados.
 *
 * Responde "com quem eu combino taticamente?", que e uma pergunta diferente de
 * "com quem eu combino no geral": alguem pode jogar como um treinador e montar
 * o elenco como outro.
 *
 * @param dimension identificador da dimensao (tactics, philosophy, management)
 */
public record ManagerDimensionMatch(
        String dimension,
        ManagerMatch match
) {
}
