import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
VALIDATE = os.path.join(HERE, "..", "validate.py")
FIXTURES = os.path.join(HERE, "fixtures")


def fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return json.load(f)


def run(data):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(data, f)
    try:
        result = subprocess.run(
            [sys.executable, VALIDATE, "research", data["catalog"], data["id"], f.name],
            capture_output=True, text=True,
        )
    finally:
        os.unlink(f.name)
    return result.returncode, result.stdout


class ValidFiles(unittest.TestCase):
    def test_valid_team(self):
        code, out = run(fixture("team-valid.json"))
        self.assertEqual(code, 0, out)

    def test_valid_manager(self):
        code, out = run(fixture("manager-valid.json"))
        self.assertEqual(code, 0, out)

    def test_valid_stub(self):
        code, out = run(fixture("team-stub.json"))
        self.assertEqual(code, 0, out)
        self.assertIn("STUB", out)

    def test_low_confidence_only_warns(self):
        data = fixture("team-valid.json")
        data["confidence"] = {"level": "low", "reason": "One fan analyst."}
        code, out = run(data)
        self.assertEqual(code, 0, out)
        self.assertIn("[CONFIANCA] baixa", out)

    def test_ongoing_period(self):
        data = fixture("team-valid.json")
        data["profilePeriod"]["end"] = "ongoing"
        data["managers"][0]["end"] = "ongoing"
        code, out = run(data)
        self.assertEqual(code, 0, out)


class Blocks(unittest.TestCase):
    def assertBlocks(self, data, message):
        code, out = run(data)
        self.assertEqual(code, 1, out)
        self.assertIn(message, out)

    def test_missing_name(self):
        data = fixture("team-valid.json")
        data["name"] = ""
        self.assertBlocks(data, "campo obrigatorio vazio: name")

    def test_bad_status(self):
        data = fixture("team-valid.json")
        data["status"] = "done"
        self.assertBlocks(data, "status 'done' invalido")

    def test_stub_without_questions(self):
        data = fixture("team-stub.json")
        data["openQuestions"] = []
        self.assertBlocks(data, "exige openQuestions")

    def test_stub_without_ambiguities(self):
        data = fixture("team-stub.json")
        data["ambiguities"] = []
        self.assertBlocks(data, "exige ambiguities")

    def test_bad_period_date(self):
        data = fixture("team-valid.json")
        data["profilePeriod"]["start"] = "August 2021"
        self.assertBlocks(data, "profilePeriod.start invalido")

    def test_manager_without_spells(self):
        data = fixture("manager-valid.json")
        data["spellsCounted"] = []
        self.assertBlocks(data, "manager sem spellsCounted")

    def test_spell_without_reason(self):
        data = fixture("manager-valid.json")
        data["spellsExcluded"][0]["reason"] = ""
        self.assertBlocks(data, "spellsExcluded[0] sem club ou reason")

    def test_team_without_managers_is_allowed(self):
        data = fixture("team-valid.json")
        data["managers"] = []
        code, out = run(data)
        self.assertEqual(code, 0, out)

    def test_team_managers_not_a_list_blocks(self):
        data = fixture("team-valid.json")
        data["managers"] = None
        self.assertBlocks(data, "team sem managers")

    def test_team_linked_by_name(self):
        data = fixture("team-valid.json")
        data["managers"][0]["managerId"] = "Jürgen Klopp"
        self.assertBlocks(data, "managerId tem de ser um id kebab-case")

    def test_source_missing_field(self):
        data = fixture("team-valid.json")
        del data["sources"][0]["articleDate"]
        self.assertBlocks(data, "sources[0] sem ['articleDate']")

    def test_bad_tier(self):
        data = fixture("team-valid.json")
        data["sources"][0]["tier"] = "E"
        self.assertBlocks(data, "tier 'E' invalido")

    def test_bad_dimension(self):
        data = fixture("team-valid.json")
        data["sources"][0]["dimension"] = "tactics"
        self.assertBlocks(data, "dimension 'tactics' invalida")

    def test_verified_must_be_bool(self):
        data = fixture("team-valid.json")
        data["sources"][0]["verified"] = "yes"
        self.assertBlocks(data, "verified tem de ser true/false")

    def test_tier_d_cannot_be_verified(self):
        data = fixture("team-valid.json")
        data["sources"][0]["tier"] = "D"
        self.assertBlocks(data, "tier D nao pode contar como verificada")

    def test_verified_fact_outside_period(self):
        data = fixture("team-valid.json")
        data["sources"][0]["eventDate"] = "2022/23"
        self.assertBlocks(data, "fora do periodo do perfil")

    def test_manager_fact_from_excluded_spell(self):
        data = fixture("manager-valid.json")
        data["sources"][0]["eventDate"] = "2002"
        self.assertBlocks(data, "fora do periodo do perfil")

    def test_out_of_period_fact_does_not_close_gap(self):
        data = fixture("team-valid.json")
        data["sources"] = [s for s in data["sources"] if s["dimension"] != "width"]
        data["sources"].append(dict(fixture("team-valid.json")["sources"][6], eventDate="2019"))
        self.assertBlocks(data, "eixos sem fato verificado fora de gaps.axes: ['lar']")

    def test_unverified_fact_does_not_close_gap(self):
        data = fixture("team-valid.json")
        data["gaps"] = {"dimensions": ["stated-view"], "axes": []}
        self.assertBlocks(data, "eixos sem fato verificado fora de gaps.axes: ['jog']")

    def test_attributed_quote_does_not_close_stated_view(self):
        data = fixture("team-valid.json")
        data["gaps"]["dimensions"] = ["player-profile"]
        self.assertBlocks(data, "dimensoes sem fato verificado fora de gaps.dimensions: ['stated-view']")

    def test_stated_view_bad_provenance(self):
        data = fixture("team-valid.json")
        data["statedView"][0]["provenance"] = "maybe"
        self.assertBlocks(data, "provenance tem de ser primary ou attributed")

    def test_unreadable_bad_reason(self):
        data = fixture("team-valid.json")
        data["unreadable"][0]["reason"] = "blocked"
        self.assertBlocks(data, "unreadable[0] precisa de url e reason")

    def test_bad_confidence(self):
        data = fixture("team-valid.json")
        data["confidence"] = {"level": "medium-high", "reason": "x"}
        self.assertBlocks(data, "confidence tem de ser")


class GapWarnings(unittest.TestCase):
    def test_listing_a_covered_axis_warns(self):
        data = copy.deepcopy(fixture("team-valid.json"))
        data["gaps"]["axes"].append("pos")
        code, out = run(data)
        self.assertEqual(code, 0, out)
        self.assertIn("gaps.axes lista eixos que tem fato verificado: ['pos']", out)


if __name__ == "__main__":
    unittest.main()
