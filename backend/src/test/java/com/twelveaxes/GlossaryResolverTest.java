package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.twelveaxes.model.GlossaryEntry;
import com.twelveaxes.model.Pole;
import com.twelveaxes.model.Question;
import com.twelveaxes.model.QuestionTerm;
import com.twelveaxes.service.GlossaryResolver;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class GlossaryResolverTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static Question question(String text) {
        return new Question("q", "axis", text, Pole.LEFT, 1, null, null, null);
    }

    private static GlossaryEntry entry(String id, String... match) {
        return new GlossaryEntry(id, "Termo " + id, "Definição de " + id, List.of(match));
    }

    private static List<QuestionTerm> termsOf(String text, GlossaryEntry... glossary) {
        return GlossaryResolver.attach(List.of(question(text)), List.of(glossary), "test").get(0).terms();
    }

    @Test
    void marksTheMatchedSpanKeepingTheTextUntouched() {
        String text = "O Banco Central deve obedecer ao governo.";
        List<QuestionTerm> terms = termsOf(text, entry("bc", "banco central"));

        assertThat(terms).hasSize(1);
        assertThat(text.substring(terms.get(0).start(), terms.get(0).end())).isEqualTo("Banco Central");
        assertThat(terms.get(0).definition()).isEqualTo("Definição de bc");
    }

    @Test
    void onlyMatchesWholeWords() {
        assertThat(termsOf("Uma ideia nova.", entry("ia", "IA"))).isEmpty();
        assertThat(termsOf("Devemos ampliar o uso de IA.", entry("ia", "IA"))).hasSize(1);
    }

    @Test
    void longestOverlappingMatchWinsAndEachTermAppearsOnce() {
        List<QuestionTerm> terms = termsOf(
                "Cadeias estratégicas e setores estratégicos.",
                entry("cadeias", "cadeias estratégicas"),
                entry("estrategico", "estratégicas", "estratégicos")
        );

        assertThat(terms).extracting(QuestionTerm::term).containsExactly("Termo cadeias", "Termo estrategico");
        assertThat(terms.get(0).start()).isZero();
        assertThat(terms.get(1).start()).isGreaterThan(terms.get(0).end());
    }

    @Test
    void rejectsIncompleteOrDuplicateEntries() {
        assertThatThrownBy(() -> GlossaryResolver.attach(List.of(), List.of(entry("a"), entry("a")), "test"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> GlossaryResolver.attach(List.of(), List.of(new GlossaryEntry("a", "T", " ", List.of())), "test"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> GlossaryResolver.attach(List.of(), List.of(entry("a", " ")), "test"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void everyGlossaryTermShowsUpInTheShippedQuestionsOfEachLanguage() throws IOException {
        List<GlossaryEntry> pt = read("data/glossary.json", new TypeReference<>() {});
        List<GlossaryEntry> en = read("data/i18n/en/glossary.json", new TypeReference<>() {});
        List<Question> ptQuestions = read("data/questions-pool.json", new TypeReference<List<Question>>() {});
        Map<String, String> enText = read("data/i18n/en/questions.json", new TypeReference<List<Map<String, String>>>() {})
                .stream().collect(Collectors.toMap(item -> item.get("id"), item -> item.get("text")));
        List<Question> enQuestions = ptQuestions.stream().map(q -> q.withText(enText.get(q.id()))).toList();

        assertThat(en.stream().map(GlossaryEntry::id).toList())
                .containsExactlyInAnyOrderElementsOf(pt.stream().map(GlossaryEntry::id).toList());
        assertUsed(pt, GlossaryResolver.attach(ptQuestions, pt, "glossary.json"));
        assertUsed(en, GlossaryResolver.attach(enQuestions, en, "i18n/en/glossary.json"));
    }

    // Um termo com trechos deve aparecer em alguma pergunta; senão o trecho está errado.
    private static void assertUsed(List<GlossaryEntry> glossary, List<Question> questions) {
        Map<String, Long> hits = questions.stream()
                .flatMap(q -> q.terms().stream())
                .collect(Collectors.groupingBy(QuestionTerm::term, Collectors.counting()));
        Map<String, GlossaryEntry> withMatch = glossary.stream()
                .filter(entry -> !entry.match().isEmpty())
                .collect(Collectors.toMap(GlossaryEntry::term, Function.identity(), (a, b) -> a));
        assertThat(hits.keySet()).containsAll(withMatch.keySet());
    }

    private static <T> T read(String path, TypeReference<T> type) throws IOException {
        try (InputStream input = new ClassPathResource(path).getInputStream()) {
            return MAPPER.readValue(input, type);
        }
    }
}
