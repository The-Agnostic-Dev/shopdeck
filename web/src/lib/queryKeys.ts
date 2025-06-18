// Query key factories. Lists and details share a root so a mutation can
// refresh everything about an entity with one invalidate call.

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: object) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
}

export const productKeys = {
  all: ['products'] as const,
  list: (params: object) => [...productKeys.all, 'list', params] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const,
  categories: ['products', 'categories'] as const,
  lowStock: ['inventory', 'low-stock'] as const,
}

export const customerKeys = {
  all: ['customers'] as const,
  list: (params: object) => [...customerKeys.all, 'list', params] as const,
  detail: (id: number) => [...customerKeys.all, 'detail', id] as const,
}

export const refundKeys = {
  all: ['refunds'] as const,
  list: (params: object) => [...refundKeys.all, 'list', params] as const,
}

export const dashboardKeys = {
  day: (day: string) => ['dashboard', day] as const,
}

export const discountKeys = { all: ['discounts'] as const }
export const slotKeys = { all: ['slots'] as const }
export const exportKeys = { all: ['exports'] as const }
export const staffKeys = { all: ['staff'] as const, pickers: ['staff', 'pickers'] as const }
export const jobKeys = { all: ['jobs'] as const }
