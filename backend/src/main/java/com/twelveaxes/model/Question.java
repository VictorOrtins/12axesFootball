package com.twelveaxes.model;

import java.util.List;

/**
 * @param secondary segundo eixo que a pergunta também mede, com peso menor; null quando só mede um
 * @param terms termos do glossário encontrados no texto, em ordem de aparição (nunca nulo)
 * @param help  explicação do que significa concordar e discordar; null quando ainda não foi escrita
 */
public record Question(
        String id,
        String axisId,
        String text,
        Pole agreePole,
        double weight,
        Secondary secondary,
        List<QuestionTerm> terms,
        QuestionHelp help
) {
    public record Secondary(String axisId, Pole agreePole, double weight) {
    }

    public Question {
        terms = terms == null ? List.of() : List.copyOf(terms);
    }

    public Question withText(String newText) {
        return new Question(id, axisId, newText, agreePole, weight, secondary, terms, help);
    }

    public Question withTerms(List<QuestionTerm> newTerms) {
        return new Question(id, axisId, text, agreePole, weight, secondary, newTerms, help);
    }

    public Question withHelp(QuestionHelp newHelp) {
        return new Question(id, axisId, text, agreePole, weight, secondary, terms, newHelp);
    }
}
