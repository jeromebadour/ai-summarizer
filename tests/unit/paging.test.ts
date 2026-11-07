import assert from "node:assert/strict";
import { test } from "node:test";
import { pageOf, pageSizeFor, pageSizes, pageWindow } from "@/lib/paging";

test("without a window height, a list gets its full page", () => {
  assert.equal(pageSizeFor("saved", null), pageSizes.saved);
  assert.equal(pageSizeFor("adminTable", null), pageSizes.adminTable);
});

test("a big window never gets more than the full page", () => {
  assert.equal(pageSizeFor("saved", 2000), pageSizes.saved);
  assert.equal(pageSizeFor("adminTable", 2000), pageSizes.adminTable);
});

test("a shorter window gets fewer rows, never below the floor", () => {
  const laptop = pageSizeFor("adminTable", 650);
  assert.ok(laptop < pageSizes.adminTable && laptop >= 8, String(laptop));
  assert.ok(pageSizeFor("saved", 650) < pageSizes.saved);
  assert.equal(pageSizeFor("adminTable", 300), 8);
  assert.equal(pageSizeFor("saved", 300), 4);
});

test("the rows grow with the window, one step at a time", () => {
  let last = pageSizeFor("adminTable", 500);
  for (let h = 500; h <= 1200; h += 10) {
    const n = pageSizeFor("adminTable", h);
    assert.ok(n >= last && n - last <= 1, `${h}: ${last} -> ${n}`);
    last = n;
  }
});

test("a broken page number lands on a real page", () => {
  assert.equal(pageOf("99", 20, 9).page, 3);
  assert.equal(pageOf("abc", 20, 9).page, 1);
  assert.deepEqual(pageWindow(5, 9), [1, "gap", 4, 5, 6, "gap", 9]);
});
