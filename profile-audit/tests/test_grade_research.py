import importlib.util
import json
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "fixtures")
_spec = importlib.util.spec_from_file_location("grade_research", os.path.join(HERE, "..", "grade_research.py"))
grade_research = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(grade_research)
CASES = grade_research.load_cases()


def fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return json.load(f)


def failures(case, data):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(data, f)
    try:
        results = grade_research.grade(CASES[case], f.name)
    finally:
        os.unlink(f.name)
    return [label for severity, ok, label, _ in results if not ok and severity == "must"]


class GradeKlopp(unittest.TestCase):
    def test_good_file_passes(self):
        self.assertEqual(failures("klopp-liverpool-2021-22", fixture("team-valid.json")), [])

    def test_verified_mid_block_fails(self):
        data = fixture("team-valid.json")
        data["sources"][4]["evidence"] = "Liverpool shifted toward a mid-block."
        self.assertEqual(len(failures("klopp-liverpool-2021-22", data)), 1)

    def test_unverified_mid_block_is_allowed(self):
        data = fixture("team-valid.json")
        data["sources"][-1]["evidence"] = "Search summary: mid-block."
        self.assertEqual(failures("klopp-liverpool-2021-22", data), [])

    def test_wrong_season_fails(self):
        data = fixture("team-valid.json")
        data["profilePeriod"] = {"start": "2022-08-06", "end": "2023-05-28"}
        data["managers"][0].update(start="2022-08-06", end="2023-05-28")
        for s in data["sources"]:
            s["eventDate"] = "2022/23"
        self.assertIn("period", failures("klopp-liverpool-2021-22", data))

    def test_invalid_file_fails_validation(self):
        data = fixture("team-valid.json")
        data["confidence"] = {"level": "great"}
        self.assertIn("validate.py research", failures("klopp-liverpool-2021-22", data))


class GradeAmbiguity(unittest.TestCase):
    def test_stub_that_asks_passes(self):
        self.assertEqual(failures("cardoso-sundowns-2025", fixture("team-stub.json")), [])

    def test_picking_a_period_fails(self):
        data = fixture("team-valid.json")
        data.update(id="mamelodi-sundowns-2025", name="Mamelodi Sundowns 2025")
        self.assertIn("status", failures("cardoso-sundowns-2025", data))


class GradeQuotes(unittest.TestCase):
    def shankly(self, quote):
        data = fixture("manager-valid.json")
        data.update(id="bill-shankly", name="Bill Shankly",
                    profilePeriod={"start": "1959-12-01", "end": "1974-07-12"},
                    spellsCounted=[{"club": "Liverpool", "start": "1959-12-01", "end": "1974-07-12", "reason": "Titles"}],
                    spellsExcluded=[], teamProfiles=[])
        for s in data["sources"]:
            s["eventDate"] = "1965"
        data["statedView"] = [quote, {"quote": "Pass and move", "date": "1970-01-01", "source": "https://x", "provenance": "primary"}]
        return data

    def test_attributed_1995_passes(self):
        data = self.shankly({"quote": "The socialism I believe in...", "date": "1995-03-10",
                             "source": "https://tribune", "provenance": "attributed"})
        self.assertEqual(failures("shankly-manager-1959-74", data), [])

    def test_primary_claim_fails(self):
        data = self.shankly({"quote": "The socialism I believe in...", "date": "1981-01-01",
                             "source": "https://x", "provenance": "primary"})
        self.assertEqual(len(failures("shankly-manager-1959-74", data)), 1)


class Cases(unittest.TestCase):
    def test_every_check_type_is_known(self):
        for case in CASES.values():
            for c in case["checks"]:
                self.assertIn(c["type"], grade_research.CHECKS, case["case"])


if __name__ == "__main__":
    unittest.main()
