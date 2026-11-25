import type { StockCategory } from "@/types/markets"

export const categoriesMockData: StockCategory[] = [
  { id: "ai", label: "AI and chips", symbols: ["NVDAc", "ANTc", "GOOGLc"] },
  { id: "big-tech", label: "Big tech", symbols: ["AMZNc", "GOOGLc", "AAPLc"] },
  {
    id: "robotics",
    label: "Robotics",
    symbols: ["NVDAc", "AMZNc", "GOOGLc", "TSLAc"],
    unavailable: ["ISRG", "SYM", "TER", "ROK"],
  },
  { id: "space", label: "Space and frontier", symbols: ["SPCXc"] },
  { id: "hardware", label: "Hardware and memory", symbols: ["SNDKc", "AAPLc"] },
]
