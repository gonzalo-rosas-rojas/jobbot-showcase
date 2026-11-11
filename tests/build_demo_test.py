"""The record that scripts/build-demo.py leaves next to the demo, tested on a temporary folder. Standard library only."""
import datetime
import importlib.util
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build_demo", os.path.join(HERE, "..", "scripts", "build-demo.py"))
build_demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_demo)


class BuildRecord(unittest.TestCase):
    def test_writes_the_commit_and_the_utc_date_to_BUILD_txt(self):
        with tempfile.TemporaryDirectory() as folder:
            when = datetime.datetime(2026, 11, 11, 9, 30, 5, tzinfo=datetime.timezone.utc)
            text = build_demo.write_build_record(folder, "74b2f74", when)
            with open(os.path.join(folder, "BUILD.txt"), encoding="utf-8", newline="") as f:
                self.assertEqual(f.read(), "commit: 74b2f74\ndate: 2026-11-11T09:30:05Z\n")
            self.assertEqual(text, "commit: 74b2f74\ndate: 2026-11-11T09:30:05Z\n")

    def test_rejects_something_that_is_not_a_commit(self):
        with tempfile.TemporaryDirectory() as folder:
            for bad in ("", "main", "74b2f7", "74B2F74", "74b2f74; rm"):
                with self.assertRaises(ValueError, msg=bad):
                    build_demo.write_build_record(folder, bad)
            self.assertEqual(os.listdir(folder), [])

    def test_copying_without_a_commit_is_refused(self):
        with self.assertRaises(SystemExit):
            build_demo.main(["build-demo.py", "somewhere/index.html"])


if __name__ == "__main__":
    unittest.main()
