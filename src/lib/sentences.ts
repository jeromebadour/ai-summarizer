import type { SourceSentence } from "@/lib/summary";

// Abbreviations a sentence never ends on ("Dr. Smith", "e.g. roads", "U.S. policy").
const abbreviations = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|vs|etc|e\.g|i\.e|Inc|Ltd|Co|Corp|No|Fig|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|[A-Z])\.\s*$/;

/**
 * Splits a source into numbered sentences (ids from 1) with their paragraph (blank lines separate paragraphs). The
 * numbers are what summary points cite, so the same text always splits the same way.
 */
export function splitSentences(text: string): SourceSentence[] {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const out: SourceSentence[] = [];
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  let paragraph = 0;
  for (const block of paragraphs) {
    const clean = block.replace(/\s*\n\s*/g, " ").trim();
    if (!clean) continue;
    paragraph += 1;
    let carry = "";
    for (const { segment } of segmenter.segment(clean)) {
      const joined = carry + segment;
      if (abbreviations.test(joined)) {
        carry = joined;
        continue;
      }
      carry = "";
      const sentence = joined.trim();
      if (sentence) out.push({ id: out.length + 1, text: sentence, paragraph });
    }
    if (carry.trim()) out.push({ id: out.length + 1, text: carry.trim(), paragraph });
  }
  return out;
}
