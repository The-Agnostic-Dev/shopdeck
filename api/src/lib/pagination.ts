// Offset pagination helpers shared by the list endpoints.

export function offsetFor(page: number, perPage: number) {
  return (page - 1) * perPage
}

export function pageMeta(page: number, perPage: number, total: number) {
  return {
    page,
    perPage,
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Splits "a,b, c" into ["a","b","c"]; ignores blanks. */
export function csvParam(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
