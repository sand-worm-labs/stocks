export type Starter = {
  id: string
  title: string
  themes: string[]
  symbols: string[]
  // How its backtest did over the last year, as a fraction
  oneYearReturn: number
  series: number[]
  brief: string
}

export type OnboardingProfile = { name?: string; interests: string[] }
