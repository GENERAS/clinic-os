"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, Package } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getInventoryService } from "@/features/inventory/services/inventory.service"
import { createInventoryItemSchema, type CreateInventoryItemFormValues } from "@/features/inventory/schemas"
import type { InventoryCategory } from "@/types/database"
import { toast } from "sonner"

export default function NewInventoryItemPage() {
  const router = useRouter()
  const { user, clinic: authClinic } = useAuth()
  const clinicId = authClinic?.id

  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const service = useMemo(() => getInventoryService(), [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateInventoryItemFormValues>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: {
      unit: "piece",
      current_stock: 0,
      minimum_stock: 0,
    },
  })

  useEffect(() => {
    if (!clinicId) return
    service.getCategories(clinicId).then(setCategories).catch(() => {})
  }, [clinicId, service])

  const handleAddCategory = async () => {
    if (!clinicId || !newCategoryName.trim()) return
    try {
      const cat = await service.createCategory(clinicId, newCategoryName.trim())
      setCategories((prev) => [...prev, cat])
      setValue("category_id", cat.id)
      setNewCategoryName("")
      setShowNewCategory(false)
      toast.success("Category created")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category")
    }
  }

  const onSubmit = async (values: CreateInventoryItemFormValues) => {
    if (!clinicId || !user) return
    setSaving(true)
    try {
      const item = await service.createInventoryItem(
        clinicId,
        {
          name: values.name,
          category_id: values.category_id || null,
          unit: values.unit,
          current_stock: values.current_stock,
          minimum_stock: values.minimum_stock,
          description: values.description || null,
        },
        user.id
      )
      toast.success("Item added")
      router.push(`/inventory/${item.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Add Inventory Item">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Inventory
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <SectionCard title="Item Details" icon={<Package className="size-4" />}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Name *</label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Paracetamol 500mg, Syringes, Bandages"
                {...register("name")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit" className="mb-1.5 block text-sm font-medium">Unit *</label>
                <input
                  id="unit"
                  type="text"
                  placeholder="piece, tablet, bottle, ml"
                  {...register("unit")}
                  disabled={saving}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
                {errors.unit && <p className="mt-1 text-xs text-destructive">{errors.unit.message}</p>}
              </div>
              <div>
                <label htmlFor="category_id" className="mb-1.5 block text-sm font-medium">Category</label>
                <div className="flex gap-2">
                  <select
                    id="category_id"
                    {...register("category_id")}
                    disabled={saving}
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    +
                  </button>
                </div>
                {showNewCategory && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="current_stock" className="mb-1.5 block text-sm font-medium">
                  Current Stock
                </label>
                <input
                  id="current_stock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...register("current_stock")}
                  disabled={saving}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
                {errors.current_stock && <p className="mt-1 text-xs text-destructive">{errors.current_stock.message}</p>}
              </div>
              <div>
                <label htmlFor="minimum_stock" className="mb-1.5 block text-sm font-medium">
                  Minimum Stock
                </label>
                <input
                  id="minimum_stock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...register("minimum_stock")}
                  disabled={saving}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
                {errors.minimum_stock && <p className="mt-1 text-xs text-destructive">{errors.minimum_stock.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                id="description"
                rows={3}
                placeholder="Dosage, brand, notes..."
                {...register("description")}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-3">
          <Link
            href="/inventory"
            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Adding..." : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  )
}
