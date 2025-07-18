import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { koboToInput, parseMoneyInput } from '@/lib/money'
import { useCategories, type Product, type ProductInput } from './api'

const money = (label: string) => z.string().refine((v) => parseMoneyInput(v) !== null, `Enter the ${label} in naira, e.g. 2500`)

const schema = z.object({
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}-\d{3,5}$/, 'Use the aisle code and number, e.g. GRA-0105'),
  name: z.string().trim().min(2, 'Give the product a name'),
  brand: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Choose a category'),
  price: money('price'),
  cost: z.string().refine((v) => v === '' || parseMoneyInput(v) !== null, 'Enter the cost in naira'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Zero or more'),
  barcode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{8,14}$/.test(v), '8 to 14 digits'),
})

type Values = z.input<typeof schema>

export function ProductForm({
  product,
  onSubmit,
  submitLabel,
}: {
  product?: Product
  onSubmit: (input: ProductInput) => Promise<unknown>
  submitLabel: string
}) {
  const categories = useCategories()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: product?.sku ?? '',
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      unit: product?.unit ?? '',
      categoryId: product?.categoryId ? String(product.categoryId) : '',
      price: product ? koboToInput(product.priceKobo) : '',
      cost: product?.costKobo ? koboToInput(product.costKobo) : '',
      lowStockThreshold: product?.lowStockThreshold ?? 10,
      barcode: product?.barcode ?? '',
    },
  })
  const errors = form.formState.errors

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({
        sku: v.sku,
        name: v.name,
        brand: v.brand || null,
        unit: v.unit || null,
        categoryId: Number(v.categoryId),
        priceKobo: parseMoneyInput(v.price)!,
        costKobo: v.cost ? parseMoneyInput(v.cost) : null,
        lowStockThreshold: Number(v.lowStockThreshold),
        barcode: v.barcode || null,
      })
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [field, message] of Object.entries(err.fields)) form.setError(field as keyof Values, { message })
      }
      form.setError('root', { message: err instanceof Error ? err.message : 'Could not save' })
    }
  })

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {errors.root && <p className="text-sm text-red-600 sm:col-span-2">{errors.root.message}</p>}
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" className="mt-1.5 font-mono" {...form.register('sku')} />
        <FieldError message={errors.sku?.message} />
      </div>
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Select id="categoryId" className="mt-1.5 w-full" {...form.register('categoryId')}>
          <option value="">Choose…</option>
          {categories.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <FieldError message={errors.categoryId?.message} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" className="mt-1.5" {...form.register('name')} />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="brand">Brand</Label>
        <Input id="brand" className="mt-1.5" {...form.register('brand')} />
      </div>
      <div>
        <Label htmlFor="unit">Pack size</Label>
        <Input id="unit" className="mt-1.5" placeholder="e.g. 5kg" {...form.register('unit')} />
      </div>
      <div>
        <Label htmlFor="price">Price (₦)</Label>
        <Input id="price" inputMode="decimal" className="mt-1.5" {...form.register('price')} />
        <FieldError message={errors.price?.message} />
      </div>
      <div>
        <Label htmlFor="cost">Cost (₦)</Label>
        <Input id="cost" inputMode="decimal" className="mt-1.5" {...form.register('cost')} />
        <FieldError message={errors.cost?.message} />
      </div>
      <div>
        <Label htmlFor="lowStockThreshold">Reorder level</Label>
        <Input id="lowStockThreshold" type="number" min={0} className="mt-1.5" {...form.register('lowStockThreshold')} />
        <FieldError message={errors.lowStockThreshold?.message} />
      </div>
      <div>
        <Label htmlFor="barcode">Barcode</Label>
        <Input id="barcode" inputMode="numeric" className="mt-1.5" {...form.register('barcode')} />
        <FieldError message={errors.barcode?.message} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
