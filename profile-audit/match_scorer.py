"""Espelho em NumPy de ProfileMatchScorer.java, com as constantes como parametros.

compatibility(U, T, params) compara cada linha de U (n x k) com cada linha de T
(m x k) e devolve a matriz n x m de notas, arredondada a 1 casa como no Java.
As colunas sao os eixos de AXIS_IDS (ou o subconjunto passado nas duas matrizes).
"""
from dataclasses import dataclass, replace

import numpy as np

AXIS_IDS = ["pos", "pro", "est", "lar", "blo", "mar", "pla", "res", "sis", "jog", "bas", "lid"]
DIMENSIONS = {"tactics": AXIS_IDS[0:6], "philosophy": AXIS_IDS[6:10], "management": AXIS_IDS[10:12]}

CENTER = 50.0
AXIS_SPREAD = 50.0
OUTLIER_FULL_SPREAD = 100.0


@dataclass(frozen=True)
class Params:
    axis_weight: float = 0.42
    direction_weight: float = 0.33
    magnitude_weight: float = 0.18
    outlier_weight: float = 0.07
    direction_augment_radius: float = 8.0
    outlier_exponent: float = 2.5
    opposite_side_max_penalty: float = 0.45
    opposite_side_spread: float = 25.0
    stretch_target: float = 20.0
    stretch_max: float = 3.0
    hub_penalty_weight: float = 0.5

    def with_weights(self, axis, direction, magnitude, outlier):
        total = axis + direction + magnitude + outlier
        return replace(self, axis_weight=axis / total, direction_weight=direction / total,
                       magnitude_weight=magnitude / total, outlier_weight=outlier / total)


CURRENT = Params()


def vector_matrix(vectors, axis_ids=AXIS_IDS):
    return np.array([[v.get(a, CENTER) for a in axis_ids] for v in vectors], dtype=float)


def axis_similarity(u, t, p):
    diff = np.abs(u - t)
    sim = np.maximum(0.0, 1.0 - (diff / AXIS_SPREAD) ** 2)
    cu, ct = u - CENTER, t - CENTER
    penalty = (p.opposite_side_max_penalty
               * np.tanh(np.abs(cu) / p.opposite_side_spread)
               * np.tanh(np.abs(ct) / p.opposite_side_spread))
    sim = np.where(cu * ct < 0.0, sim * (1.0 - penalty), sim)
    return 100.0 * sim.mean(axis=-1)


def direction_similarity(u, t, p):
    cu, ct = u - CENTER, t - CENTER
    augment = u.shape[-1] * p.direction_augment_radius ** 2
    dot = (cu * ct).sum(axis=-1)
    un = (cu * cu).sum(axis=-1)
    tn = (ct * ct).sum(axis=-1)
    return CENTER + CENTER * (dot + augment) / np.sqrt((un + augment) * (tn + augment))


def magnitude_similarity(u, t, p):
    ui = np.abs(u - CENTER).mean(axis=-1)
    ti = np.abs(t - CENTER).mean(axis=-1)
    return 100.0 - 2.0 * np.abs(ui - ti)


def outlier_similarity(u, t, p):
    max_diff = np.abs(u - t).max(axis=-1)
    return 100.0 * np.maximum(0.0, 1.0 - (max_diff / OUTLIER_FULL_SPREAD) ** p.outlier_exponent)


def round1(x):
    return np.floor(x * 10.0 + 0.5) / 10.0


def stretch(u, p):
    """Mild users are scaled away from the center up to the typical catalog intensity, keeping direction."""
    deviation = u - CENTER
    intensity = np.abs(deviation).mean(axis=-1, keepdims=True)
    factor = np.clip(p.stretch_target / np.maximum(intensity, 1e-9), 1.0, p.stretch_max)
    return np.clip(CENTER + deviation * factor, 0.0, 100.0)


def ranking_score(U, T, offsets, p=CURRENT):
    """Compatibility minus each profile's hub offset, as the matchers rank the full catalog."""
    raw = compatibility(U, T, p) - p.hub_penalty_weight * np.asarray(offsets, dtype=float)[None, :]
    return round1(np.clip(raw, 0.0, 100.0))


def compatibility(U, T, p=CURRENT, rounded=True):
    u = stretch(np.asarray(U, dtype=float), p)[:, None, :]
    t = np.asarray(T, dtype=float)[None, :, :]
    raw = (p.axis_weight * axis_similarity(u, t, p)
           + p.direction_weight * direction_similarity(u, t, p)
           + p.magnitude_weight * magnitude_similarity(u, t, p)
           + p.outlier_weight * outlier_similarity(u, t, p))
    raw = np.clip(raw, 0.0, 100.0)
    return round1(raw) if rounded else raw
