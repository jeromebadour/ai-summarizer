const wordNumbers: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

const scales: Record<string, number> = {
  k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, b: 1e9, billion: 1e9,
};

const numberPattern =
  /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(%|percent\b|k\b|thousand\b|m\b|million\b|bn\b|b\b|billion\b)?/gi;

const wordPattern = new RegExp(`\\b(${Object.keys(wordNumbers).join("|")})\\b`, "gi");

/**
 * Pulls every figure out of a text as a canonical string, so "$40M" and "40 million dollars"
 * both become "40000000", and "30%" and "30 percent" both become "30%".
 */
export type Figure = { key: string; raw: string };

export function extractFigures(text: string): Figure[] {
  const found: Figure[] = [];

  for (const match of text.matchAll(numberPattern)) {
    const base = Number(match[1].replace(/,/g, ""));
    const unit = match[2]?.toLowerCase();
    if (unit === "%" || unit === "percent") {
      found.push({ key: `${base}%`, raw: match[0].trim() });
    } else {
      found.push({ key: String(unit ? base * scales[unit] : base), raw: match[0].trim() });
    }
  }

  for (const match of text.matchAll(wordPattern)) {
    found.push({ key: String(wordNumbers[match[1].toLowerCase()]), raw: match[0] });
  }

  return found;
}

export type FigureCheck =
  | { status: "none" }
  | { status: "checked"; count: number }
  | { status: "unsupported"; missing: string[] };

/** Every figure in the claim must appear in the sentences it cites. */
export function checkFigures(claim: string, sourceSentences: string[]): FigureCheck {
  const claimed = new Map(extractFigures(claim).map((figure) => [figure.key, figure.raw]));
  if (claimed.size === 0) return { status: "none" };

  const available = new Set(sourceSentences.flatMap(extractFigures).map((figure) => figure.key));
  const missing = [...claimed].filter(([key]) => !available.has(key)).map(([, raw]) => raw);

  return missing.length === 0 ? { status: "checked", count: claimed.size } : { status: "unsupported", missing };
}
