package com.twelveaxes.service;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.ManagerDimensionMatch;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.ManagerMatch;
import com.twelveaxes.model.ManagerProfile;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Treinador mais compativel com o usuario em cada dimensao do perfil.
 *
 * A compatibilidade geral soma os 12 eixos e responde "com quem voce mais se
 * parece". Estas tres respondem algo mais especifico: com quem voce combina
 * TATICAMENTE, FILOSOFICAMENTE e NA GESTAO, olhando so os eixos daquele grupo.
 */
@Service
public class ManagerDimensionMatcherService {
    /** Posse, progressao, estrutura, largura, bloco e marcacao. */
    public static final List<String> TACTICS_AXES = List.of("pos", "pro", "est", "lar", "blo", "mar");

    /** Plano de jogo, proposito, quem decide e tipo de jogador. */
    public static final List<String> PHILOSOPHY_AXES = List.of("pla", "res", "sis", "jog");

    /** Elenco e lideranca. */
    public static final List<String> MANAGEMENT_AXES = List.of("bas", "lid");

    public static final String TACTICS = "tactics";
    public static final String PHILOSOPHY = "philosophy";
    public static final String MANAGEMENT = "management";

    private final QuizDataService dataService;
    private final ProfileMatchScorer profileMatchScorer;

    public ManagerDimensionMatcherService(QuizDataService dataService, ProfileMatchScorer profileMatchScorer) {
        this.dataService = dataService;
        this.profileMatchScorer = profileMatchScorer;
    }

    /**
     * As tres dimensoes, na ordem tatica, filosofia, gestao.
     *
     * @param excludeId treinador a deixar de fora, normalmente a mais
     *                  compativel no geral: a secao se chama "tambem proximos",
     *                  entao repetir quem ja aparece como destaque nao acrescenta
     *                  nada ao leitor.
     */
    public List<ManagerDimensionMatch> findAll(List<AxisResult> axisResults, String lang, String excludeId) {
        List<ManagerDimensionMatch> matches = new ArrayList<>();
        Set<String> excludedIds = new LinkedHashSet<>();
        if (excludeId != null) {
            excludedIds.add(excludeId);
        }
        addIfPresent(matches, excludedIds, TACTICS, TACTICS_AXES, axisResults, lang);
        addIfPresent(matches, excludedIds, PHILOSOPHY, PHILOSOPHY_AXES, axisResults, lang);
        addIfPresent(matches, excludedIds, MANAGEMENT, MANAGEMENT_AXES, axisResults, lang);
        return List.copyOf(matches);
    }

    public List<ManagerDimensionMatch> findAll(List<AxisResult> axisResults, String lang) {
        return findAll(axisResults, lang, null);
    }

    private void addIfPresent(
            List<ManagerDimensionMatch> matches,
            Set<String> excludedIds,
            String dimension,
            List<String> axisIds,
            List<AxisResult> axisResults,
            String lang) {
        ManagerMatch match = findBestFor(axisIds, axisResults, lang, excludedIds);
        if (match != null) {
            matches.add(new ManagerDimensionMatch(dimension, match));
            excludedIds.add(match.managerId());
        }
    }

    private ManagerMatch findBestFor(
            List<String> axisIds,
            List<AxisResult> axisResults,
            String lang,
            Set<String> excludedIds) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);
        List<Manager> managers = dataService.getManagers(QuizDataService.normalizeLang(lang)).stream()
                .filter(manager -> !excludedIds.contains(manager.id()))
                .toList();
        if (managers.isEmpty()) {
            return null;
        }

        Comparator<Scored> byScore = Comparator.comparingDouble(Scored::score).reversed();
        Comparator<Scored> byName = Comparator.comparing(scored -> scored.manager().name());

        List<Scored> scored = managers.stream()
                .map(manager -> new Scored(
                        manager,
                        profileMatchScorer.compatibility(userVector, targetVectorFor(manager), axisIds)))
                .sorted(byScore.thenComparing(byName))
                .toList();

        // O percentil compara a nota da dimensao com as notas da mesma dimensao,
        // nunca com as dos 12 eixos.
        List<Double> allScores = scored.stream().map(Scored::score).toList();
        Scored best = scored.getFirst();
        return toMatch(best, profileMatchScorer.percentile(best.score(), allScores));
    }

    private ManagerMatch toMatch(Scored scored, double percentile) {
        Manager manager = scored.manager();
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
                profileMatchScorer.displayScore(scored.score()),
                percentile,
                targetVectorFor(manager));
    }

    private Map<String, Double> targetVectorFor(Manager manager) {
        ManagerProfile profile = dataService.getManagerProfiles().get(manager.id());
        if (profile != null && profile.vector() != null && !profile.vector().isEmpty()) {
            return profile.vector();
        }
        return profileMatchScorer.neutralVector();
    }

    private record Scored(Manager manager, double score) {
    }
}
