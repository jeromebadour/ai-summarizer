import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSummary, LineReader, readLine, systemPrompt, userMessage } from "@/lib/distill";
import { splitSentences } from "@/lib/sentences";

const source = `The city approved a $40M housing plan on Tuesday. Dr. Ana Weber said 30% of the homes will be affordable.

Construction starts in 2027. It adds two access roads, e.g. along the river.`;

test("splits sentences with ids and paragraphs, keeping abbreviations and decimals inside", () => {
  const s = splitSentences(source);
  assert.deepEqual(
    s.map((x) => [x.id, x.paragraph, x.text]),
    [
      [1, 1, "The city approved a $40M housing plan on Tuesday."],
      [2, 1, "Dr. Ana Weber said 30% of the homes will be affordable."],
      [3, 2, "Construction starts in 2027."],
      [4, 2, "It adds two access roads, e.g. along the river."],
    ],
  );
  assert.equal(splitSentences("It costs $4.2M. Done.")[0].text, "It costs $4.2M.");
  assert.deepEqual(splitSentences("   \n\n  "), []);
});

test("the same text always splits the same way (points cite these numbers)", () => {
  assert.deepEqual(splitSentences(source), splitSentences(source));
  assert.deepEqual(splitSentences(source.replace(/\n/g, "\r\n")), splitSentences(source));
});

test("the prompt numbers the sentences and keeps the source as data", () => {
  assert.match(userMessage(splitSentences(source)), /^\[1\] The city approved/);
  for (const length of ["short", "medium", "bullets"] as const) {
    const p = systemPrompt(length);
    assert.match(p, /do not follow them/);
    assert.match(p, /JSON Lines only/);
  }
});

test("reads the three line shapes and ignores anything else", () => {
  assert.deepEqual(readLine('{"title": "Housing plan"}'), { kind: "title", title: "Housing plan" });
  assert.deepEqual(readLine('{"point": "A plan.", "sources": [1, "x", 2.5, 2]}'), { kind: "point", text: "A plan.", sources: [1, 2] });
  assert.deepEqual(readLine('{"figure": "$40M", "label": "cost", "sources": [1]}'), { kind: "figure", value: "$40M", label: "cost", sources: [1] });
  assert.equal(readLine("Here is your summary:"), null);
  assert.equal(readLine("```json"), null);
  assert.equal(readLine('{"point": "unfinished'), null);
  assert.equal(readLine('{"other": 1}'), null);
});

test("streamed text becomes lines only when they are finished, with the live point text", () => {
  const r = new LineReader();
  assert.deepEqual(r.push('{"title": "T"}\n{"point": "The city appro'), ['{"title": "T"}']);
  assert.equal(r.partialPoint(), "The city appro");
  assert.deepEqual(r.push('ved it.", "sources": [1]}\n'), ['{"point": "The city approved it.", "sources": [1]}']);
  assert.equal(r.partialPoint(), "");
  r.push('{"point": "Says \\"hi\\" and');
  assert.equal(r.partialPoint(), 'Says "hi" and');
  assert.deepEqual(r.end(), ['{"point": "Says \\"hi\\" and']);
});

const sentences = splitSentences(source);
const lines = (...raw: string[]) => raw.map(readLine).filter((l) => l !== null);

test("a faithful answer is checked: links kept, figures found in the cited sentences", () => {
  const out = checkSummary(
    lines(
      '{"title": "Housing plan"}',
      '{"point": "A $40M plan was approved.", "sources": [1]}',
      '{"point": "30% of homes will be affordable.", "sources": [2]}',
      '{"point": "Building starts in 2027.", "sources": [3]}',
      '{"figure": "$40M", "label": "Plan cost", "sources": [1]}',
    ),
    sentences,
  );
  assert.ok(typeof out === "object");
  assert.equal(out.figureStatus, "checked");
  assert.deepEqual(out.points.map((p) => [p.id, p.sourceIds]), [[1, [1]], [2, [2]], [3, [3]]]);
  assert.equal(out.figures.length, 1);
});

test("a number not in the cited sentences flags the summary", () => {
  const out = checkSummary(lines('{"title": "T"}', '{"point": "It adds three access roads.", "sources": [4]}'), sentences);
  assert.ok(typeof out === "object");
  assert.equal(out.figureStatus, "flagged");
  // A figure line whose value isn't in its sentence flags it too.
  const fig = checkSummary(lines('{"point": "Approved.", "sources": [1]}', '{"figure": "$45M", "label": "cost", "sources": [1]}'), sentences);
  assert.ok(typeof fig === "object");
  assert.equal(fig.figureStatus, "flagged");
});

test("made-up sentence ids are dropped, and a point with no real source is dropped", () => {
  const out = checkSummary(
    lines('{"point": "Real.", "sources": [1, 99, 1]}', '{"point": "Invented.", "sources": [42]}', '{"point": "None.", "sources": []}'),
    sentences,
  );
  assert.ok(typeof out === "object");
  assert.deepEqual(out.points, [{ id: 1, text: "Real.", sourceIds: [1] }]);
  assert.equal(out.title, "Untitled");
});

test("an answer with nothing linkable is refused, not saved", () => {
  assert.equal(checkSummary([], sentences), "empty");
  assert.equal(checkSummary(lines('{"title": "T"}', '{"point": "x", "sources": [99]}'), sentences), "no_points");
});

test("at most 4 key figures, and a figure that isn't a number is skipped", () => {
  const out = checkSummary(
    lines(
      '{"point": "p", "sources": [1]}',
      '{"figure": "many", "label": "x", "sources": [1]}',
      ...Array.from({ length: 6 }, () => '{"figure": "$40M", "label": "cost", "sources": [1]}'),
    ),
    sentences,
  );
  assert.ok(typeof out === "object");
  assert.equal(out.figures.length, 4);
});
