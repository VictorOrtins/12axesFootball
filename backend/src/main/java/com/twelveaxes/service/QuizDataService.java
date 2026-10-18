package com.twelveaxes.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.twelveaxes.model.AnswerOption;
import com.twelveaxes.model.ArchetypeQuestion;
import com.twelveaxes.model.AnswerValue;
import com.twelveaxes.model.Axis;
import com.twelveaxes.model.FootballIdeology;
import com.twelveaxes.model.FootballIdeologyProfile;
import com.twelveaxes.model.GlossaryEntry;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.ManagerProfile;
import com.twelveaxes.model.Question;
import com.twelveaxes.model.QuestionHelpEntry;
import com.twelveaxes.model.QuizPayload;
import com.twelveaxes.model.Team;
import com.twelveaxes.model.TeamProfile;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuizDataService {
    public static final String SHORT_VARIANT = "short";
    public static final String EXTENDED_VARIANT = "extended";

    public static final String LANG_PT = "pt";
    public static final String LANG_EN = "en";

    private final ObjectMapper objectMapper;
    private Map<String, LocaleBundle> bundles;
    private Map<String, FootballIdeologyProfile> footballIdeologyProfiles;
    private Map<String, TeamProfile> teamProfiles;
    private Map<String, ManagerProfile> managerProfiles;
    private List<ArchetypeQuestion> archetypeQuestions;

    // Textos por locale: profiles/vetores são independentes de idioma e ficam fora do bundle.
    private record LocaleBundle(
            List<Axis> axes,
            List<Question> questions,
            List<FootballIdeology> footballIdeologies,
            Map<String, FootballIdeology> footballIdeologiesById,
            List<Team> teams,
            Map<String, Team> teamsById,
            List<Manager> managers,
            Map<String, Manager> managersById
    ) {
        static LocaleBundle of(
                List<Axis> axes,
                List<Question> questions,
                List<FootballIdeology> footballIdeologies,
                List<Team> teams,
                List<Manager> managers
        ) {
            return new LocaleBundle(
                    axes,
                    questions,
                    footballIdeologies,
                    footballIdeologies.stream().collect(Collectors.toUnmodifiableMap(FootballIdeology::id, Function.identity())),
                    teams,
                    teams.stream().collect(Collectors.toUnmodifiableMap(Team::id, Function.identity())),
                    managers,
                    managers.stream().collect(Collectors.toUnmodifiableMap(Manager::id, Function.identity()))
            );
        }
    }

    public QuizDataService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void loadData() throws IOException {
        List<Axis> axes = readJson("data/axes.json", new TypeReference<>() {});
        List<Question> questions = QuestionHelpResolver.attach(
                GlossaryResolver.attach(
                        readJson("data/questions-pool.json", new TypeReference<>() {}),
                        readJson("data/glossary.json", new TypeReference<List<GlossaryEntry>>() {}),
                        "glossary.json"
                ),
                readOptionalJson("data/question-help.json", new TypeReference<List<QuestionHelpEntry>>() {}),
                "question-help.json"
        );
        List<FootballIdeology> footballIdeologies = readJson("data/football-ideologies.json", new TypeReference<>() {});
        List<Team> teams = readJson("data/teams.json", new TypeReference<>() {});
        List<Manager> managers = readJson("data/managers.json", new TypeReference<>() {});

        // Mapas na ordem dos JSONs: toUnmodifiableMap embaralha a iteracao a cada
        // JVM, o que mudava os exemplos da tensao entre reinicios do servidor.
        footballIdeologyProfiles = orderedById(
                readJson("data/football-ideology-profiles.json", new TypeReference<List<FootballIdeologyProfile>>() {}),
                FootballIdeologyProfile::footballIdeologyId);
        teamProfiles = orderedById(
                readJson("data/team-profiles.json", new TypeReference<List<TeamProfile>>() {}),
                TeamProfile::teamId);
        managerProfiles = orderedById(
                readJson("data/manager-profiles.json", new TypeReference<List<ManagerProfile>>() {}),
                ManagerProfile::managerId);

        validateQuestions(axes, questions);
        archetypeQuestions = readJson("data/archetype-questions.json", new TypeReference<>() {});
        validateArchetypeQuestions(axes);

        LocaleBundle pt = LocaleBundle.of(axes, questions, footballIdeologies, teams, managers);
        LocaleBundle en = buildEnglishBundle(pt);
        bundles = Map.of(LANG_PT, pt, LANG_EN, en);

        validateProfiles("team-profiles.json", pt.teamsById().keySet(), teamProfiles.keySet());
        validateProfiles("manager-profiles.json", pt.managersById().keySet(), managerProfiles.keySet());
        validateProfiles("football-ideology-profiles.json", pt.footballIdeologiesById().keySet(),
                footballIdeologyProfiles.keySet());
        validateFootballIdeologyLinks(pt);
    }

    private static <T> Map<String, T> orderedById(List<T> items, Function<T, String> id) {
        return items.stream().collect(Collectors.collectingAndThen(
                Collectors.toMap(id, Function.identity(), (a, b) -> b, java.util.LinkedHashMap::new),
                java.util.Collections::unmodifiableMap));
    }

    // Overlays em data/i18n/en/*.json trazem só os campos de texto, chaveados por id.
    // Item sem tradução (ou arquivo ausente) cai no texto PT — nada quebra.
    private LocaleBundle buildEnglishBundle(LocaleBundle pt) throws IOException {
        Map<String, Map<String, String>> axesTr = readOverlay("data/i18n/en/axes.json");
        Map<String, Map<String, String>> questionsTr = readOverlay("data/i18n/en/questions.json");
        Map<String, Map<String, String>> footballIdeologiesTr = readOverlay("data/i18n/en/football-ideologies.json");
        Map<String, Map<String, String>> teamsTr = readOverlay("data/i18n/en/teams.json");
        Map<String, Map<String, String>> managersTr = readOverlay("data/i18n/en/managers.json");

        List<Axis> axes = pt.axes().stream().map(axis -> {
            Map<String, String> tr = axesTr.get(axis.id());
            if (tr == null) return axis;
            return new Axis(
                    axis.id(),
                    tr.getOrDefault("label", axis.label()),
                    tr.getOrDefault("leftPole", axis.leftPole()),
                    tr.getOrDefault("rightPole", axis.rightPole()),
                    axis.leftColor(),
                    axis.rightColor()
            );
        }).toList();

        List<Question> translatedQuestions = pt.questions().stream().map(question -> {
            Map<String, String> tr = questionsTr.get(question.id());
            if (tr == null || tr.get("text") == null) return question;
            return question.withText(tr.get("text"));
        }).toList();
        // Os termos são procurados no texto traduzido; sem overlay EN do glossário, não há tooltip.
        // Idem para a explicação das perguntas: pergunta sem entrada EN fica sem ela, nunca em PT.
        List<Question> questions = QuestionHelpResolver.attach(
                GlossaryResolver.attach(
                        translatedQuestions,
                        readOptionalJson("data/i18n/en/glossary.json", new TypeReference<List<GlossaryEntry>>() {}),
                        "i18n/en/glossary.json"
                ),
                readOptionalJson("data/i18n/en/question-help.json", new TypeReference<List<QuestionHelpEntry>>() {}),
                "i18n/en/question-help.json"
        );

        List<FootballIdeology> footballIdeologies = pt.footballIdeologies().stream().map(ideology -> {
            Map<String, String> tr = footballIdeologiesTr.get(ideology.id());
            if (tr == null) return ideology;
            return new FootballIdeology(
                    ideology.id(),
                    tr.getOrDefault("name", ideology.name()),
                    tr.getOrDefault("category", ideology.category()),
                    tr.getOrDefault("description", ideology.description()),
                    tr.getOrDefault("phrase", ideology.phrase()),
                    ideology.teamId(),
                    ideology.managerId(),
                    ideology.vector()
            );
        }).toList();

        List<Team> teams = pt.teams().stream().map(team -> {
            Map<String, String> tr = teamsTr.get(team.id());
            if (tr == null) return team;
            return new Team(
                    team.id(),
                    tr.getOrDefault("name", team.name()),
                    tr.getOrDefault("category", team.category()),
                    tr.getOrDefault("description", team.description()),
                    tr.getOrDefault("period", team.period()),
                    team.imagePath(),
                    team.imageSourceName(),
                    team.imageSourceUrl(),
                    team.imageNote(),
                    team.vector()
            );
        }).toList();

        List<Manager> managers = pt.managers().stream().map(manager -> {
            Map<String, String> tr = managersTr.get(manager.id());
            if (tr == null) return manager;
            return new Manager(
                    manager.id(),
                    tr.getOrDefault("name", manager.name()),
                    manager.category(),
                    manager.period(),
                    tr.getOrDefault("description", manager.description()),
                    manager.imagePath(),
                    manager.imageSourceName(),
                    manager.imageSourceUrl(),
                    manager.imageNote()
            );
        }).toList();

        return LocaleBundle.of(axes, questions, footballIdeologies, teams, managers);
    }

    private Map<String, Map<String, String>> readOverlay(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            return Map.of();
        }
        List<Map<String, String>> items;
        try (InputStream input = resource.getInputStream()) {
            items = objectMapper.readValue(input, new TypeReference<>() {});
        }
        return items.stream().collect(Collectors.toUnmodifiableMap(item -> item.get("id"), Function.identity()));
    }

    public static String normalizeLang(String lang) {
        if (lang == null) {
            return LANG_PT;
        }
        return switch (lang.trim().toLowerCase()) {
            case LANG_EN, "en-us", "en-gb" -> LANG_EN;
            default -> LANG_PT;
        };
    }

    private LocaleBundle bundle(String lang) {
        return bundles.get(normalizeLang(lang));
    }

    // Todo item do catalogo precisa de um perfil, e todo perfil precisa apontar para um item.
    private static void validateProfiles(String file, java.util.Set<String> catalogIds, java.util.Set<String> profileIds) {
        List<String> missing = catalogIds.stream().filter(id -> !profileIds.contains(id)).sorted().toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException(file + ": faltam perfis para " + missing);
        }
        List<String> unknown = profileIds.stream().filter(id -> !catalogIds.contains(id)).sorted().toList();
        if (!unknown.isEmpty()) {
            throw new IllegalStateException(file + " aponta para ids inexistentes: " + unknown);
        }
    }

    // teamId e managerId sao opcionais, mas quando presentes precisam existir nos catalogos.
    private void validateFootballIdeologyLinks(LocaleBundle pt) {
        List<String> broken = pt.footballIdeologies().stream()
                .filter(ideology -> brokenLink(ideology.teamId(), pt.teamsById())
                        || brokenLink(ideology.managerId(), pt.managersById()))
                .map(FootballIdeology::id)
                .toList();
        if (!broken.isEmpty()) {
            throw new IllegalStateException(
                    "football-ideologies.json: teamId ou managerId inexistente em " + broken);
        }
    }

    private static boolean brokenLink(String id, Map<String, ?> catalog) {
        return id != null && !id.isBlank() && !catalog.containsKey(id);
    }

    public QuizPayload getQuiz() {
        return getQuiz(SHORT_VARIANT);
    }

    public QuizPayload getQuiz(String variant) {
        return getQuiz(variant, LANG_PT);
    }

    public QuizPayload getQuiz(String variant, String lang) {
        String normalizedVariant = normalizeVariant(variant);
        String normalizedLang = normalizeLang(lang);
        LocaleBundle data = bundle(normalizedLang);
        int questionsPerAxis = normalizedVariant.equals(EXTENDED_VARIANT) ? 5 : 3;
        int questionCount = questionsPerAxis * data.axes().size();
        String description = normalizedLang.equals(LANG_EN)
                ? "A quiz of " + questionCount + " questions to estimate your position on the 12 football axes."
                : "Um quiz de " + questionCount + " perguntas para estimar sua posição nos 12 eixos do futebol.";
        return new QuizPayload(
                "12 Axes Football",
                description,
                normalizedVariant,
                questionCount,
                questionsPerAxis,
                data.axes(),
                data.questions(),
                answerOptions(normalizedLang),
                archetypeQuestions.stream().map(question -> question.view(normalizedLang)).toList()
        );
    }

    public List<ArchetypeQuestion> getArchetypeQuestions() {
        return archetypeQuestions;
    }

    // O segundo eixo de uma pergunta precisa existir, ser outro eixo e pesar entre 0 e 1.
    private static void validateQuestions(List<Axis> axes, List<Question> questions) {
        java.util.Set<String> axisIds = axes.stream().map(Axis::id).collect(Collectors.toSet());
        for (Question question : questions) {
            Question.Secondary secondary = question.secondary();
            boolean invalid = !axisIds.contains(question.axisId())
                    || secondary != null && (!axisIds.contains(secondary.axisId())
                            || secondary.axisId().equals(question.axisId())
                            || secondary.agreePole() == null
                            || secondary.weight() <= 0 || secondary.weight() > 1);
            if (invalid) {
                throw new IllegalStateException("questions-pool.json: eixo inválido em " + question.id());
            }
        }
    }

    // Cada efeito precisa apontar para um eixo real com valor 0–100: um erro de
    // digitação no JSON distorceria resultados em silêncio.
    private void validateArchetypeQuestions(List<Axis> axes) {
        java.util.Set<String> axisIds = axes.stream().map(Axis::id).collect(Collectors.toSet());
        for (ArchetypeQuestion question : archetypeQuestions) {
            for (ArchetypeQuestion.Option option : question.options()) {
                option.effects().forEach((axisId, value) -> {
                    if (!axisIds.contains(axisId) || value == null || value < 0 || value > 100) {
                        throw new IllegalStateException("archetype-questions.json: efeito inválido em "
                                + question.id() + "/" + option.id() + " -> " + axisId + "=" + value);
                    }
                });
            }
        }
    }

    public List<Axis> getAxes() {
        return getAxes(LANG_PT);
    }

    public List<Axis> getAxes(String lang) {
        return bundle(lang).axes();
    }

    public List<Question> getQuestions() {
        return bundle(LANG_PT).questions();
    }

    public List<Question> getQuestions(String variant) {
        normalizeVariant(variant);
        return bundle(LANG_PT).questions();
    }

    public List<Question> getQuestionsForLang(String lang) {
        return bundle(lang).questions();
    }

    public List<FootballIdeology> getFootballIdeologies(String lang) {
        return bundle(lang).footballIdeologies();
    }

    public FootballIdeology getFootballIdeologyById(String id, String lang) {
        return bundle(lang).footballIdeologiesById().get(id);
    }

    public Map<String, FootballIdeologyProfile> getFootballIdeologyProfiles() {
        return footballIdeologyProfiles;
    }

    public List<Team> getTeams(String lang) {
        return bundle(lang).teams();
    }

    public Team getTeamById(String id, String lang) {
        return bundle(lang).teamsById().get(id);
    }

    public Map<String, TeamProfile> getTeamProfiles() {
        return teamProfiles;
    }

    public List<Manager> getManagers(String lang) {
        return bundle(lang).managers();
    }

    public Manager getManagerById(String id, String lang) {
        return bundle(lang).managersById().get(id);
    }

    public Map<String, ManagerProfile> getManagerProfiles() {
        return managerProfiles;
    }

    private List<AnswerOption> answerOptions(String lang) {
        return Arrays.stream(AnswerValue.values())
                .map(value -> new AnswerOption(value, labelFor(value, lang), value.scoreTowardAgreement()))
                .toList();
    }

    private String labelFor(AnswerValue value, String lang) {
        if (LANG_EN.equals(lang)) {
            return switch (value) {
                case STRONGLY_AGREE -> "Strongly agree";
                case AGREE -> "Agree";
                case NEUTRAL -> "Neutral or It depends";
                case DISAGREE -> "Disagree";
                case STRONGLY_DISAGREE -> "Strongly disagree";
            };
        }
        return switch (value) {
            case STRONGLY_AGREE -> "Concordo totalmente";
            case AGREE -> "Concordo";
            case NEUTRAL -> "Neutro ou Depende";
            case DISAGREE -> "Discordo";
            case STRONGLY_DISAGREE -> "Discordo totalmente";
        };
    }

    public String normalizeVariant(String variant) {
        if (variant == null || variant.isBlank()) {
            return SHORT_VARIANT;
        }
        return switch (variant.trim().toLowerCase()) {
            case SHORT_VARIANT, "curta" -> SHORT_VARIANT;
            case EXTENDED_VARIANT, "extensa" -> EXTENDED_VARIANT;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Versão de quiz inválida");
        };
    }

    private <T> List<T> readOptionalJson(String path, TypeReference<List<T>> type) throws IOException {
        if (!new ClassPathResource(path).exists()) {
            return List.of();
        }
        return readJson(path, type);
    }

    private <T> T readJson(String path, TypeReference<T> type) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readValue(input, type);
        }
    }
}
