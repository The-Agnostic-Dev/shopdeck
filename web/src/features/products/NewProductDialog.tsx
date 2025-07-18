import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useSaveProduct } from './api'
import { ProductForm } from './ProductForm'

export function NewProductDialog() {
  const [open, setOpen] = useState(false)
  const save = useSaveProduct()
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>Stock starts at zero. Receive stock from the product page once it arrives.</DialogDescription>
        </DialogHeader>
        <ProductForm
          submitLabel="Create product"
          onSubmit={async (input) => {
            const { product } = await save.mutateAsync(input)
            toast.success(`${product.name} created`)
            setOpen(false)
            navigate(`/products/${product.id}`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
