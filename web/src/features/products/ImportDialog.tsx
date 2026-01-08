import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { productKeys } from '@/lib/queryKeys'
import { commitImport, previewImport, type ImportPreview } from './api'

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient()
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setCsv('')
    setPreview(null)
    setError(null)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    reset()
    const text = await file.text()
    setCsv(text)
    setBusy(true)
    try {
      setPreview(await previewImport(text))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read the file')
    } finally {
      setBusy(false)
    }
  }

  const onImport = async () => {
    setBusy(true)
    try {
      const res = await commitImport(csv)
      toast.success(`Import done: ${res.creates} new, ${res.updates} updated`)
      await queryClient.invalidateQueries({ queryKey: productKeys.all })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products</DialogTitle>
          <DialogDescription>
            CSV with columns SKU, Name, Category, Price and optionally Brand, Unit, Barcode, Low stock at. Existing SKUs are updated; stock
            is not changed.
          </DialogDescription>
        </DialogHeader>
        <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={(e) => onFile(e.target.files?.[0])} />
        {error && <Alert tone="error">{error}</Alert>}
        {preview && (
          <div className="space-y-2 text-sm">
            <p>
              <strong>{preview.creates}</strong> new products, <strong>{preview.updates}</strong> updates.
            </p>
            {preview.errors.length > 0 && (
              <Alert tone="warning">
                <p className="font-medium">{preview.errors.length} rows need fixing before you can import:</p>
                <ul className="mt-1 list-disc pl-5">
                  {preview.errors.slice(0, 8).map((e) => (
                    <li key={e.line}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button disabled={!preview || preview.errors.length > 0 || busy || !preview.rows.length} onClick={onImport}>
            Import {preview?.rows.length ?? ''} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
