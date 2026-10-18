import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import profile_vector  # noqa: E402
from audit_prompt import build_prompt  # noqa: E402

VALIDATE = os.path.join(HERE, "..", "validate.py")
FIXTURES = os.path.join(HERE, "fixtures")
QMAP = profile_vector.question_map()
AXES = profile_vector.axis_order()


def output(code="C"):
    data = {ax: {"personaBrief": "brief", "answers": {}} for ax in AXES}
    for qid, q in QMAP.items():
        data[q["axisId"]]["answers"][qid] = code
    return data


def run(data):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(data, f)
    try:
        result = subprocess.run(
            [sys.executable, VALIDATE, "audit", "team", "test-team", f.name],
            capture_output=True, text=True,
        )
    finally:
        os.unlink(f.name)
    return result.returncode, result.stdout


class Vector(unittest.TestCase):
    QMAP = {
        "pos_01": {"id": "pos_01", "axisId": "pos", "agreePole": "LEFT", "weight": 1},
        "pos_02": {"id": "pos_02", "axisId": "pos", "agreePole": "RIGHT", "weight": 1},
        "lar_01": {"id": "lar_01", "axisId": "lar", "agreePole": "LEFT", "weight": 1,
                   "secondary": {"axisId": "pos", "agreePole": "RIGHT", "weight": 0.5}},
    }

    def vector(self, answers):
        data = {"pos": {"answers": {k: v for k, v in answers.items() if k.startswith("pos")}},
                "lar": {"answers": {k: v for k, v in answers.items() if k.startswith("lar")}}}
        return profile_vector.compute_vector(data, self.QMAP, ["pos", "lar"], [])

    def test_agree_pole_sets_the_direction(self):
        self.assertEqual(self.vector({"pos_01": "CT", "pos_02": "DT"})["pos"], 100.0)

    def test_secondary_counts_with_its_weight_and_pole(self):
        # pos: (1 + 1 + 0.5 * 0) / 2.5 = 0.8; lar: 1
        v = self.vector({"pos_01": "CT", "pos_02": "DT", "lar_01": "CT"})
        self.assertEqual(v, {"pos": 80.0, "lar": 100.0})

    def test_real_pool_all_neutral_is_center(self):
        self.assertTrue(all(v == 50.0 for v in profile_vector.compute_vector(output("N")).values()))


class AuditValidation(unittest.TestCase):
    def test_valid_output(self):
        code, out = run(output())
        self.assertEqual(code, 0, out)
        self.assertIn("[VETOR]", out)

    def test_missing_question(self):
        data = output()
        data["pos"]["answers"].pop("pos_01")
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("ids faltando ['pos_01']", out)

    def test_question_under_wrong_axis(self):
        data = output()
        data["pro"]["answers"]["pos_01"] = data["pos"]["answers"].pop("pos_01")
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("ids desconhecidos ['pos_01']", out)

    def test_invalid_code(self):
        data = output()
        data["pos"]["answers"]["pos_01"] = "A"
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("codigos invalidos", out)

    def test_empty_persona_brief(self):
        data = output()
        data["lid"]["personaBrief"] = " "
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("lid: personaBrief vazio", out)

    def test_two_neutrals_in_one_axis(self):
        data = output()
        for qid in list(data["pos"]["answers"])[:2]:
            data["pos"]["answers"][qid] = "N"
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("[NEUTROS] pos", out)

    def test_too_many_neutrals_overall(self):
        data = output()
        for ax in AXES[:10]:
            data[ax]["answers"][next(iter(data[ax]["answers"]))] = "N"
        code, out = run(data)
        self.assertEqual(code, 0, out)
        data[AXES[10]]["answers"][next(iter(data[AXES[10]]["answers"]))] = "N"
        code, out = run(data)
        self.assertEqual(code, 1)
        self.assertIn("[NEUTROS] total", out)


class Prompt(unittest.TestCase):
    def research(self):
        with open(os.path.join(FIXTURES, "team-valid.json"), encoding="utf-8") as f:
            return json.load(f)

    def test_lists_every_question_once(self):
        prompt = build_prompt("team", "test-team", self.research())
        for qid in QMAP:
            self.assertEqual(prompt.count(f"[id={qid}]"), 1, qid)

    def test_includes_research_and_gaps(self):
        research = self.research()
        research["gaps"]["axes"] = ["mar", "bas"]
        prompt = build_prompt("team", "test-team", research)
        self.assertIn('"id": "' + research["id"] + '"', prompt)
        self.assertIn("Axes WITHOUT verified evidence (gaps.axes): mar, bas.", prompt)

    def test_shuffle_is_stable_per_profile(self):
        research = self.research()
        self.assertEqual(build_prompt("team", "a", research), build_prompt("team", "a", research))


if __name__ == "__main__":
    unittest.main()
