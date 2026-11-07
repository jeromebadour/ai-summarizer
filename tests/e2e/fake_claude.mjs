// A stand-in for Anthropic's Messages API, speaking its real streaming (SSE) format, for testing /api/summarize
// without a key or spend. Start: node tests/e2e/fake_claude.mjs 4010, then run the app with
// ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=test-key.
// The scenario is picked by a marker in the source text: OVERLOADED, GARBAGE, INVENTED, else a faithful answer.
// SLOW (with any of them) streams with real pauses between chunks, so a browser can watch the stages.
// GET /last returns the last request (headers + body) so tests can check what the app sent.
import http from "node:http";

const port = Number(process.argv[2] || 4010);
let last = null;

async function sse(res, events, delayMs = 0) {
  res.writeHead(200, { "content-type": "text/event-stream", "request-id": "req_fake" });
  for (const [type, data] of events) {
    res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  res.end();
}

function answer(lines, inputTokens) {
  const text = lines.join("\n");
  // Split into small chunks, the way a real stream arrives.
  const chunks = text.match(/[\s\S]{1,17}/g) ?? [];
  return [
    ["message_start", { message: { id: "msg_fake", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: inputTokens, output_tokens: 1 } } }],
    ["content_block_start", { index: 0, content_block: { type: "text", text: "" } }],
    ...chunks.map((c) => ["content_block_delta", { index: 0, delta: { type: "text_delta", text: c } }]),
    ["content_block_stop", { index: 0 }],
    ["message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 180 } }],
    ["message_stop", {}],
  ];
}

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/last") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(last));
    }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      last = { headers: req.headers, body };
      const user = body.messages?.[0]?.content ?? "";
      const delay = user.includes("SLOW") ? 90 : 0;
      if (user.includes("OVERLOADED")) {
        res.writeHead(529, { "content-type": "application/json", "request-id": "req_fake" });
        return res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
      }
      if (user.includes("GARBAGE")) return sse(res, answer(["Sure! Here is a lovely summary of your text.", "It is about housing."], 900), delay);
      // The app's invented sample text (Harbor Street) gets a faithful answer that cites its own sentence numbers.
      if (user.includes("Harbor Street")) {
        return sse(
          res,
          answer(
            [
              '{"title": "Harbor Street rail yard becomes a new district"}',
              '{"point": "The council voted 7 to 2 to turn the old Harbor Street rail yard into a district with 1,200 homes, a park and a business incubator.", "sources": [1]}',
              '{"point": "Building starts next spring and runs in phases over six years.", "sources": [2]}',
              '{"point": "About 30 percent of the new homes will be priced for households below the area median income.", "sources": [4]}',
              '{"point": "Opponents worry about traffic on the two access roads; a study is funded but will not hold up construction.", "sources": [5, 6]}',
              '{"point": "A 40 million dollar state grant and private money pay for it, and it should bring around 900 permanent jobs.", "sources": [7, 8]}',
              '{"figure": "1,200", "label": "new homes", "sources": [1]}',
              '{"figure": "30 percent", "label": "affordable", "sources": [4]}',
              '{"figure": "$40M", "label": "state grant", "sources": [7]}',
              '{"figure": "900", "label": "permanent jobs", "sources": [8]}',
            ],
            1450,
          ),
          delay,
        );
      }
      const invented = user.includes("INVENTED");
      return sse(
        res,
        answer(
          [
            '{"title": "City housing plan"}',
            '{"point": "The city approved a $40M housing plan.", "sources": [1]}',
            invented ? '{"point": "It adds three access roads.", "sources": [4]}' : '{"point": "30% of the homes will be affordable.", "sources": [2]}',
            '{"point": "Construction starts in 2027.", "sources": [3, 99]}',
            '{"figure": "$40M", "label": "Plan cost", "sources": [1]}',
          ],
          1200,
        ),
        delay,
      );
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`fake Claude on ${port}`));
