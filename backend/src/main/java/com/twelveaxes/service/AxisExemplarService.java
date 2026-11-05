package com.twelveaxes.service;

import com.twelveaxes.model.AxisExemplars;
import com.twelveaxes.model.AxisExemplars.AxisExemplar;
import com.twelveaxes.model.Manager;
import com.twelveaxes.model.ManagerProfile;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

/**
 * Para cada eixo, os treinadores que mais puxam para cada polo. Só entra quem está
 * a pelo menos {@link #MIN_LEAN} pontos do centro: um treinador em 53% não ilustra polo nenhum.
 */
@Service
public class AxisExemplarService {
    static final int PER_SIDE = 3;
    static final double MIN_LEAN = 10.0;
    private static final double CENTER = 50.0;

    private final QuizDataService dataService;

    public AxisExemplarService(QuizDataService dataService) {
        this.dataService = dataService;
    }

    public List<AxisExemplars> exemplars(String lang) {
        var managers = dataService.getManagers(lang);
        var profiles = dataService.getManagerProfiles();
        return dataService.getAxes(lang).stream()
                .map(axis -> new AxisExemplars(
                        axis.id(),
                        side(managers, profiles, axis.id(), true),
                        side(managers, profiles, axis.id(), false)))
                .toList();
    }

    private List<AxisExemplar> side(List<Manager> managers, Map<String, ManagerProfile> profiles, String axisId, boolean left) {
        Comparator<AxisExemplar> byLean = Comparator.comparingDouble(AxisExemplar::leftPercent);
        return managers.stream()
                .map(manager -> exemplar(manager, profiles.get(manager.id()), axisId))
                .filter(Objects::nonNull)
                .filter(exemplar -> left
                        ? exemplar.leftPercent() >= CENTER + MIN_LEAN
                        : exemplar.leftPercent() <= CENTER - MIN_LEAN)
                .sorted(left ? byLean.reversed() : byLean)
                .limit(PER_SIDE)
                .toList();
    }

    private static AxisExemplar exemplar(Manager manager, ManagerProfile profile, String axisId) {
        if (profile == null || profile.vector().get(axisId) == null) {
            return null;
        }
        return new AxisExemplar(manager.id(), manager.name(), manager.period(), manager.imagePath(), profile.vector().get(axisId));
    }
}
