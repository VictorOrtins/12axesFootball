package com.twelveaxes.service;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.Team;
import com.twelveaxes.model.TeamDimensionMatch;
import com.twelveaxes.model.TeamMatch;
import com.twelveaxes.model.TeamProfile;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Times mais próximos em cada dimensão do perfil (tática, filosofia, gestão).
 * Os times em destaque são excluídos, pois já aparecem acima na seção de times.
 */
@Service
public class TeamDimensionMatcherService {
    private final QuizDataService dataService;
    private final ProfileMatchScorer profileMatchScorer;

    public TeamDimensionMatcherService(QuizDataService dataService, ProfileMatchScorer profileMatchScorer) {
        this.dataService = dataService;
        this.profileMatchScorer = profileMatchScorer;
    }

    public List<TeamDimensionMatch> findAll(
            List<AxisResult> axisResults,
            String lang,
            List<String> excludeIds) {
        Set<String> excludedIds = new LinkedHashSet<>(excludeIds);
        List<TeamDimensionMatch> matches = new ArrayList<>();

        addIfPresent(matches, excludedIds, ManagerDimensionMatcherService.TACTICS,
                ManagerDimensionMatcherService.TACTICS_AXES, axisResults, lang);
        addIfPresent(matches, excludedIds, ManagerDimensionMatcherService.PHILOSOPHY,
                ManagerDimensionMatcherService.PHILOSOPHY_AXES, axisResults, lang);
        addIfPresent(matches, excludedIds, ManagerDimensionMatcherService.MANAGEMENT,
                ManagerDimensionMatcherService.MANAGEMENT_AXES, axisResults, lang);

        return List.copyOf(matches);
    }

    private void addIfPresent(
            List<TeamDimensionMatch> matches,
            Set<String> excludedIds,
            String dimension,
            List<String> axisIds,
            List<AxisResult> axisResults,
            String lang) {
        TeamMatch match = findBestFor(axisIds, axisResults, lang, excludedIds);
        if (match != null) {
            matches.add(new TeamDimensionMatch(dimension, match));
            excludedIds.add(match.teamId());
        }
    }

    private TeamMatch findBestFor(
            List<String> axisIds,
            List<AxisResult> axisResults,
            String lang,
            Set<String> excludedIds) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);
        List<Team> teams = dataService.getTeams(QuizDataService.normalizeLang(lang)).stream()
                .filter(team -> !excludedIds.contains(team.id()))
                .toList();
        if (teams.isEmpty()) {
            return null;
        }

        Comparator<Scored> byScore = Comparator.comparingDouble(Scored::score).reversed();
        Comparator<Scored> byName = Comparator.comparing(scored -> scored.team().name());
        List<Scored> scored = teams.stream()
                .map(team -> new Scored(
                        team,
                        profileMatchScorer.compatibility(userVector, targetVectorFor(team), axisIds)))
                .sorted(byScore.thenComparing(byName))
                .toList();

        List<Double> allScores = scored.stream().map(Scored::score).toList();
        Scored best = scored.getFirst();
        return toMatch(best, profileMatchScorer.percentile(best.score(), allScores));
    }

    private TeamMatch toMatch(Scored scored, double percentile) {
        Team team = scored.team();
        return new TeamMatch(
                team.id(), team.name(), team.category(), team.description(), team.period(),
                team.imagePath(), team.imageSourceName(), team.imageSourceUrl(), team.imageNote(),
                round1(scored.score()), percentile, targetVectorFor(team));
    }

    private Map<String, Double> targetVectorFor(Team team) {
        TeamProfile profile = dataService.getTeamProfiles().get(team.id());
        if (profile != null && profile.vector() != null && !profile.vector().isEmpty()) {
            return profile.vector();
        }
        if (team.vector() != null && !team.vector().isEmpty()) {
            return team.vector();
        }
        return profileMatchScorer.neutralVector();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record Scored(Team team, double score) {
    }
}
