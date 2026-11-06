import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

try:
    import match_scorer as ms
except ImportError:
    ms = None

JAVA = os.path.join(HERE, "..", "..", "backend", "src", "main", "java", "com", "twelveaxes", "service",
                    "ProfileMatchScorer.java")

A = [67.5, 55.7, 38.6, 39.6, 47.3, 60.0, 73.7, 69.7, 85.0, 75.0, 40.0, 31.9]
B = [23.6, 39.3, 75.0, 70.5, 26.8, 23.3, 30.4, 15.8, 75.0, 40.0, 23.3, 74.2]
NEAR_CENTER = [47, 53, 49, 51, 50, 50, 48, 52, 50, 50, 49, 51]


def java_constant(name):
    with open(JAVA, encoding="utf-8") as f:
        return float(re.search(rf"\b{name}\s*=\s*([0-9.]+);", f.read()).group(1))


@unittest.skipIf(ms is None, "numpy not installed")
class MatchScorerTest(unittest.TestCase):
    def score(self, u, t, cols=slice(None)):
        return float(ms.compatibility([u[cols]], [t[cols]])[0, 0])

    def test_constants_match_the_java_scorer(self):
        c = ms.CURRENT
        self.assertEqual(c.axis_weight, java_constant("AXIS_WEIGHT"))
        self.assertEqual(c.direction_weight, java_constant("DIRECTION_WEIGHT"))
        self.assertEqual(c.magnitude_weight, java_constant("MAGNITUDE_WEIGHT"))
        self.assertEqual(c.outlier_weight, java_constant("OUTLIER_WEIGHT"))
        self.assertEqual(c.direction_augment_radius, java_constant("DIRECTION_AUGMENT_RADIUS"))
        self.assertEqual(c.outlier_exponent, java_constant("OUTLIER_EXPONENT"))
        self.assertEqual(c.opposite_side_max_penalty, java_constant("OPPOSITE_SIDE_MAX_PENALTY"))
        self.assertEqual(c.opposite_side_spread, java_constant("OPPOSITE_SIDE_SPREAD"))

    def test_scores_match_values_printed_by_the_java_scorer(self):
        self.assertEqual(self.score(A, B), 55.1)
        self.assertEqual(self.score(B, A), 55.1)
        self.assertEqual(self.score(A, B, slice(0, 6)), 51.4)
        self.assertEqual(self.score(A, B, slice(10, 12)), 59.2)
        self.assertEqual(self.score([50] * 12, NEAR_CENTER), 99.2)
        self.assertEqual(self.score([0] * 12, [100] * 12), 18.8)

    def test_neutral_and_identical_vectors_score_100(self):
        self.assertEqual(self.score([50] * 12, [50] * 12), 100.0)
        self.assertEqual(self.score(A, A), 100.0)

    def test_with_weights_normalises_to_one(self):
        p = ms.CURRENT.with_weights(2, 1, 1, 0)
        self.assertAlmostEqual(p.axis_weight + p.direction_weight + p.magnitude_weight + p.outlier_weight, 1.0)
        self.assertAlmostEqual(p.axis_weight, 0.5)


if __name__ == "__main__":
    unittest.main()
