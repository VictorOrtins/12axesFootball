package com.twelveaxes.controller;

import com.twelveaxes.model.AxisExemplars;
import com.twelveaxes.model.CompareDetail;
import com.twelveaxes.model.CompareItem;
import com.twelveaxes.service.AxisExemplarService;
import com.twelveaxes.service.AxisValuesParser;
import com.twelveaxes.service.CompareService;
import com.twelveaxes.service.ProfileMatchScorer;
import com.twelveaxes.service.QuizDataService;
import com.twelveaxes.service.ScoringService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CompareController {
    private final CompareService compareService;
    private final ScoringService scoringService;
    private final ProfileMatchScorer scorer;
    private final AxisExemplarService exemplarService;

    public CompareController(
            CompareService compareService,
            ScoringService scoringService,
            ProfileMatchScorer scorer,
            AxisExemplarService exemplarService
    ) {
        this.compareService = compareService;
        this.scoringService = scoringService;
        this.scorer = scorer;
        this.exemplarService = exemplarService;
    }

    // Treinadores que mais puxam para cada polo de cada eixo (página dos 12 eixos).
    @GetMapping("/api/axes/exemplars")
    public List<AxisExemplars> axisExemplars(@RequestParam(defaultValue = QuizDataService.LANG_PT) String lang) {
        return exemplarService.exemplars(lang);
    }

    // Perfis pesquisaveis na secao de comparacao.
    @GetMapping("/api/compare/catalog")
    public List<CompareItem> catalog(@RequestParam(defaultValue = QuizDataService.LANG_PT) String lang) {
        return compareService.catalog(lang);
    }

    // Compara o vetor do usuario (12 leftPercents, como em /api/results/by-axes) com um perfil.
    @GetMapping("/api/compare")
    public CompareDetail compare(
            @RequestParam String type,
            @RequestParam String id,
            @RequestParam("v") String values,
            @RequestParam(defaultValue = QuizDataService.LANG_PT) String lang
    ) {
        var axes = scoringService.scoreFromLeftPercents(AxisValuesParser.parse(values), lang);
        return compareService.compare(type, id, scorer.userVectorFor(axes), lang);
    }
}
