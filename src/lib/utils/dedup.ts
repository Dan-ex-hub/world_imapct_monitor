/** Deduplication utility — removes duplicate items by key */
export function dedup<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Deduplicate events by headline similarity (Jaccard on word tokens) */
export function dedupByHeadline<T extends { headline: string }>(
  items: T[],
  threshold = 0.6
): T[] {
  const result: T[] = []
  for (const item of items) {
    const isDuplicate = result.some(
      (existing) => jaccardSimilarity(existing.headline, item.headline) > threshold
    )
    if (!isDuplicate) result.push(item)
  }
  return result
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}
