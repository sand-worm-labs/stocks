export type SourceMark = { letter: string; background: string }

// The small round logo for a source, by the name it is shown under. A source with no entry gets a neutral one.
export const SOURCE_MARKS: Record<string, SourceMark> = {
  o1: { letter: "o1", background: "#111111" },
  "base.org": { letter: "", background: "#0052FF" },
  "verdict.co.uk": { letter: "V", background: "#E4002B" },
  "nasdaq.com": { letter: "N", background: "#0E1C36" },
  "sec.gov": { letter: "S", background: "#0B2A5B" },
  Sandworm: { letter: "§", background: "#A308F0" },
}

export const NEUTRAL_SOURCE_MARK: SourceMark = { letter: "", background: "#6C757D" }
