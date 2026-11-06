package com.twelveaxes.service;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.Team;
import com.twelveaxes.model.TeamMatch;
import com.twelveaxes.model.TeamProfile;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class TeamMatcherService {
    private static final int BOTTOM_MATCHES = 3;
    private static final int TOP_MATCHES = 3;

    private final QuizDataService dataService;
    private final ProfileMatchScorer profileMatchScorer;
    private final RequestMemo<List<Object>, List<TeamMatch>> rankingMemo = new RequestMemo<>();

    public TeamMatcherService(QuizDataService dataService, ProfileMatchScorer profileMatchScorer) {
        this.dataService = dataService;
        this.profileMatchScorer = profileMatchScorer;
    }

    public TeamMatch findTopMatch(List<AxisResult> axisResults) {
        return findTopMatch(axisResults, QuizDataService.LANG_PT);
    }

    // Time mais compativel; null com o catalogo vazio.
    public TeamMatch findTopMatch(List<AxisResult> axisResults, String lang) {
        return rankAll(axisResults, lang).stream().findFirst().orElse(null);
    }

    // Os tres times mais compativeis, em ordem decrescente.
    public List<TeamMatch> findTopMatches(List<AxisResult> axisResults, String lang) {
        return rankAll(axisResults, lang).stream()
                .limit(TOP_MATCHES)
                .toList();
    }

    // Os tres menos compativeis do catalogo inteiro, em ordem crescente.
    public List<TeamMatch> findBottomMatches(List<AxisResult> axisResults, String lang) {
        List<TeamMatch> ranking = rankAll(axisResults, lang);
        return ranking.stream()
                .skip(Math.max(0, ranking.size() - BOTTOM_MATCHES))
                .sorted(Comparator.comparingDouble(TeamMatch::compatibility))
                .toList();
    }

    // Ranking completo do catalogo, do mais ao menos compativel. O percentil
    // compara com o catalogo inteiro.
    private List<TeamMatch> rankAll(List<AxisResult> axisResults, String lang) {
        return rankingMemo.get(List.of(QuizDataService.normalizeLang(lang), axisResults),
                () -> computeRanking(axisResults, lang));
    }

    private List<TeamMatch> computeRanking(List<AxisResult> axisResults, String lang) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);

        Comparator<TeamCandidate> byCompatibility =
                Comparator.comparingDouble(TeamCandidate::compatibility).reversed();
        Comparator<TeamCandidate> byName = Comparator.comparing(candidate -> candidate.team().name());

        List<TeamCandidate> candidates = dataService.getTeams(QuizDataService.normalizeLang(lang)).stream()
                .map(team -> toCandidate(team, userVector))
                .toList();
        List<Double> catalogScores = candidates.stream()
                .map(TeamCandidate::compatibility)
                .toList();

        double[] percentiles = profileMatchScorer.percentiles(catalogScores);
        return java.util.stream.IntStream.range(0, candidates.size())
                .mapToObj(i -> new TeamCandidate(candidates.get(i).team(), candidates.get(i).compatibility(), percentiles[i]))
                .sorted(byCompatibility.thenComparing(byName))
                .map(this::toMatch)
                .toList();
    }

    private TeamCandidate toCandidate(Team team, Map<String, Double> userVector) {
        TeamProfile profile = dataService.getTeamProfiles().get(team.id());
        Map<String, Double> targetVector = targetVectorFor(team, profile);
        double compatibility = profileMatchScorer.compatibility(userVector, targetVector);
        return new TeamCandidate(team, compatibility, 0.0);
    }

    private TeamMatch toMatch(TeamCandidate candidate) {
        Team team = candidate.team();
        return new TeamMatch(
                team.id(),
                team.name(),
                team.category(),
                team.description(),
                team.period(),
                team.imagePath(),
                team.imageSourceName(),
                team.imageSourceUrl(),
                team.imageNote(),
                profileMatchScorer.displayScore(candidate.compatibility()),
                candidate.compatibilityPercentile(),
                targetVectorFor(team, dataService.getTeamProfiles().get(team.id()))
        );
    }

    private Map<String, Double> targetVectorFor(Team team, TeamProfile profile) {
        if (profile != null && profile.vector() != null && !profile.vector().isEmpty()) {
            return profile.vector();
        }
        if (team.vector() != null && !team.vector().isEmpty()) {
            return team.vector();
        }
        return profileMatchScorer.neutralVector();
    }

    private record TeamCandidate(Team team, double compatibility, double compatibilityPercentile) {
    }
}
