package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;

import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.FootballIdeologyMatch;
import com.twelveaxes.model.Pole;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.SubmittedAnswer;
import com.twelveaxes.service.FootballIdeologyMatcherService;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class FootballIdeologyMatcherServiceTest {
    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ScoringService scoringService;

    @Autowired
    private FootballIdeologyMatcherService matcherService;

    @Test
    void everyIdeologyHasAnExplicitProfile() {
        var profileIds = dataService.getFootballIdeologyProfiles().keySet();
        var ideologyIds = dataService.getFootballIdeologies(QuizDataService.LANG_PT).stream()
                .map(i -> i.id())
                .toList();

        assertThat(ideologyIds).isNotEmpty();
        assertThat(profileIds).containsExactlyInAnyOrderElementsOf(ideologyIds);
    }

    @Test
    void everyIdeologyProfileUsesTheTwelveKnownAxes() {
        var axisIds = dataService.getAxes().stream()
                .map(axis -> axis.id())
                .toList();

        assertThat(dataService.getFootballIdeologyProfiles().values())
                .allSatisfy(profile -> {
                    assertThat(profile.vector().keySet())
                            .as("Profile %s must define exactly the known axes", profile.footballIdeologyId())
                            .containsExactlyInAnyOrderElementsOf(axisIds);
                    assertThat(profile.vector().values())
                            .as("Profile %s values must be percentages", profile.footballIdeologyId())
                            .allSatisfy(value -> assertThat(value).isBetween(0.0, 100.0));
                });
    }

    @Test
    void canonicalVectorsMatchTheirOwnIdeologies() {
        List.of("fx-proativo", "fx-reativo", "fx-tatico", "fx-gestor").forEach(footballIdeologyId -> {
            var profile = dataService.getFootballIdeologyProfiles().get(footballIdeologyId);

            assertThat(profile)
                    .as("Perfil canônico deve existir para %s", footballIdeologyId)
                    .isNotNull();

            var matches = matcherService.findMatches(axisResults(profile.vector()));

            assertThat(matches)
                    .as("Vetor canônico de %s deve produzir matches", footballIdeologyId)
                    .isNotEmpty();
            assertThat(matches.getFirst().footballIdeologyId())
                    .as("Vetor canônico de %s deve retornar a própria ideologia", footballIdeologyId)
                    .isEqualTo(footballIdeologyId);
            assertThat(matches.getFirst().compatibility())
                    .as("Vetor canônico de %s deve ter compatibilidade perfeita", footballIdeologyId)
                    .isEqualTo(100.0);
        });
    }

    @Test
    void neutralAnswersFavorTheBalancedIdea() {
        List<SubmittedAnswer> answers = dataService.getQuestions().stream()
                .map(q -> new SubmittedAnswer(q.id(), AnswerValue.NEUTRAL))
                .toList();
        var axes = scoringService.score(new ResultRequest(answers));

        List<FootballIdeologyMatch> matches = matcherService.findMatches(axes);

        assertThat(matches).isNotEmpty();
        assertThat(matches.get(0).footballIdeologyId()).isEqualTo("fx-equilibrio");
        assertThat(Double.isFinite(matches.get(0).compatibility())).isTrue();
        // Topo de um catalogo de 6 ideias: percentil 5/6.
        assertThat(matches.get(0).compatibilityPercentile()).isGreaterThan(80.0);
    }

    @Test
    void rankedMatchesAreReturnedInCompatibilityOrder() {
        var axes = axisResults(Map.ofEntries(
                Map.entry("pos", 75.0),
                Map.entry("pro", 18.8),
                Map.entry("est", 62.5),
                Map.entry("lar", 87.5),
                Map.entry("blo", 62.5),
                Map.entry("mar", 56.3),
                Map.entry("pla", 25.0),
                Map.entry("res", 43.8),
                Map.entry("sis", 43.8),
                Map.entry("jog", 81.3),
                Map.entry("bas", 0.0),
                Map.entry("lid", 87.5)
        ));

        var matches = matcherService.findMatches(axes);

        assertThat(matches).hasSize(4);
        for (int index = 1; index < matches.size(); index++) {
            assertThat(matches.get(index).compatibility())
                    .isLessThanOrEqualTo(matches.get(index - 1).compatibility());
        }
    }

    @Test
    void matchDescriptionsHaveShortAndDetailedVariants() {
        List<SubmittedAnswer> answers = dataService.getQuestions().stream()
                .map(q -> new SubmittedAnswer(q.id(), AnswerValue.NEUTRAL))
                .toList();
        var axes = scoringService.score(new ResultRequest(answers));

        var match = matcherService.findMatches(axes).get(0);

        assertThat(match.description()).isNotBlank();
        assertThat(match.longDescription()).contains("compatibilidade");
        assertThat(match.longDescription()).contains("taticamente, pressão alta; filosoficamente, identidade própria");
        assertThat(match.longDescription().length()).isGreaterThan(match.description().length());
    }

    @Test
    void leftPoleAnswersFavorTheProactiveIdea() {
        var matches = matcherService.findMatches(scoringService.score(new ResultRequest(answersToward(Pole.LEFT))));

        assertThat(matches).hasSize(4);
        assertThat(matches.getFirst().footballIdeologyId()).isEqualTo("fx-proativo");
    }

    @Test
    void rightPoleAnswersFavorTheReactiveIdea() {
        var matches = matcherService.findMatches(scoringService.score(new ResultRequest(answersToward(Pole.RIGHT))));

        assertThat(matches).hasSize(4);
        assertThat(matches.getFirst().footballIdeologyId()).isEqualTo("fx-reativo");
    }

    private List<SubmittedAnswer> answersToward(Pole pole) {
        return dataService.getQuestions().stream()
                .map(q -> new SubmittedAnswer(q.id(),
                        q.agreePole() == pole ? AnswerValue.STRONGLY_AGREE : AnswerValue.STRONGLY_DISAGREE))
                .toList();
    }

    private List<AxisResult> axisResults(Map<String, Double> vector) {
        return dataService.getAxes().stream()
                .map(axis -> {
                    double leftPercent = vector.getOrDefault(axis.id(), 50.0);
                    double rightPercent = Math.round((100.0 - leftPercent) * 10.0) / 10.0;
                    String dominantPole = leftPercent >= rightPercent ? axis.leftPole() : axis.rightPole();
                    return new AxisResult(
                            axis.id(),
                            axis.label(),
                            axis.leftPole(),
                            axis.rightPole(),
                            leftPercent,
                            rightPercent,
                            dominantPole,
                            ""
                    );
                })
                .toList();
    }
}
