// Made-up data that has to stay the same on every visit, yet differ from one strategy to the next: a small number worked out
// from an id, and a pick from a list by it.
export const seedOf = (id: string) =>
  [...id].reduce((sum, char, i) => (sum + char.charCodeAt(0) * (i + 3)) % 2_147_483_647, 7)

// `shift` takes a different part of the number for each choice, so two choices made from one seed don't move together
export const pick = <T>(options: readonly T[], seed: number, shift: number) =>
  options[(seed >>> shift) % options.length] as T
