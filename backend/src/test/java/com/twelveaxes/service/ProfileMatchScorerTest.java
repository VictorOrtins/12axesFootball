package com.twelveaxes.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProfileMatchScorerTest {
    private static final double MAGNITUDE_PERFECT_SCORE = 100.0;
    private static final double OUTLIER_PERFECT_SCORE = 100.0;

    private final ProfileMatchScorer scorer = new ProfileMatchScorer();

    @Test
    void identicalVectorsScorePerfectly() {
        Map<String, Double> vector = vector(Map.ofEntries(
                Map.entry("pos", 96.0),
                Map.entry("pro", 17.0),
                Map.entry("est", 44.0),
                Map.entry("lar", 62.0),
                Map.entry("blo", 71.0),
                Map.entry("mar", 53.0),
                Map.entry("pla", 34.0),
                Map.entry("res", 13.0),
                Map.entry("sis", 38.0),
                Map.entry("jog", 80.0),
                Map.entry("bas", 9.0),
                Map.entry("lid", 86.0)
        ));

        assertThat(scorer.compatibility(vector, vector)).isEqualTo(100.0);
    }

    @Test
    void sameSideDirectionBeatsOppositeSideAtEqualDistance() {
        Map<String, Double> user = vector(Map.of(
                "pos", 80.0,
                "pro", 80.0
        ));
        Map<String, Double> sameDirection = vector(Map.of(
                "pos", 70.0,
                "pro", 70.0
        ));
        Map<String, Double> oppositeDirection = vector(Map.of(
                "pos", 30.0,
                "pro", 30.0
        ));

        assertThat(scorer.compatibility(user, sameDirection))
                .isGreaterThan(scorer.compatibility(user, oppositeDirection));
    }

    @Test
    void oppositeSidePenaltyChangesContinuouslyAroundTheOldThreshold() {
        Map<String, Double> user = vector(Map.of("pos", 38.0));
        Map<String, Double> targetNearCenter = vector(Map.of("pos", 64.0));
        Map<String, Double> targetSlightlyFurther = vector(Map.of("pos", 66.0));

        double nearCenterScore = scorer.compatibility(user, targetNearCenter);
        double slightlyFurtherScore = scorer.compatibility(user, targetSlightlyFurther);

        assertThat(nearCenterScore - slightlyFurtherScore).isLessThan(2.0);
    }

    @Test
    void neutralVectorScoresPerfectlyAgainstItself() {
        Map<String, Double> neutral = scorer.neutralVector();

        // Cosseno aumentado: centro x centro tem direção 100, então o total é 100.
        assertThat(scorer.compatibility(neutral, neutral)).isEqualTo(100.0);
    }

    @Test
    void neutralUserOrTargetUsesAugmentedDirection() {
        Map<String, Double> neutral = scorer.neutralVector();
        Map<String, Double> target = vector(Map.of(
                "pos", 100.0,
                "pro", 100.0,
                "est", 100.0
        ));

        double augment = 12 * ProfileMatchScorer.DIRECTION_AUGMENT_RADIUS * ProfileMatchScorer.DIRECTION_AUGMENT_RADIUS;
        double targetNormSquared = 3 * 50.0 * 50.0;
        double direction = 50.0 + 50.0 * augment / Math.sqrt(augment * (targetNormSquared + augment));
        double outlierScore = 100.0 * (1.0 - Math.pow(
                50.0 / ProfileMatchScorer.OUTLIER_FULL_SPREAD, ProfileMatchScorer.OUTLIER_EXPONENT));
        double expected = expectedScore(75.0, direction, 75.0, outlierScore);
        assertThat(scorer.compatibility(neutral, target)).isEqualTo(expected);
        assertThat(scorer.compatibility(target, neutral)).isEqualTo(expected);
    }

    @Test
    void augmentedDirectionConvergesToPlainCosineFarFromCenter() {
        Map<String, Double> user = vector(Map.of("pla", 95.0, "res", 95.0, "jog", 5.0));
        Map<String, Double> sameDirection = vector(Map.of("pla", 90.0, "res", 90.0, "jog", 10.0));
        Map<String, Double> nearCenter = vector(Map.of("pla", 53.0, "res", 53.0, "jog", 47.0));

        // Longe do centro a direção quase não muda; o perfil alinhado e intenso segue vencendo.
        assertThat(scorer.compatibility(user, sameDirection))
                .isGreaterThan(scorer.compatibility(user, nearCenter));
    }

    @Test
    void singleExtremeOutlierAxisLowersScoreEvenWhenOtherAxesMatchPerfectly() {
        Map<String, Double> user = vector(Map.ofEntries(
                Map.entry("pos", 60.0),
                Map.entry("pro", 60.0),
                Map.entry("est", 60.0),
                Map.entry("lar", 60.0),
                Map.entry("blo", 60.0),
                Map.entry("mar", 60.0),
                Map.entry("pla", 15.0),
                Map.entry("res", 60.0),
                Map.entry("sis", 60.0),
                Map.entry("jog", 60.0),
                Map.entry("bas", 60.0),
                Map.entry("lid", 60.0)
        ));
        Map<String, Double> targetWithOutlier = vector(Map.ofEntries(
                Map.entry("pos", 60.0),
                Map.entry("pro", 60.0),
                Map.entry("est", 60.0),
                Map.entry("lar", 60.0),
                Map.entry("blo", 60.0),
                Map.entry("mar", 60.0),
                Map.entry("pla", 90.0),
                Map.entry("res", 60.0),
                Map.entry("sis", 60.0),
                Map.entry("jog", 60.0),
                Map.entry("bas", 60.0),
                Map.entry("lid", 60.0)
        ));
        Map<String, Double> targetWithoutOutlier = vector(Map.ofEntries(
                Map.entry("pos", 60.0),
                Map.entry("pro", 60.0),
                Map.entry("est", 60.0),
                Map.entry("lar", 60.0),
                Map.entry("blo", 60.0),
                Map.entry("mar", 60.0),
                Map.entry("pla", 55.0),
                Map.entry("res", 60.0),
                Map.entry("sis", 60.0),
                Map.entry("jog", 60.0),
                Map.entry("bas", 60.0),
                Map.entry("lid", 60.0)
        ));

        assertThat(scorer.compatibility(user, targetWithoutOutlier))
                .isGreaterThan(scorer.compatibility(user, targetWithOutlier));
    }

    @Test
    void mildProfileBeatsPerfectlyAlignedExtremeProfileForMildUser() {
        Map<String, Double> mildUser = vector(Map.ofEntries(
                Map.entry("pos", 58.0),
                Map.entry("pro", 58.0),
                Map.entry("est", 58.0),
                Map.entry("lar", 58.0),
                Map.entry("blo", 58.0),
                Map.entry("mar", 58.0),
                Map.entry("pla", 58.0),
                Map.entry("res", 58.0),
                Map.entry("sis", 58.0),
                Map.entry("jog", 58.0),
                Map.entry("bas", 58.0),
                Map.entry("lid", 58.0)
        ));
        Map<String, Double> alignedExtremeTarget = vector(Map.ofEntries(
                Map.entry("pos", 78.0),
                Map.entry("pro", 78.0),
                Map.entry("est", 78.0),
                Map.entry("lar", 78.0),
                Map.entry("blo", 78.0),
                Map.entry("mar", 78.0),
                Map.entry("pla", 78.0),
                Map.entry("res", 78.0),
                Map.entry("sis", 78.0),
                Map.entry("jog", 78.0),
                Map.entry("bas", 78.0),
                Map.entry("lid", 78.0)
        ));
        Map<String, Double> similarlyMildTarget = vector(Map.ofEntries(
                Map.entry("pos", 58.0),
                Map.entry("pro", 58.0),
                Map.entry("est", 58.0),
                Map.entry("lar", 58.0),
                Map.entry("blo", 58.0),
                Map.entry("mar", 58.0),
                Map.entry("pla", 58.0),
                Map.entry("res", 58.0),
                Map.entry("sis", 58.0),
                Map.entry("jog", 42.0),
                Map.entry("bas", 42.0),
                Map.entry("lid", 42.0)
        ));

        assertThat(scorer.compatibility(mildUser, similarlyMildTarget))
                .isGreaterThan(scorer.compatibility(mildUser, alignedExtremeTarget));
    }

    @Test
    void weightsAddUpToOne() {
        assertThat(ProfileMatchScorer.AXIS_WEIGHT
                + ProfileMatchScorer.DIRECTION_WEIGHT
                + ProfileMatchScorer.MAGNITUDE_WEIGHT
                + ProfileMatchScorer.OUTLIER_WEIGHT)
                .isEqualTo(1.0);
    }

    @Test
    void displayScoreKeepsTheEndsAndClampsBelowTheFloor() {
        assertThat(scorer.displayScore(100.0)).isEqualTo(100.0);
        assertThat(scorer.displayScore(ProfileMatchScorer.DISPLAY_FLOOR)).isEqualTo(0.0);
        assertThat(scorer.displayScore(0.0)).isEqualTo(0.0);
    }

    @Test
    void displayScoreFollowsTheCurveFromTheConstants() {
        double closeness = (90.0 - ProfileMatchScorer.DISPLAY_FLOOR) / (100.0 - ProfileMatchScorer.DISPLAY_FLOOR);

        assertThat(scorer.displayScore(90.0))
                .isEqualTo(round1(100.0 * Math.pow(closeness, ProfileMatchScorer.DISPLAY_EXPONENT)));
    }

    @Test
    void displayScoreNeverReordersCompatibilities() {
        double previous = scorer.displayScore(0.0);
        for (double raw = 0.1; raw <= 100.0; raw += 0.1) {
            double current = scorer.displayScore(raw);
            assertThat(current).isGreaterThanOrEqualTo(previous);
            previous = current;
        }
    }

    @Test
    void displayScoreSpreadsTheTopResultsApart() {
        double rawGap = 95.0 - 88.0;

        assertThat(scorer.displayScore(95.0) - scorer.displayScore(88.0)).isGreaterThan(2 * rawGap);
    }

    private double expectedScore(double axisSimilarity, double directionSimilarity, double magnitudeSimilarity,
            double outlierSimilarity) {
        return round1(ProfileMatchScorer.AXIS_WEIGHT * axisSimilarity
                + ProfileMatchScorer.DIRECTION_WEIGHT * directionSimilarity
                + ProfileMatchScorer.MAGNITUDE_WEIGHT * magnitudeSimilarity
                + ProfileMatchScorer.OUTLIER_WEIGHT * outlierSimilarity);
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Map<String, Double> vector(Map<String, Double> overrides) {
        Map<String, Double> vector = new LinkedHashMap<>(scorer.neutralVector());
        vector.putAll(overrides);
        return vector;
    }
}
