// Runs the Python tests of scripts/build-demo.py (tests/build_demo_test.py) so that `node --test` covers them too.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { it } from "node:test";
import { ROOT } from "./lib/site.mjs";

const python = ["python3", "python"].find((name) => spawnSync(name, ["-I", "-c", "pass"]).status === 0);

it("writes the commit and date of the demo build into BUILD.txt", { skip: python ? false : "Python was not found" }, () => {
  const run = spawnSync(python, ["-I", "tests/build_demo_test.py"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});
