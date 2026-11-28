import { BRIEF_THEMES, SECTOR_WORDS } from "@/features/strategies/brief/brief.constants"
import { namedBy } from "@/features/strategies/brief/idea-coverage"
import { parseBrief } from "@/features/strategies/brief/parse"

// The name a strategy is given when it is made, read from the idea alone: what it is about, the way it is meant to go, and what it aims for.
// "NVDA, TSLA and 3 more, aiming for 20% a year", "Steady growth in big companies", "Oil stocks". Whoever researches it may give it a better
// one; this is the name until then, and it is also how to tell a name that was never chosen from one the person did, so it only ever depends
// on the idea.

const LONGEST = 60
const MOST_NAMED = 3

const STEADY = /\b(steady|calm|stable|smooth|low[- ]risk|safe(?:ly)?|conservative|new to investing|beginner|first[- ]time)\b/i
const BOLD = /\b(aggressive|bold|high[- ]risk|moonshots?|(?:don'?t|do not) mind (?:the )?risk)\b/i
const BIG_COMPANIES = /\b(big|large|blue[- ]chip|well[- ]known)\b[^.,;]{0,12}\b(companies|stocks|names|caps?)\b/i
const BEAT_THE_MARKET = /\b(beat|outperform)\b[^.]{0,30}\b(s&p|market|index)\b/i

// A yearly return asked for: "at least 20% in 1 year", "20% a year", "a 20% return". Not a limit: "max 25% in one stock" and "panic at -12%" are not.
const TARGET = /(\d{1,3})\s?%\s*(?:return|gain|growth|profit|a year|per year|\/yr|annual(?:ly)?|in (?:a|1|one) year|over (?:a|1|one) year)/gi
const LIMIT_BEFORE = /(?:max(?:imum)?|no more than|at most|up to|cap(?:ped)?(?: at)?|panic|bail|sell|lose|drop|fall|down|loss)[^.]{0,20}$/i

const INCOME = /\b(income|dividends?|yield)\b/i
// Capital words that are not companies: money, assets and ideas written in capitals
const NOT_A_TICKER = new Set(["USDC", "USD", "USDT", "ETF", "ETFS", "IPO", "ASAP", "AI", "EV", "ESG", "CEO", "GDP", "NEW", "SP", "YTD", "ROI", "APY", "APR", "FAQ"])

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const isTicker = (item: string) => /^[A-Z][A-Z.]{0,5}$/.test(item)
const isKnownTheme = (item: string) => BRIEF_THEMES.some((theme) => theme.toLowerCase() === item.toLowerCase())
const isCompany = (item: string) => !isKnownTheme(item) && (isTicker(item) || /^[A-Z][a-z]+$/.test(item))
const isTheme = (item: string) => !isCompany(item)
// Mid-sentence a theme is lower case, unless it is an acronym (AI, EV)
const lowerCase = (kind: string) => (kind === kind.toUpperCase() ? kind : kind.toLowerCase())
const unique = (items: string[]) => items.filter((item, i) => items.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === i)

// Tickers written in capitals ("NVDA, TSLA"), as the person typed them
const tickersIn = (text: string) =>
  unique(Array.from(text.matchAll(/\b[A-Z]{2,5}\b(?![&/])/g), ([ticker = ""]) => ticker).filter((ticker) => !NOT_A_TICKER.has(ticker)))

const themesIn = (text: string) => BRIEF_THEMES.filter((theme) => new RegExp(String.raw`\b${theme}\b`, "i").test(text)).map(String)

function targetReturn(text: string) {
  for (const match of text.matchAll(TARGET)) {
    const before = text.slice(Math.max(0, (match.index ?? 0) - 24), match.index)
    if (!LIMIT_BEFORE.test(before)) return Number(match[1])
  }
  return undefined
}

function list(items: string[]) {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

// What the idea is about, in a few words: its themes, or the companies it names, or the kind of company it describes. Nothing when it says none.
function subjectOf(brief: string) {
  const named = unique([...namedBy(brief), ...themesIn(brief)])
  const sectors = named.filter((item) => SECTOR_WORDS.includes(item.toLowerCase())).map(sentence)
  const themes = named.filter((item) => !(SECTOR_WORDS.includes(item.toLowerCase())) && isTheme(item)).map(sentence)
  const where = (kind: string) => brief.toLowerCase().indexOf(kind.toLowerCase())
  const kinds = [...sectors, ...themes].sort((a, b) => where(a) - where(b)).slice(0, 2)
  const [first = "", ...rest] = kinds
  // "Oil stocks", but "Healthcare and pharma": a sector word on its own needs the word that says it is companies
  const isLoneSector = kinds.length === 1 && sectors.length === 1
  if (kinds.length) return { text: `${list([first, ...rest.map(lowerCase)])}${isLoneSector ? " stocks" : ""}`, isCompanies: false, isKind: true }

  const companies = unique([...named.filter(isCompany), ...tickersIn(brief)])
  if (companies.length) {
    const shown = companies.slice(0, MOST_NAMED)
    const more = companies.length - shown.length
    return { text: more > 0 ? `${shown.join(", ")} and ${more} more` : list(shown), isCompanies: true, isKind: false }
  }

  const phrase = BIG_COMPANIES.exec(brief)
  return phrase ? { text: `${phrase[1]?.toLowerCase().replace("-", " ")} ${phrase[2]?.toLowerCase()}`.replace(/\bstocks\b/, "companies"), isCompanies: false, isKind: false } : undefined
}

export function generatedName(brief: string) {
  const { goal, loss, maxPerStock, budget } = parseBrief(brief)
  const subject = subjectOf(brief)
  const returns = targetReturn(brief)
  const style = STEADY.test(brief) ? "Steady" : BOLD.test(brief) || (loss?.value ?? 0) >= 40 ? "Bold" : undefined
  const noun = INCOME.test(brief) ? "income" : goal?.value === "Protect capital" ? "capital protection" : "growth"

  // What it is, in a few words
  let head: string
  if (!subject) head = style ? `${style} ${noun}` : budget ? `${sentence(noun)} with ${budget.value.toLocaleString("en-US")} USDC` : sentence(noun)
  else if (subject.isCompanies) head = subject.text
  else if (subject.isKind) head = `${style ? `${style} ${subject.text.toLowerCase()}` : subject.text}${noun === "income" ? " income" : ""}`
  else head = `${style ? `${style} ${noun}` : sentence(noun)} in ${subject.text}`

  // What it aims for or is held to
  const tail = returns
    ? `, aiming for ${returns}% a year`
    : BEAT_THE_MARKET.test(brief)
      ? ", to beat the S&P 500"
      : maxPerStock
        ? `, capped at ${maxPerStock.value}%`
        : ""

  const name = `${head}${tail}`
  return name.length <= LONGEST ? name : `${head.slice(0, LONGEST - 1).replace(/[\s,.;:]+\S*$/, "")}…`
}
