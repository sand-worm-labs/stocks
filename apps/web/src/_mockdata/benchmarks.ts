import type { Benchmark, BenchmarkGroup } from "@/types/benchmarks"

import { makeSeries } from "./series"

type Row = [string, string, string, number]

const GROUPS: Record<BenchmarkGroup, Row[]> = {
  "US stocks": [
    ["SPY", "S&P 500", "SPDR S&P 500 ETF", 0.004],
    ["QQQ", "Nasdaq 100", "Invesco QQQ Trust", 0.011],
    ["VTI", "Total US market", "Vanguard Total Stock Market ETF", 0.005],
    ["DIA", "Dow Jones", "SPDR Dow Jones Industrial Average ETF", -0.002],
    ["IWM", "Russell 2000", "iShares Russell 2000 ETF", -0.009],
    ["MDY", "S&P MidCap 400", "SPDR S&P MidCap 400 ETF", -0.004],
    ["IWD", "US value", "iShares Russell 1000 Value ETF", 0.001],
    ["IWF", "US growth", "iShares Russell 1000 Growth ETF", 0.009],
  ],
  Sectors: [
    ["XLK", "Technology", "Technology Select Sector SPDR Fund", 0.013],
    ["SMH", "Semiconductors", "VanEck Semiconductor ETF", 0.019],
    ["XLF", "Financials", "Financial Select Sector SPDR Fund", -0.003],
    ["XLE", "Energy", "Energy Select Sector SPDR Fund", -0.012],
    ["XLV", "Health care", "Health Care Select Sector SPDR Fund", 0.002],
    ["ARKK", "Innovation", "ARK Innovation ETF", 0.017],
  ],
  International: [
    ["EFA", "Developed markets", "iShares MSCI EAFE ETF", 0.003],
    ["EEM", "Emerging markets", "iShares MSCI Emerging Markets ETF", -0.005],
    ["VXUS", "Total international", "Vanguard Total International Stock ETF", 0.002],
    ["FXI", "China large-cap", "iShares China Large-Cap ETF", -0.015],
  ],
  Bonds: [
    ["TLT", "US Treasuries", "iShares 20+ Year Treasury Bond ETF", 0.003],
    ["AGG", "US bonds", "iShares Core US Aggregate Bond ETF", 0.001],
    ["HYG", "High-yield bonds", "iShares iBoxx High Yield Corporate Bond ETF", 0.0005],
    ["SHY", "Short Treasuries", "iShares 1-3 Year Treasury Bond ETF", 0.0002],
  ],
  Commodities: [
    ["GLD", "Gold", "SPDR Gold Shares", 0.007],
    ["SLV", "Silver", "iShares Silver Trust", 0.011],
    ["USO", "Oil", "United States Oil Fund", -0.021],
    ["DBC", "Commodities", "Invesco DB Commodity Index Tracking Fund", -0.004],
  ],
  Crypto: [
    ["IBIT", "Bitcoin", "iShares Bitcoin Trust ETF", 0.024],
    ["ETHA", "Ethereum", "iShares Ethereum Trust ETF", 0.031],
  ],
}

export const benchmarksMockData: Benchmark[] = Object.entries(GROUPS).flatMap(([group, rows]) =>
  rows.map(([id, name, fund, weekChange]) => ({
    id,
    name,
    fund,
    group: group as BenchmarkGroup,
    weekChange,
    series: makeSeries(
      [...id].reduce((sum, letter) => sum * 31 + letter.charCodeAt(0), 7) % 100_000,
      weekChange * 8 + 0.04
    ),
  }))
)
