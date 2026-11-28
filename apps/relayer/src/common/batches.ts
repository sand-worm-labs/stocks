export function inBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size))
  }
  return batches
}

// Runs `work` on every item, a batch at a time, so a public RPC is asked for `size` things at once and not for all of them
export async function mapInBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (const batch of inBatches(items, size)) results.push(...(await Promise.all(batch.map(work))))
  return results
}
