export type Starter = {
  id: string
  title: string
  // The themes of the market it is for, by the id of the interest
  themes: string[]
  symbols: string[]
  // How its backtest did over the last year, as a fraction
  oneYearReturn: number
  series: number[]
  // The brief it opens the new portfolio with
  brief: string
}

// What a person has told us on the way in
export type OnboardingProfile = { name?: string; interests: string[] }
