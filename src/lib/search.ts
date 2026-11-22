// Items whose text contains the query, ignoring case; no query keeps them all
export const searchBy = <T>(items: T[], query: string, text: (item: T) => string) => {
  const needle = query.trim().toLowerCase()
  return needle ? items.filter((item) => text(item).toLowerCase().includes(needle)) : items
}
