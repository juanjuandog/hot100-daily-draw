const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadSchedulingExports() {
  const root = path.join(__dirname, "..");
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const sandbox = {
    __dirname: root,
    console,
    module: { exports: {} },
    require(specifier) {
      if (specifier === "node:http") {
        return { createServer: () => ({ listen() {} }) };
      }

      if (specifier === "node:sqlite") {
        return {
          DatabaseSync: class {
            exec() {}
            prepare() {
              return { all: () => [], get: () => ({}), run: () => {} };
            }
          }
        };
      }

      if (specifier.startsWith("./")) {
        return require(path.join(root, specifier));
      }

      return require(specifier);
    }
  };

  vm.runInNewContext(`${source}\nmodule.exports = { CYCLE_TOTAL_DAYS, DAILY_PROBLEM_QUOTA, getPlannedCounts };`, sandbox);
  return sandbox.module.exports;
}

test("default schedule assigns exactly 10 problems per day", () => {
  const { CYCLE_TOTAL_DAYS, DAILY_PROBLEM_QUOTA, getPlannedCounts } = loadSchedulingExports();

  assert.equal(DAILY_PROBLEM_QUOTA, 10);
  assert.equal(CYCLE_TOTAL_DAYS, 10);
  assert.deepEqual(Array.from(getPlannedCounts()), Array.from({ length: 10 }, () => 10));
});
