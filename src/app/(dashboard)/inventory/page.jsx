"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getInventoryService } from "@/features/inventory/services/inventory.service";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { InventoryCard } from "@/features/inventory/components/inventory-card";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";
import { InventoryStatsCards } from "@/features/inventory/components/inventory-stats-cards";
import { StockAdjustmentDialog } from "@/features/inventory/components/stock-adjustment-dialog";
import { toast } from "sonner";
const ITEMS_PER_PAGE = 20;
export default function InventoryPage() {
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [categories, setCategories] = useState([]);
    const [adjustItemId, setAdjustItemId] = useState(null);
    const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0 });
    const service = useMemo(() => getInventoryService(), []);
    const loadItems = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const result = await service.getInventoryItems(clinicId, {
                search: search || undefined,
                category_id: categoryFilter || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
                page,
                pageSize: ITEMS_PER_PAGE,
            });
            setItems(result.data);
            setTotal(result.total);
        }
        catch {
            toast.error("Failed to load inventory");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, service, search, categoryFilter, statusFilter, page]);
    const loadStats = useCallback(async () => {
        if (!clinicId)
            return;
        try {
            const s = await service.getStats(clinicId);
            setStats(s);
        }
        catch { }
    }, [clinicId, service]);
    useEffect(() => {
        loadItems();
        loadStats();
    }, [loadItems, loadStats]);
    useEffect(() => {
        if (!clinicId)
            return;
        service.getCategories(clinicId).then(setCategories).catch(() => { });
    }, [clinicId, service]);
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const handleAdjust = async (values) => {
        if (!clinicId || !user || !adjustItemId)
            return;
        try {
            await service.adjustStock(clinicId, adjustItemId, values, user.id);
            toast.success("Stock adjusted");
            setAdjustItemId(null);
            await loadItems();
            await loadStats();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to adjust stock");
        }
    };
    return (<div className="space-y-6">
      <PageHeader title="Inventory" description={`${total} item${total !== 1 ? "s" : ""} tracked`}>
        <Link to="/inventory/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4"/>
          Add Item
        </Link>
      </PageHeader>

      <InventoryStatsCards total={stats.total} lowStock={stats.lowStock} outOfStock={stats.outOfStock}/>

      <InventoryFilters search={search} onSearchChange={(v) => { setSearch(v); setPage(0); }} categoryId={categoryFilter} onCategoryChange={(v) => { setCategoryFilter(v); setPage(0); }} status={statusFilter} onStatusChange={(v) => { setStatusFilter(v); setPage(0); }} categories={categories}/>

      {loading ? (<div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground"/>
        </div>) : items.length === 0 ? (<div className="flex flex-col items-center gap-3 py-16">
          <Package className="size-12 text-muted-foreground/40"/>
          <h3 className="text-lg font-medium">No inventory items</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {search || categoryFilter !== "" || statusFilter !== "all"
                ? "No items match your filters."
                : "Add your first medicine or supply to start tracking."}
          </p>
          {!search && categoryFilter === "" && statusFilter === "all" && (<Link to="/inventory/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4"/>
              Add Item
            </Link>)}
        </div>) : (<>
          <div className="hidden md:block">
            <InventoryTable items={items} onAdjust={setAdjustItemId}/>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((item) => (<InventoryCard key={item.id} item={item} onAdjust={setAdjustItemId}/>))}
          </div>

          {totalPages > 1 && (<div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
                Next
              </button>
            </div>)}
        </>)}

      <StockAdjustmentDialog open={!!adjustItemId} onClose={() => setAdjustItemId(null)} onSubmit={handleAdjust}/>
    </div>);
}
