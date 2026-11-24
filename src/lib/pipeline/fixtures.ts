import type { Market } from "./types"

// A small market, and an idea, for the tests of everything that uses the agent
const stock = (symbol: string, name: string, liquidity = 500_000, price = 100) => ({ symbol, name, price, liquidity })
export const market: Market = {
  stocks: [
    stock("NVDAc", "NVIDIA", 900_000, 125),
    stock("AMZNc", "Amazon", 800_000, 250),
    stock("GOOGLc", "Alphabet", 700_000, 265),
    stock("TSLAc", "Tesla", 600_000, 345),
    stock("AAPLc", "Apple", 500_000, 340),
    stock("METAc", "Meta", 400_000, 570),
    stock("LLYc", "Eli Lilly", 300_000, 1350),
    { symbol: "OPENc", name: "OpenAI" },
  ],
  categories: [{ id: "robotics", label: "Robotics", symbols: ["NVDAc", "AMZNc", "GOOGLc", "TSLAc", "OPENc"] }],
}
export const BRIEF =
  "Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock, only stocks with $100K+ liquidity on Base. I'd panic at −20%. Ask before buying."
