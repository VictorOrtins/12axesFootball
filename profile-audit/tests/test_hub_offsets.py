import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

try:
    import hub_offsets as ho
    import match_scorer as ms
    import profile_vector as pv
except ImportError:
    ho = None


@unittest.skipIf(ho is None, "numpy not installed")
class HubOffsetsTest(unittest.TestCase):
    def test_stored_offsets_are_current(self):
        reference = ho.simulated_users(ho.REFERENCE_USERS, ho.REFERENCE_SEED)
        for file, key in ho.CATALOGS.values():
            with open(os.path.join(pv.DATA, file), encoding="utf-8") as f:
                profiles = json.load(f)
            expected = ho.offsets_for(ms.vector_matrix([p["vector"] for p in profiles]), reference)
            for profile, offset in zip(profiles, expected):
                self.assertIn("hubOffset", profile, f"{profile[key]} sem hubOffset: rode hub_offsets.py")
                self.assertAlmostEqual(profile["hubOffset"], offset, delta=0.05,
                                       msg=f"{profile[key]}: hubOffset desatualizado, rode hub_offsets.py")


if __name__ == "__main__":
    unittest.main()
