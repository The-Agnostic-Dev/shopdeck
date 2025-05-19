// Response shapes shared by several features.

export type OrderStatus = 'pending' | 'confirmed' | 'picking' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type PaymentStatus = 'paid' | 'partially_refunded' | 'refunded'
export type RefundStatus = 'pending' | 'succeeded' | 'failed'

export type Permission =
  | 'dashboard:read'
  | 'orders:read'
  | 'orders:update_status'
  | 'orders:cancel'
  | 'orders:substitute'
  | 'refunds:read'
  | 'refunds:create'
  | 'products:read'
  | 'products:write'
  | 'inventory:adjust'
  | 'customers:read'
  | 'customers:write'
  | 'customers:contact'
  | 'discounts:read'
  | 'discounts:write'
  | 'slots:read'
  | 'slots:write'
  | 'exports:create'
  | 'staff:manage'
  | 'jobs:read'

export interface SessionUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'ops_lead' | 'picker' | 'customer_care' | 'finance'
  roleLabel: string
  permissions: Permission[]
}

export interface PageMeta {
  page: number
  perPage: number
  total: number
  pageCount: number
}

export interface Paged<T> {
  items: T[]
  meta: PageMeta
}

export interface Refund {
  id: number
  orderId: number
  amountKobo: number
  reason: string
  note: string | null
  status: RefundStatus
  providerRef: string | null
  providerStatus: string | null
  providerStatusText?: string
  failureReason: string | null
  createdAt: string
  processedAt: string | null
}
