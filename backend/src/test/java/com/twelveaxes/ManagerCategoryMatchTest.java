package com.twelveaxes;

import static org.assertj.core.api.Assertions.assertThat;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.ManagerMatch;
import com.twelveaxes.service.ManagerMatcherService;
import com.twelveaxes.service.QuizDataService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ManagerCategoryMatchTest {
    @Autowired
    private QuizDataService dataService;

    @Autowired
    private ManagerMatcherService matcherService;

    // Perfil de teste: mesma inclinacao em todos os eixos. Qualquer vetor
    // serve — as regras testadas valem para qualquer resultado.
    private List<AxisResult> axesDeTeste() {
        return dataService.getAxes().stream()
                .map(axis -> new AxisResult(
                        axis.id(), axis.label(), axis.leftPole(), axis.rightPole(),
                        72.0, 28.0, axis.leftPole(), "moderada"))
                .toList();
    }

    @Test
    void categoryMatchesReturnThreeDistinctCategories() {
        var categorias = matcherService.findCategoryMatches(axesDeTeste(), QuizDataService.LANG_PT).stream()
                .map(ManagerMatch::category)
                .toList();

        assertThat(categorias).hasSize(3).doesNotHaveDuplicates();
    }

    @Test
    void categoryMatchesExcludeTopMatchAndItsCategory() {
        var axes = axesDeTeste();
        var top = matcherService.findTopMatch(axes, QuizDataService.LANG_PT);
        var porCategoria = matcherService.findCategoryMatches(axes, QuizDataService.LANG_PT);

        assertThat(porCategoria)
                .noneMatch(match -> match.managerId().equals(top.managerId()))
                .noneMatch(match -> match.category().equals(top.category()));
    }

    @Test
    void bottomMatchesAreTheLeastCompatibleInAscendingOrder() {
        var axes = axesDeTeste();
        var opostas = matcherService.findBottomMatches(axes, QuizDataService.LANG_PT);
        var top = matcherService.findTopMatch(axes, QuizDataService.LANG_PT);

        assertThat(opostas).hasSize(3);
        assertThat(opostas.get(0).compatibility()).isLessThanOrEqualTo(opostas.get(1).compatibility());
        assertThat(opostas.get(1).compatibility()).isLessThanOrEqualTo(opostas.get(2).compatibility());
        assertThat(opostas.get(2).compatibility()).isLessThan(top.compatibility());
    }

    @Test
    void englishMatchesStillCarryCategory() {
        var porCategoria = matcherService.findCategoryMatches(axesDeTeste(), QuizDataService.LANG_EN);

        assertThat(porCategoria)
                .hasSize(3)
                .allSatisfy(match -> assertThat(match.category()).isNotBlank());
    }

    // A listagem geral exibe os oito treinadores mais compatíveis.
    @Test
    void generalMatchesReturnEight() {
        assertThat(matcherService.findMatches(axesDeTeste(), QuizDataService.LANG_PT)).hasSize(8);
    }
}
