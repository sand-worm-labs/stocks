// What a word in a person's idea means in terms of the companies behind the stocks. Yahoo says each company's sector and industry in its own
// words ("Drug Manufacturers—General", "Oil & Gas Integrated"), so a topic is the sectors and industries its word stands for. A topic is how
// people say it; the stocks it finds come from the data, so a new stock needs nothing here. A word with no topic is still looked for, in the
// stocks' names, sectors, industries and descriptions.
export type Topic = {
  // Sectors by their exact name
  sectors?: string[]
  // Industries by a pattern, since they are named in many ways
  industries?: RegExp
  // Words in a company's name that say it (a "Coin" in a name is crypto)
  names?: RegExp
  // Categories (kept in the database) that hold what is wanted
  categories?: string[]
}

export const TOPICS: Record<string, Topic> = {
  oil: { sectors: ["Energy"], industries: /oil|gas|petroleum|coal|uranium|refin/i },
  "natural gas": { industries: /\bgas\b/i },
  petroleum: { industries: /oil|gas|petroleum/i },
  crude: { industries: /oil|petroleum/i },
  coal: { industries: /coal/i },
  uranium: { industries: /uranium/i, names: /uranium|nuclear|oklo/i },
  energy: { sectors: ["Energy"], categories: ["energy"] },
  solar: { industries: /solar/i },
  gold: { industries: /gold/i },
  silver: { industries: /silver/i },
  mining: { industries: /gold|silver|copper|steel|coal|uranium|metals|mining|other industrial metals/i },
  steel: { industries: /steel/i },
  pharma: { industries: /drug manufacturers|pharma/i },
  pharmaceutical: { industries: /drug manufacturers|pharma/i },
  pharmaceuticals: { industries: /drug manufacturers|pharma/i },
  biotech: { industries: /biotech/i },
  health: { sectors: ["Healthcare"], categories: ["health"] },
  healthcare: { sectors: ["Healthcare"], categories: ["health"] },
  medical: { industries: /medical|diagnostic|health/i },
  chips: { industries: /semiconductor/i, categories: ["ai"] },
  semiconductors: { industries: /semiconductor/i },
  ai: { categories: ["ai"] },
  software: { industries: /software/i },
  tech: { sectors: ["Technology"] },
  technology: { sectors: ["Technology"] },
  robotics: { categories: ["robotics"], industries: /robot|specialty industrial machinery|electronic equipment/i, names: /robot/i },
  crypto: { categories: ["crypto"], names: /bitcoin|coin|crypto|digital asset|miner|blockchain/i },
  bitcoin: { categories: ["crypto"], names: /bitcoin|strategy inc|microstrategy|coin/i },
  quantum: { categories: ["quantum"], names: /quantum|ionq|rigetti|d-wave/i },
  defense: { industries: /aerospace & defense/i },
  space: { categories: ["space"], names: /space|rocket|satellite/i },
  ev: { categories: ["ev-auto"], industries: /auto manufacturers/i, names: /electric|tesla|rivian|lucid|nio|xpeng/i },
  finance: { sectors: ["Financial Services"], categories: ["finance"] },
  banks: { industries: /bank/i },
  insurance: { industries: /insurance/i },
  consumer: { sectors: ["Consumer Cyclical", "Consumer Defensive"], categories: ["consumer"] },
  restaurants: { industries: /restaurant/i },
  airlines: { industries: /airline/i },
  shipping: { industries: /marine|shipping/i },
  cannabis: { names: /cannabis|tilray|canopy/i },
  utilities: { sectors: ["Utilities"] },
  telecom: { industries: /telecom/i, sectors: ["Communication Services"] },
  "real estate": { sectors: ["Real Estate"] },
  "social media": { names: /meta platforms|snap inc|pinterest|reddit|trump media|bumble|match group|nextdoor|rumble|grindr|weibo|kuaishou/i },
  "big tech": { categories: ["big-tech"] },
}

// The words a person may use for a topic that is in the table under another
export const TOPIC_ALIASES: Record<string, string> = {
  social: "social media",
  "social networks": "social media",
  stocks: "",
  "oil and gas": "oil",
  "oil & gas": "oil",
  pharmaceuticals: "pharma",
  drugs: "pharma",
  medicine: "health",
  "health care": "healthcare",
  semis: "semiconductors",
  semiconductor: "semiconductors",
  chip: "chips",
  bank: "banks",
  banking: "banks",
  restaurant: "restaurants",
  airline: "airlines",
  "artificial intelligence": "ai",
  robots: "robotics",
  "electric vehicles": "ev",
  "space exploration": "space",
}
