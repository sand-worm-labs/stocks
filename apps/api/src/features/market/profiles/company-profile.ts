import type { SearchHit } from "@/infrastructure/datasource/datasource.types"
import type { CompanyProfile } from "@/features/market/universe/universe.types"

// Words that begin or end a company's name without telling it from another
const NAME_NOISE = new Set(["inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "limited", "plc", "holdings", "group", "the", "class", "a", "b", "adr", "nv", "sa", "ag", "llc", "lp", "pbc", "technologies", "international"])

const words = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !NAME_NOISE.has(word))

// A ticker is not a company: "ANT" is also a listed stock that has nothing to do with Anthropic. A hit is the company only if its name starts as
// the token's name does.
function isSameCompany(tokenName: string, hitName: string, ticker: string) {
  const [first] = words(tokenName)
  const hitWords = words(hitName)
  // A company renamed after its ticker ("General Electric" is now "GE Aerospace") still has the ticker in its name
  return (!!first && hitWords.includes(first)) || hitWords.includes(ticker.toLowerCase())
}

const sameTicker = (ticker: string, symbol: string) => ticker.toUpperCase().replace(".", "-") === symbol.toUpperCase().replace(".", "-")

/// What a search says about the company behind a ticker: its sector and industry if it is listed, and that it is not listed if nothing of its
/// name is. Undefined when the search could not be made, so a failure is not written down as "not listed". `byName` is for a search made with the
/// company's name: the listing may then be under another ticker than the token's.
export function profileFrom(ticker: string, companyName: string, hits: SearchHit[] | undefined, byName = false): CompanyProfile | undefined {
  if (!hits) return undefined
  const found = hits.find((hit) => hit.isEquity && (byName || sameTicker(ticker, hit.symbol)) && isSameCompany(companyName, hit.name, ticker))
  if (!found) return { isListed: false }
  return { isListed: true, sector: found.sector, industry: found.industry }
}
