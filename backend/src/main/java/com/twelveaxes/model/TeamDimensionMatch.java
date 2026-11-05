package com.twelveaxes.model;

/**
 * Time mais compatível dentro de uma dimensão do perfil (tática, filosofia ou gestão).
 */
public record TeamDimensionMatch(
        String dimension,
        TeamMatch match
) {
}
