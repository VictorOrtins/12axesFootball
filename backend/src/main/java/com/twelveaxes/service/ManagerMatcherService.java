package com.twelveaxes.service;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.ManagerMatch;
import com.twelveaxes.model.ManagerProfile;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ManagerMatcherService {
    private static final int TOP_MATCHES = 8;
    private static final int CATEGORY_MATCHES = 3;
    private static final int BOTTOM_MATCHES = 3;

    private final QuizDataService dataService;
    private final ProfileMatchScorer profileMatchScorer;
    private final RequestMemo<List<Object>, List<ManagerMatch>> rankingMemo = new RequestMemo<>();

    public ManagerMatcherService(QuizDataService dataService, ProfileMatchScorer profileMatchScorer) {
        this.dataService = dataService;
        this.profileMatchScorer = profileMatchScorer;
    }

    public List<ManagerMatch> findMatches(List<AxisResult> axisResults) {
        return findMatches(axisResults, QuizDataService.LANG_PT);
    }

    public List<ManagerMatch> findMatches(List<AxisResult> axisResults, String lang) {
        return rankAll(axisResults, lang).stream()
                .limit(TOP_MATCHES)
                .toList();
    }

    public ManagerMatch findTopMatch(List<AxisResult> axisResults) {
        return findTopMatch(axisResults, QuizDataService.LANG_PT);
    }

    public ManagerMatch findTopMatch(List<AxisResult> axisResults, String lang) {
        return findMatches(axisResults, lang).stream().findFirst().orElse(null);
    }

    // Tres treinadores de categorias distintas entre si e diferentes da
    // categoria da mais compativel: percorre o ranking de cima para baixo e
    // pega a primeira de cada categoria ainda nao vista.
    public List<ManagerMatch> findCategoryMatches(List<AxisResult> axisResults, String lang) {
        List<ManagerMatch> ranking = rankAll(axisResults, lang);
        if (ranking.isEmpty()) {
            return List.of();
        }

        Set<String> categoriasVistas = new LinkedHashSet<>();
        categoriasVistas.add(ranking.getFirst().category());

        List<ManagerMatch> selecionadas = new ArrayList<>();
        for (ManagerMatch match : ranking) {
            if (selecionadas.size() == CATEGORY_MATCHES) {
                break;
            }
            if (categoriasVistas.add(match.category())) {
                selecionadas.add(match);
            }
        }
        return List.copyOf(selecionadas);
    }

    // O treinador mais compativel de CADA categoria do catalogo, da categoria
    // mais compativel para a menos. Diferente de findCategoryMatches, que so
    // devolve tres: aqui nenhuma categoria fica de fora.
    public List<ManagerMatch> findBestPerCategory(List<AxisResult> axisResults, String lang) {
        Map<String, ManagerMatch> melhorPorCategoria = new LinkedHashMap<>();
        for (ManagerMatch match : rankAll(axisResults, lang)) {
            if (match.category() != null) {
                melhorPorCategoria.putIfAbsent(match.category(), match);
            }
        }
        return melhorPorCategoria.values().stream()
                .sorted(Comparator.comparingDouble(ManagerMatch::compatibility).reversed())
                .toList();
    }

    // As tres menos compativeis do catalogo inteiro, em ordem crescente.
    public List<ManagerMatch> findBottomMatches(List<AxisResult> axisResults, String lang) {
        List<ManagerMatch> ranking = rankAll(axisResults, lang);
        return ranking.stream()
                .skip(Math.max(0, ranking.size() - BOTTOM_MATCHES))
                .sorted(Comparator.comparingDouble(ManagerMatch::compatibility))
                .toList();
    }

    // Ranking completo do catalogo, do mais ao menos compativel. Todos os
    // recortes (topo, categorias, opostos) saem desta mesma lista. O percentil
    // compara com o catalogo inteiro.
    private List<ManagerMatch> rankAll(List<AxisResult> axisResults, String lang) {
        return rankingMemo.get(List.of(QuizDataService.normalizeLang(lang), axisResults),
                () -> computeRanking(axisResults, lang));
    }

    private List<ManagerMatch> computeRanking(List<AxisResult> axisResults, String lang) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);

        Comparator<ManagerCandidate> byScore =
                Comparator.comparingDouble(ManagerCandidate::compatibility).reversed();
        Comparator<ManagerCandidate> byName = Comparator.comparing(candidate -> candidate.manager().name());

        List<ManagerCandidate> candidates = dataService.getManagers(QuizDataService.normalizeLang(lang)).stream()
                .map(manager -> toCandidate(manager, userVector))
                .toList();
        List<Double> catalogScores = candidates.stream()
                .map(ManagerCandidate::compatibility)
                .toList();

        double[] percentiles = profileMatchScorer.percentiles(catalogScores);
        return java.util.stream.IntStream.range(0, candidates.size())
                .mapToObj(i -> new ManagerCandidate(candidates.get(i).manager(), candidates.get(i).compatibility(), percentiles[i]))
                .sorted(byScore.thenComparing(byName))
                .map(this::toMatch)
                .toList();
    }

    private ManagerCandidate toCandidate(Manager manager, Map<String, Double> userVector) {
        double compatibility = profileMatchScorer.compatibility(userVector, targetVectorFor(manager));
        return new ManagerCandidate(manager, compatibility, 0.0);
    }

    private ManagerMatch toMatch(ManagerCandidate candidate) {
        Manager manager = candidate.manager();
        return new ManagerMatch(
                manager.id(),
                manager.name(),
                manager.category(),
                manager.period(),
                manager.description(),
                manager.imagePath(),
                manager.imageSourceName(),
                manager.imageSourceUrl(),
                manager.imageNote(),
                candidate.compatibility(),
                candidate.compatibilityPercentile(),
                targetVectorFor(manager)
        );
    }

    private Map<String, Double> targetVectorFor(Manager manager) {
        ManagerProfile profile = dataService.getManagerProfiles().get(manager.id());
        if (profile != null && profile.vector() != null && !profile.vector().isEmpty()) {
            return profile.vector();
        }
        return profileMatchScorer.neutralVector();
    }

    private record ManagerCandidate(
            Manager manager,
            double compatibility,
            double compatibilityPercentile
    ) {
    }
}
