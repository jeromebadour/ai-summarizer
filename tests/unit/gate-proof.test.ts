// Proof for the merge gate: this test fails on purpose. Its pull request must stay blocked and is closed unmerged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pageSizeFor } from "../../src/lib/paging";

test("the merge gate blocks a failing test (fails on purpose)", () => {
  assert.equal(pageSizeFor("saved", 900), -1);
});
