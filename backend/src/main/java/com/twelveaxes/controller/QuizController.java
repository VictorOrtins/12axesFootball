package com.twelveaxes.controller;

import com.twelveaxes.exception.ResourceNotFoundException;
import com.twelveaxes.model.AxisResult;
import com.twelveaxes.model.FootballIdeology;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.QuizPayload;
import com.twelveaxes.model.QuizResult;
import com.twelveaxes.model.ResultRequest;
import com.twelveaxes.model.Team;
import com.twelveaxes.service.AxisOutlierService;
import com.twelveaxes.service.AxisTensionService;
import com.twelveaxes.service.AxisValuesParser;
import com.twelveaxes.service.BoundedCache;
import com.twelveaxes.service.FootballIdeologyMatcherService;
import com.twelveaxes.service.ManagerDimensionMatcherService;
import com.twelveaxes.service.ManagerMatcherService;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import com.twelveaxes.service.TeamDimensionMatcherService;
import com.twelveaxes.service.TeamMatcherService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QuizController {
    // Os resultados sao deterministicos: mesmo vetor e idioma geram sempre a mesma
    // resposta. O limite mantem a memoria do plano pequeno do Render sob controle.
    private static final int RESULT_CACHE_ENTRIES = 2_000;
    private static final int QUIZ_CACHE_ENTRIES = 16;

    private final BoundedCache<String, QuizResult> resultCache = new BoundedCache<>(RESULT_CACHE_ENTRIES);
    private final BoundedCache<String, QuizPayload> quizCache = new BoundedCache<>(QUIZ_CACHE_ENTRIES);
    private final QuizDataService dataService;
    private final ScoringService scoringService;
    private final FootballIdeologyMatcherService matcherService;
    private final TeamMatcherService teamMatcherService;
    private final TeamDimensionMatcherService teamDimensionMatcherService;
    private final ManagerMatcherService managerMatcherService;
    private final ManagerDimensionMatcherService managerDimensionMatcherService;
    private final AxisOutlierService axisOutlierService;
    private final AxisTensionService axisTensionService;

    public QuizController(
            QuizDataService dataService,
            ScoringService scoringService,
            FootballIdeologyMatcherService matcherService,
            TeamMatcherService teamMatcherService,
            TeamDimensionMatcherService teamDimensionMatcherService,
            ManagerMatcherService managerMatcherService,
            ManagerDimensionMatcherService managerDimensionMatcherService,
            AxisOutlierService axisOutlierService,
            AxisTensionService axisTensionService
    ) {
        this.dataService = dataService;
        this.scoringService = scoringService;
        this.matcherService = matcherService;
        this.teamMatcherService = teamMatcherService;
        this.teamDimensionMatcherService = teamDimensionMatcherService;
        this.managerMatcherService = managerMatcherService;
        this.managerDimensionMatcherService = managerDimensionMatcherService;
        this.axisOutlierService = axisOutlierService;
        this.axisTensionService = axisTensionService;
    }


    @GetMapping("/api/quiz")
    public QuizPayload quiz(
            @RequestParam(defaultValue = QuizDataService.SHORT_VARIANT) String variant,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        String key = dataService.normalizeVariant(variant) + "|" + QuizDataService.normalizeLang(lang);
        return quizCache.get(key, () -> dataService.getQuiz(variant, lang));
    }

    @PostMapping("/api/results")
    @ResponseStatus(HttpStatus.OK)
    public QuizResult results(
            @Valid @RequestBody ResultRequest request,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        return buildResult(scoringService.score(request, lang), lang);
    }

    // Resultado compartilhável: reconstrói matches a partir do vetor de eixos
    // (12 leftPercents separados por vírgula, na ordem de axes.json).
    @GetMapping("/api/results/by-axes")
    public QuizResult resultsByAxes(
            @RequestParam("v") String values,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        return buildResult(scoringService.scoreFromLeftPercents(AxisValuesParser.parse(values), lang), lang);
    }

    private QuizResult buildResult(List<AxisResult> axes, String lang) {
        return resultCache.get(resultKey(axes, lang), () -> computeResult(axes, lang));
    }

    // O resultado depende so dos 12 percentuais (o resto vem do idioma), entao eles formam a chave.
    private static String resultKey(List<AxisResult> axes, String lang) {
        StringBuilder key = new StringBuilder(lang).append('|');
        axes.forEach(axis -> key.append(axis.leftPercent()).append(','));
        return key.toString();
    }

    // Com um catalogo vazio, os destaques dele vem null e as listas vazias.
    private QuizResult computeResult(List<AxisResult> axes, String lang) {
        var matches = matcherService.findMatches(axes, lang);
        var managerMatches = managerMatcherService.findMatches(axes, lang);
        var topManager = managerMatches.stream().findFirst().orElse(null);
        var topTeams = teamMatcherService.findTopMatches(axes, lang);
        var topTeam = topTeams.stream().findFirst().orElse(null);
        return new QuizResult(
                axes,
                matches.stream().findFirst().orElse(null),
                matches,
                matcherService.findBottomMatch(axes, lang),
                topTeam,
                topTeams,
                teamDimensionMatcherService.findAll(
                        axes, lang, topTeam == null ? List.of() : List.of(topTeam.teamId())),
                teamMatcherService.findBottomMatches(axes, lang),
                topManager,
                managerMatches,
                managerDimensionMatcherService.findAll(axes, lang, topManager == null ? null : topManager.managerId()),
                managerMatcherService.findBestPerCategory(axes, lang),
                managerMatcherService.findBottomMatches(axes, lang),
                axisOutlierService.findMostUnusual(axes, lang),
                axisOutlierService.findMostCommon(axes, lang),
                axisTensionService.findStrongest(axes, lang)
        );
    }

    @GetMapping("/api/football-ideologies")
    public List<FootballIdeology> footballIdeologies(@RequestParam(defaultValue = QuizDataService.LANG_PT) String lang) {
        return dataService.getFootballIdeologies(lang);
    }

    @GetMapping("/api/football-ideologies/{id}")
    public FootballIdeology footballIdeology(
            @PathVariable String id,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        return Optional.ofNullable(dataService.getFootballIdeologyById(id, lang))
                .orElseThrow(() -> new ResourceNotFoundException("Ideia de jogo não encontrada"));
    }

    @GetMapping("/api/teams")
    public List<Team> teams(@RequestParam(defaultValue = QuizDataService.LANG_PT) String lang) {
        return dataService.getTeams(lang);
    }

    @GetMapping("/api/teams/{id}")
    public Team team(
            @PathVariable String id,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        return Optional.ofNullable(dataService.getTeamById(id, lang))
                .orElseThrow(() -> new ResourceNotFoundException("Time não encontrado"));
    }

    @GetMapping("/api/managers")
    public List<Manager> managers(@RequestParam(defaultValue = QuizDataService.LANG_PT) String lang) {
        return dataService.getManagers(lang);
    }

    @GetMapping("/api/managers/{id}")
    public Manager manager(
            @PathVariable String id,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        return Optional.ofNullable(dataService.getManagerById(id, lang))
                .orElseThrow(() -> new ResourceNotFoundException("Treinador não encontrado"));
    }
}
