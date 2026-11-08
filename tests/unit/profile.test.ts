import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration, secondsSaved } from "../../src/lib/profile";

test("reading time under a minute shows seconds, never 0 min", () => {
  assert.equal(formatDuration(0), "0 s");
  assert.equal(formatDuration(20), "20 s");
  assert.equal(formatDuration(59), "59 s");
});

test("minutes, then hours and minutes", () => {
  assert.equal(formatDuration(60), "1 min");
  assert.equal(formatDuration(12 * 60 + 20), "12 min");
  assert.equal(formatDuration(65 * 60), "1 h 05 min");
});

test("time saved: the sources read at 230 words a minute, less the summaries", () => {
  assert.equal(secondsSaved({ wordsIn: 230, wordsOut: 0 }), 60);
  assert.equal(secondsSaved({ wordsIn: 100, wordsOut: 23 }), 20);
  assert.equal(secondsSaved({ wordsIn: 10, wordsOut: 40 }), 0);
});
