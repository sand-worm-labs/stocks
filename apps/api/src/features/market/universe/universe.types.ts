// A stock a source says can be had onchain, before anything is known about how it trades. Each source gives these, and the universe puts them
// together, so a new place to find stocks (another issuer, another chain) is one more source and no change to what reads them.
export type Listing = {
  // The source it came from, such as "coinbase"
  source: string
  // The tokenized symbol: its share's ticker and a lowercase "c" (AAPLc)
  symbol: string
  name: string
  // The token's contract, lowercase
  address: string
  decimals?: number
  // How many shares one token stands for; it changes with corporate actions
  multiplier?: number
  isin?: string
  description?: string
  iconUrl?: string
  // In tokens. Missing or 0 when none has been minted yet.
  totalSupply?: number
  firstMintDate?: string
  isPaused?: boolean
  navPrice?: number
}

export interface ListingSource {
  readonly name: string
  listings(): Promise<Listing[]>
}

// Where the sources are asked for, so one more is one more provider
export const LISTING_SOURCES = Symbol('LISTING_SOURCES')

// What is known about the company behind a share, from outside the token
export type CompanyProfile = {
  sector?: string
  industry?: string
  // Whether a public listing of this company was found. False for one that is not on an exchange yet.
  isListed: boolean
}
