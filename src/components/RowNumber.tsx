/**
 * The # column every table starts with. Numbers run on across pages (page 2 of 15 starts at 16), so the count is
 * never left to the reader.
 */
export function RowNumber({ n }: { n: number }) {
  return <span className="text-right font-mono text-[11.5px] tabular-nums text-faint">{n}</span>;
}

export function RowNumberHead() {
  return <span className="text-right">#</span>;
}
