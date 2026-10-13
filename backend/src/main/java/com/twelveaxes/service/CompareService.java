package com.twelveaxes.service;

import com.twelveaxes.model.CompareDetail;
import com.twelveaxes.model.CompareItem;
import com.twelveaxes.model.FootballIdeology;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.Team;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Comparacao do usuario com um perfil escolhido por ele (treinador, time ou ideia de jogo).
 *
 * A compatibilidade usa o mesmo {@link ProfileMatchScorer} das demais secoes do resultado,
 * entao o percentual mostrado aqui e o mesmo que o perfil teria no ranking.
 */
@Service
public class CompareService {
    public static final String MANAGER = "manager";
    public static final String TEAM = "team";
    public static final String FOOTBALL_IDEOLOGY = "football-ideology";

    private static final int CATALOG_CACHE_ENTRIES = 32;

    private final QuizDataService dataService;
    private final ProfileMatchScorer scorer;
    private final BoundedCache<String, List<CompareItem>> catalogCache = new BoundedCache<>(CATALOG_CACHE_ENTRIES);

    public CompareService(QuizDataService dataService, ProfileMatchScorer scorer) {
        this.dataService = dataService;
        this.scorer = scorer;
    }

    /** Todos os perfis pesquisaveis. */
    public List<CompareItem> catalog(String lang) {
        String normalizedLang = QuizDataService.normalizeLang(lang);
        return catalogCache.get(normalizedLang, () -> buildCatalog(normalizedLang));
    }

    private List<CompareItem> buildCatalog(String lang) {
        List<CompareItem> items = new ArrayList<>();
        dataService.getManagers(lang).forEach(manager -> items.add(managerItem(manager)));
        dataService.getTeams(lang).forEach(team -> items.add(teamItem(team)));
        dataService.getFootballIdeologies(lang).forEach(ideology -> items.add(footballIdeologyItem(ideology)));
        return List.copyOf(items);
    }

    public CompareDetail compare(String type, String id, Map<String, Double> userVector, String lang) {
        String normalizedLang = QuizDataService.normalizeLang(lang);
        return switch (type == null ? "" : type) {
            case MANAGER -> {
                Manager manager = require(dataService.getManagerById(id, normalizedLang), type, id);
                var profile = dataService.getManagerProfiles().get(id);
                yield detail(managerItem(manager), manager.description(), userVector,
                        profile == null ? null : profile.vector());
            }
            case TEAM -> {
                Team team = require(dataService.getTeamById(id, normalizedLang), type, id);
                var profile = dataService.getTeamProfiles().get(id);
                yield detail(teamItem(team), team.description(), userVector,
                        profile == null ? null : profile.vector());
            }
            case FOOTBALL_IDEOLOGY -> {
                FootballIdeology ideology = require(dataService.getFootballIdeologyById(id, normalizedLang), type, id);
                var profile = dataService.getFootballIdeologyProfiles().get(id);
                yield detail(footballIdeologyItem(ideology), ideology.description(), userVector,
                        profile == null ? null : profile.vector());
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de comparação inválido");
        };
    }

    private CompareDetail detail(CompareItem item, String description, Map<String, Double> userVector,
                                 Map<String, Double> vector) {
        Map<String, Double> target = vector == null || vector.isEmpty() ? scorer.neutralVector() : vector;
        return new CompareDetail(item, description, scorer.compatibility(userVector, target), target);
    }

    private static <T> T require(T value, String type, String id) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil não encontrado: " + type + "/" + id);
        }
        return value;
    }

    private static CompareItem managerItem(Manager manager) {
        return new CompareItem(MANAGER, manager.id(), manager.name(), manager.period(),
                manager.imagePath(), manager.category());
    }

    private static CompareItem teamItem(Team team) {
        return new CompareItem(TEAM, team.id(), team.name(), team.period(), team.imagePath(), team.category());
    }

    private static CompareItem footballIdeologyItem(FootballIdeology ideology) {
        return new CompareItem(FOOTBALL_IDEOLOGY, ideology.id(), ideology.name(), ideology.category(), null,
                ideology.category());
    }
}
