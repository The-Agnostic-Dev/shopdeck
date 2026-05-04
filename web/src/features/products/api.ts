import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { productKeys } from '@/lib/queryKeys'
import type { Paged } from '@/lib/types'

export interface Product {
  id: number
  sku: string
  name: string
  brand: string | null
  unit: string | null
  priceKobo: number
  costKobo: number | null
  stock: number
  lowStockThreshold: number
  barcode: string | null
  status: 'active' | 'archived'
  images: string[]
  updatedAt: string
  categoryId: number | null
  category: string | null
  categorySlug: string | null
}

export interface StockMovement {
  id: number
  kind: 'receive' | 'damage' | 'correction' | 'sale' | 'cancel' | 'return'
  quantity: number
  stockAfter: number
  reason: string | null
  createdAt: string
  staffName: string | null
}

export interface ProductListParams {
  page: number
  q?: string
  category?: string
  status?: 'active' | 'archived' | 'all'
  lowStock?: boolean
  sort?: 'name' | 'price' | 'stock' | 'updated'
  dir?: 'asc' | 'desc'
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => api.get<Paged<Product>>('/products', { ...params }),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.get<{ product: Product; movements: StockMovement[] }>(`/products/${id}`),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => api.get<{ items: { id: number; name: string; slug: string; productCount: number }[] }>('/products/categories'),
    staleTime: 10 * 60_000,
  })
}

export type ProductInput = Pick<
  Product,
  'sku' | 'name' | 'brand' | 'unit' | 'categoryId' | 'priceKobo' | 'costKobo' | 'lowStockThreshold' | 'barcode'
>

export function useSaveProduct(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) =>
      id ? api.patch<{ product: Product }>(`/products/${id}`, input) : api.post<{ product: Product }>('/products', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useArchiveProduct(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (archived: boolean) => api.post(`/products/${id}/archive`, { archived }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useAdjustStock(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { kind: 'receive' | 'damage' | 'correction' | 'return'; quantity: number; reason?: string }) =>
      api.post<{ product: Product }>(`/inventory/products/${id}/adjust`, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.lowStock }),
      ])
    },
  })
}

export interface ImportPreview {
  rows: { line: number; sku: string; name: string; category: string; priceKobo: number }[]
  errors: { line: number; message: string }[]
  creates: number
  updates: number
}

export const previewImport = (csv: string) => api.post<ImportPreview>('/products/import/preview', { csv })
export const commitImport = (csv: string) => api.post<{ creates: number; updates: number }>('/products/import', { csv })
