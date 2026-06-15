"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Package, Edit, PackageOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getInventoryService } from "@/features/inventory/services/inventory.service";
import { InventoryStatusBadge } from "@/features/inventory/components/inventory-status-badge";
import { TransactionHistoryTable } from "@/features/inventory/components/transaction-history-table";
import { StockAdjustmentDialog } from "@/features/inventory/components/stock-adjustment-dialog";
import { toast } from "sonner";
export default function InventoryItemDetailPage() {
    const { id } = useParams();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [item, setItem] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdjust, setShowAdjust] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const service = useMemo(() => getInventoryService(), []);
    const loadItem = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const data = await service.getInventoryItemById(clinicId, id);
            setItem(data);
            if (data) {
                const txs = await service.getTransactions(clinicId, id);
                setTransactions(txs);
            }
        }
        catch {
            toast.error("Failed to load item");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, id, service]);
    useEffect(() => {
        loadItem();
    }, [loadItem]);
    const handleAdjust = async (values) => {
        if (!clinicId || !user)
            return;
        try {
            await service.adjustStock(clinicId, id, values, user.id);
            toast.success("Stock adjusted");
            setShowAdjust(false);
            await loadItem();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to adjust stock");
        }
    };
    const [editName, setEditName] = useState("");
    const [editUnit, setEditUnit] = useState("");
    const [editMinStock, setEditMinStock] = useState(0);
    const [editDescription, setEditDescription] = useState("");
    const startEditing = () => {
        if (!item)
            return;
        setEditName(item.name);
        setEditUnit(item.unit);
        setEditMinStock(item.minimum_stock);
        setEditDescription(item.description || "");
        setEditing(true);
    };
    const saveEdit = async () => {
        if (!clinicId || !user || !item)
            return;
        setSaving(true);
        try {
            await service.updateInventoryItem(clinicId, id, {
                name: editName,
                unit: editUnit,
                minimum_stock: editMinStock,
                description: editDescription || null,
            }, user.id);
            toast.success("Item updated");
            setEditing(false);
            await loadItem();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update item");
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (<div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (!item) {
        return (<div className="space-y-6">
        <PageHeader title="Item Not Found">
          <Link to="/inventory" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4"/>
            Back to Inventory
          </Link>
        </PageHeader>
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">This item does not exist or you do not have access.</p>
        </div>
      </div>);
    }
    return (<div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={item.name}>
        <div className="flex items-center gap-2">
          <Link to="/inventory" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4"/>
            Back
          </Link>
        </div>
      </PageHeader>

      {/* Quick actions bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border p-4">
        <InventoryStatusBadge status={item.status} className="text-sm"/>
        <button onClick={() => setShowAdjust(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
          <PackageOpen className="size-3.5"/>
          Adjust Stock
        </button>
        {!editing && (<button onClick={startEditing} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Edit className="size-3.5"/>
            Edit Details
          </button>)}
      </div>

      {/* Item Details */}
      {editing ? (<SectionCard title="Edit Item">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Unit</label>
                <input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Minimum Stock</label>
                <input type="number" min="0" value={editMinStock} onChange={(e) => setEditMinStock(Number(e.target.value))} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"/>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} disabled={saving} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin"/>}
                Save
              </button>
            </div>
          </div>
        </SectionCard>) : (<div className="grid gap-6 md:grid-cols-2">
          <SectionCard title="Stock Info" icon={<Package className="size-4"/>}>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Stock</span>
                <span className="text-sm font-medium tabular-nums">{item.current_stock} {item.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minimum Stock</span>
                <span className="text-sm tabular-nums">{item.minimum_stock} {item.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm">{item.category_name || "Uncategorized"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Unit</span>
                <span className="text-sm">{item.unit}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Record Info">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created By</span>
                <span className="text-sm">{item.created_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-xs">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-xs">{new Date(item.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </SectionCard>
        </div>)}

      {/* Description */}
      {item.description && !editing && (<SectionCard title="Description">
          <p className="text-sm">{item.description}</p>
        </SectionCard>)}

      {/* Transaction History */}
      <SectionCard title="Transaction History">
        <TransactionHistoryTable transactions={transactions}/>
      </SectionCard>

      <StockAdjustmentDialog open={showAdjust} onClose={() => setShowAdjust(false)} onSubmit={handleAdjust}/>
    </div>);
}
