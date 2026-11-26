import type { Stock } from "@/types/markets"

import { makeSeries } from "./series"

export const stocksMockData: Stock[] = [
  {
    symbol: "AMZNc",
    name: "Amazon.com Inc.",
    price: 256.5,
    liquidity: 657_510,
    series: makeSeries(3, 0.2),
  },
  {
    symbol: "NVDAc",
    name: "NVIDIA Corporation",
    price: 144.87,
    liquidity: 656_780,
    series: makeSeries(5, 0.3),
  },
  {
    symbol: "ANTc",
    name: "Anthropic, PBC",
    price: 92.51,
    liquidity: 587_100,
    preIpo: true,
    series: makeSeries(11, 0.1),
  },
  {
    symbol: "SPCXc",
    name: "Space Exploration Technologies",
    price: 136.45,
    liquidity: 463_160,
    preIpo: true,
    series: makeSeries(13, 0.1),
  },
  { symbol: "AAPLc", name: "Apple Inc.", price: 351.48, liquidity: 324_590, series: makeSeries(17, 0.05) },
  { symbol: "SNDKc", name: "Sandisk Corporation", price: 736.96, liquidity: 313_870, series: makeSeries(19, 0.1) },
  {
    symbol: "GOOGLc",
    name: "Alphabet Inc.",
    price: 273.16,
    liquidity: 266_450,
    series: makeSeries(23, 0.15),
  },
  {
    symbol: "TSLAc",
    name: "Tesla Inc.",
    price: 370,
    liquidity: 198_530,
    series: makeSeries(29, -0.25),
  },
  { symbol: "ISRG", name: "Intuitive Surgical" },
  { symbol: "SYM", name: "Symbotic" },
  { symbol: "TER", name: "Teradyne" },
  { symbol: "ROK", name: "Rockwell Automation" },
  { symbol: "CGNX", name: "Cognex" },
  { symbol: "ZBRA", name: "Zebra Technologies" },
  { symbol: "SERV", name: "Serve Robotics" },
  { symbol: "RR", name: "Richtech Robotics" },
]
