import os
import unittest
from unittest.mock import patch
from collect_focus import collect_focus, related


class CollectionTests(unittest.TestCase):
    def test_closed_budget_never_calls_provider(self):
        with patch.dict(os.environ, {}, clear=True), patch("collect_focus.query") as request:
            self.assertEqual(collect_focus("https://www.linkedin.com/in/example", "task factory"), "approval_required")
            request.assert_not_called()

    def test_matching(self):
        self.assertTrue(related("We automate recurring tasks.", "task factory"))
        self.assertTrue(related("We automate recurring tasks.", "task factory for solopreneurs"))
        self.assertFalse(related("Factory opening in Berlin", "task factory"))
