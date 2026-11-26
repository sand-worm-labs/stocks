// How far what a person's idea named is covered by what can be bought on Base, as the API works it out. `headline` and `detail` are its words, so
// the page and an agent say the same thing; both are missing when there is nothing to say.
export type IdeaCoverage = {
  basis: "named" | "partly" | "fallback" | "open"
  // What the idea named that has nothing buyable on Base
  couldntMatch: string[]
  // What the strategy will actually consider
  tests: { symbol: string; name: string }[]
  // The share of the money that stays in cash because the cap on one stock leaves no room for more stocks
  cashLeft: number
  headline?: string
  detail?: string
}
