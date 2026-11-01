package com.twelveaxes.service;

import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.FootballIdeology;
import com.twelveaxes.model.FootballIdeologyMatch;
import com.twelveaxes.model.FootballIdeologyProfile;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.Team;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class FootballIdeologyMatcherService {
    private static final int TOP_MATCHES = 4;

    private final QuizDataService dataService;
    private final ProfileMatchScorer profileMatchScorer;
    private final RequestMemo<List<Object>, List<IdeologyCandidate>> rankingMemo = new RequestMemo<>();

    public FootballIdeologyMatcherService(QuizDataService dataService, ProfileMatchScorer profileMatchScorer) {
        this.dataService = dataService;
        this.profileMatchScorer = profileMatchScorer;
    }

    public List<FootballIdeologyMatch> findMatches(List<AxisResult> axisResults) {
        return findMatches(axisResults, QuizDataService.LANG_PT);
    }

    public List<FootballIdeologyMatch> findMatches(List<AxisResult> axisResults, String lang) {
        return findRankedMatches(axisResults, lang);
    }

    // A ideia de jogo mais distante do usuario no catalogo inteiro; null com o catalogo vazio.
    public FootballIdeologyMatch findBottomMatch(List<AxisResult> axisResults, String lang) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);
        String normalizedLang = QuizDataService.normalizeLang(lang);
        List<IdeologyCandidate> ranking = rankCandidates(userVector, normalizedLang);
        if (ranking.isEmpty()) {
            return null;
        }
        return toMatch(ranking.getLast(), normalizedLang);
    }

    List<FootballIdeologyMatch> findRankedMatches(List<AxisResult> axisResults, String lang) {
        Map<String, Double> userVector = profileMatchScorer.userVectorFor(axisResults);
        String normalizedLang = QuizDataService.normalizeLang(lang);
        return rankCandidates(userVector, normalizedLang).stream()
                .limit(TOP_MATCHES)
                .map(candidate -> toMatch(candidate, normalizedLang))
                .toList();
    }

    private List<IdeologyCandidate> rankCandidates(Map<String, Double> userVector, String normalizedLang) {
        return rankingMemo.get(List.of(normalizedLang, userVector), () -> computeRanking(userVector, normalizedLang));
    }

    private List<IdeologyCandidate> computeRanking(Map<String, Double> userVector, String normalizedLang) {
        List<IdeologyCandidate> candidates = dataService.getFootballIdeologies(normalizedLang).stream()
                .map(ideology -> toCandidate(ideology, userVector))
                .toList();
        List<Double> catalogScores = candidates.stream()
                .map(IdeologyCandidate::compatibility)
                .toList();
        double[] percentiles = profileMatchScorer.percentiles(catalogScores);
        return java.util.stream.IntStream.range(0, candidates.size())
                .mapToObj(i -> new IdeologyCandidate(candidates.get(i).ideology(), candidates.get(i).targetVector(),
                        candidates.get(i).compatibility(), percentiles[i]))
                .sorted(byScoreThenName())
                .toList();
    }

    private Comparator<IdeologyCandidate> byScoreThenName() {
        return Comparator.comparingDouble(IdeologyCandidate::compatibility)
                .reversed()
                .thenComparing(candidate -> candidate.ideology().name());
    }

    private IdeologyCandidate toCandidate(FootballIdeology ideology, Map<String, Double> userVector) {
        Map<String, Double> targetVector = targetVectorFor(ideology);
        double compatibility = profileMatchScorer.compatibility(userVector, targetVector);
        return new IdeologyCandidate(ideology, targetVector, compatibility, 0.0);
    }

    private FootballIdeologyMatch toMatch(IdeologyCandidate candidate, String lang) {
        FootballIdeology ideology = candidate.ideology();
        String shortDescription = shortDescription(ideology.description());
        String longDescription = longDescription(ideology.description(), lang);
        Team team = ideology.teamId() == null ? null : dataService.getTeamById(ideology.teamId(), lang);
        Manager manager = ideology.managerId() == null ? null : dataService.getManagerById(ideology.managerId(), lang);
        return new FootballIdeologyMatch(
                ideology.id(),
                ideology.name(),
                ideology.category(),
                shortDescription,
                longDescription,
                ideology.phrase(),
                candidate.compatibility(),
                candidate.compatibilityPercentile(),
                team == null ? null : team.name(),
                manager == null ? null : manager.name()
        );
    }

    private Map<String, Double> targetVectorFor(FootballIdeology ideology) {
        FootballIdeologyProfile profile = dataService.getFootballIdeologyProfiles().get(ideology.id());
        if (profile != null && profile.vector() != null && !profile.vector().isEmpty()) {
            return profile.vector();
        }
        if (ideology.vector() != null && !ideology.vector().isEmpty()) {
            return ideology.vector();
        }
        return profileMatchScorer.neutralVector();
    }

    private String shortDescription(String rawDescription) {
        DescriptionParts parts = splitDescription(cleanDescription(rawDescription));
        String[] sentences = parts.summary().split("(?<=[.!?])\\s+");
        String summary = sentences.length == 0 ? parts.summary() : sentences[0];
        if (sentences.length > 1 && summary.length() < 140) {
            summary = summary + " " + sentences[1];
        }
        return abbreviate(summary, 230);
    }

    private String longDescription(String rawDescription, String lang) {
        boolean en = QuizDataService.LANG_EN.equals(lang);
        DescriptionParts parts = splitDescription(cleanDescription(rawDescription));
        StringBuilder description = new StringBuilder(parts.summary());
        if (!parts.summary().endsWith(".")) {
            description.append(".");
        }
        description.append(en
                ? " Compatibility indicates how close your answers are to this profile."
                : " A compatibilidade indica proximidade entre suas respostas e esse perfil.");
        if (!parts.isEmpty()) {
            if (en) {
                description.append(" ")
                        .append("In practical terms: tactically, ")
                        .append(parts.tactics())
                        .append("; philosophically, ")
                        .append(parts.philosophy())
                        .append("; in management, ")
                        .append(parts.management())
                        .append(".");
            } else {
                description.append(" ")
                        .append("Em termos práticos: taticamente, ")
                        .append(parts.tactics())
                        .append("; filosoficamente, ")
                        .append(parts.philosophy())
                        .append("; na gestão, ")
                        .append(parts.management())
                        .append(".");
            }
        }
        return description.toString();
    }

    private DescriptionParts splitDescription(String cleanDescription) {
        String[] split = cleanDescription.split("\\s+Taticamente:", 2);
        String summary = split[0].trim();
        if (split.length == 1) {
            return new DescriptionParts(summary, "", "", "");
        }

        String[] fields = split[1].split("\\s+\\|\\s+");
        String tactics = fields.length > 0 ? fields[0].trim() : "";
        String philosophy = fields.length > 1 ? fields[1].replaceFirst("^Filosoficamente:\\s*", "").trim() : "";
        String management = fields.length > 2 ? fields[2].replaceFirst("^Na gestão:\\s*", "").trim() : "";
        return new DescriptionParts(summary, normalizeProfileField(tactics), normalizeProfileField(philosophy), normalizeProfileField(management));
    }

    private String normalizeProfileField(String value) {
        if (value == null || value.isBlank()) {
            return "variável conforme o contexto";
        }
        return value.substring(0, 1).toLowerCase(Locale.ROOT) + value.substring(1);
    }

    private String cleanDescription(String rawDescription) {
        String description = rawDescription == null ? "" : rawDescription.trim().replaceAll("\\s+", " ");
        int noteIndex = description.indexOf("NOTA METODOLÓGICA");
        if (noteIndex >= 0) {
            description = description.substring(0, noteIndex).trim();
        }
        return description;
    }

    private String abbreviate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        int cut = value.lastIndexOf(' ', maxLength - 1);
        if (cut < maxLength / 2) {
            cut = maxLength - 1;
        }
        return value.substring(0, cut).trim() + "...";
    }

    private record DescriptionParts(String summary, String tactics, String philosophy, String management) {
        private boolean isEmpty() {
            return tactics.isBlank() && philosophy.isBlank() && management.isBlank();
        }
    }

    private record IdeologyCandidate(
            FootballIdeology ideology,
            Map<String, Double> targetVector,
            double compatibility,
            double compatibilityPercentile
    ) {
    }
}
