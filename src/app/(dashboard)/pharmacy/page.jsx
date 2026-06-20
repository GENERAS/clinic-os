"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, Package, User, Clock, CheckCircle2, AlertTriangle, ChevronRight, Pill, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPharmacyService } from "@/features/pharmacy/services/pharmacy.service";
import { toast } from "sonner";

const DISPENSE_STATUS_STYLES = {
    pending: "text-amber-600 bg-amber-50",
    partial: "text-blue-600 bg-blue-50",
    dispensed: "text-emerald-600 bg-emerald-50",
};

export default function PharmacyQueuePage() {
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getPharmacyService(), []);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [batches, setBatches] = useState([]);
    const [dispensing, setDispensing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [stats, setStats] = useState(null);

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const [data, statsData] = await Promise.all([
                service.getPendingPrescriptions(clinicId),
                service.getPharmacyStats(clinicId),
            ]);
            setPrescriptions(data);
            setStats(statsData);
        } catch { toast.error("Failed to load pharmacy queue"); }
        finally { setLoading(false); }
    }, [clinicId, service]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!search.trim()) return prescriptions;
        const q = search.toLowerCase();
        return prescriptions.filter(p =>
            (p.consultations?.patients?.full_name || "").toLowerCase().includes(q) ||
            (p.medicine_name || "").toLowerCase().includes(q)
        );
    }, [prescriptions, search]);

    const grouped = useMemo(() => {
        const map = new Map();
        filtered.forEach(p => {
            const patientId = p.consultations?.patients?.id;
            if (!patientId) return;
            if (!map.has(patientId)) {
                map.set(patientId, {
                    patient: p.consultations.patients,
                    consultation: p.consultations,
                    prescriptions: [],
                });
            }
            map.get(patientId).prescriptions.push(p);
        });
        return [...map.values()];
    }, [filtered]);

    const handleSelectPrescription = useCallback(async (prescription) => {
        setSelected(prescription);
        setDispensing(null);
        setShowInventory(false);
        try {
            const items = await service.getInventoryItemsWithStock(clinicId, prescription.medicine_name);
            setInventoryItems(items);
            if (items.length > 0) {
                const b = await service.getBatchesForItem(clinicId, items[0].id);
                setBatches(b);
                setDispensing({
                    inventory_item_id: items[0].id,
                    batch_id: b.length > 0 ? b[0].id : null,
                    quantity: 1,
                    medicine_name: prescription.medicine_name,
                });
                setShowInventory(true);
            }
        } catch { toast.error("Failed to load inventory data"); }
    }, [clinicId, service]);

    const handleDispense = useCallback(async () => {
        if (!selected || !dispensing || !clinicId || !user) return;
        setSaving(true);
        try {
            await service.dispense(clinicId, {
                prescription_id: selected.id,
                inventory_item_id: dispensing.inventory_item_id,
                batch_id: dispensing.batch_id || null,
                medicine_name: selected.medicine_name,
                quantity_dispensed: dispensing.quantity,
                notes: null,
            }, user.id);
            toast.success(`Dispensed ${dispensing.quantity} × ${selected.medicine_name}`);
            setSelected(null);
            setDispensing(null);
            setShowInventory(false);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to dispense");
        } finally { setSaving(false); }
    }, [selected, dispensing, clinicId, user, service, load]);

    const handleSelectItem = useCallback(async (itemId) => {
        const item = inventoryItems.find(i => i.id === itemId);
        if (!item) return;
        const b = await service.getBatchesForItem(clinicId, itemId);
        setBatches(b);
        setDispensing(prev => ({ ...prev, inventory_item_id: itemId, batch_id: b.length > 0 ? b[0].id : null, quantity: 1 }));
    }, [clinicId, service, inventoryItems]);

    const handleSearchInventory = useCallback(async (q) => {
        if (!q.trim()) return;
        const items = await service.getInventoryItemsWithStock(clinicId, q);
        setInventoryItems(items);
        if (items.length > 0) {
            const b = await service.getBatchesForItem(clinicId, items[0].id);
            setBatches(b);
            setDispensing(prev => ({ ...prev, inventory_item_id: items[0].id, batch_id: b.length > 0 ? b[0].id : null }));
        }
    }, [clinicId, service]);

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;

    return (
        <div className="space-y-5">
            <PageHeader title="Pharmacy" description={stats ? `${stats.pending_prescriptions} pending · ${stats.dispensed_today} dispensed today` : "Dispensing queue"}>
                <div className="flex items-center gap-2">
                    {stats?.near_expiry_batches > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                            <AlertTriangle className="size-3" /> {stats.near_expiry_batches} expiring
                        </span>
                    )}
                    {stats?.low_stock_items?.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-700">
                            <AlertTriangle className="size-3" /> {stats.low_stock_items.length} low stock
                        </span>
                    )}
                </div>
            </PageHeader>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or medicine..." className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className={`${showInventory ? "hidden lg:block lg:col-span-2" : "lg:col-span-3"}`}>
                    {grouped.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                            <Package className="size-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No pending prescriptions</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {grouped.map((group) => (
                                <div key={group.patient.id} className="rounded-xl border bg-white shadow-sm">
                                    <div className="flex items-center gap-3 border-b px-4 py-3 bg-muted/10">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <User className="size-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold">{group.patient.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground">{group.patient.phone} · {new Date(group.consultation.created_at).toLocaleDateString("en-RW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                        <span className="text-xs font-medium">{group.prescriptions.length} Rx</span>
                                    </div>
                                    <div className="divide-y">
                                        {group.prescriptions.map((rx) => (
                                            <button key={rx.id} onClick={() => handleSelectPrescription(rx)}
                                                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors ${selected?.id === rx.id ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                                                    <Pill className="size-3.5 text-emerald-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold">{rx.medicine_name} {rx.strength ? `(${rx.strength})` : ""}</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {rx.dosage} · {rx.frequency} · {rx.duration}
                                                        {rx.quantity ? ` · Qty: ${rx.quantity}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DISPENSE_STATUS_STYLES[rx.dispensed_status] || "text-gray-600 bg-gray-50"}`}>
                                                        {rx.dispensed_status} {rx.quantity_dispensed > 0 ? `(${rx.quantity_dispensed}/${rx.quantity})` : ""}
                                                    </span>
                                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showInventory && selected && dispensing && (
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-white p-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Pill className="size-4 text-emerald-500" /> Dispense: {selected.medicine_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                Prescribed: {selected.dosage} · {selected.frequency} · {selected.duration}
                                {selected.quantity ? ` · Total: ${selected.quantity}` : ""}
                                {selected.quantity_dispensed > 0 ? ` · Already dispensed: ${selected.quantity_dispensed}` : ""}
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Medicine in Stock</label>
                                    <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                                        {inventoryItems.length === 0 ? (
                                            <p className="text-xs text-red-500">No matching item in stock</p>
                                        ) : inventoryItems.map(item => (
                                            <button key={item.id} onClick={() => handleSelectItem(item.id)}
                                                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${dispensing.inventory_item_id === item.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}>
                                                <span className="font-medium">{item.name}</span>
                                                <span className={`font-semibold ${item.current_stock <= item.minimum_stock ? "text-red-500" : "text-emerald-600"}`}>
                                                    {item.current_stock} {item.unit}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => { const q = prompt("Search medicine:"); if (q) handleSearchInventory(q); }} className="mt-1 text-[10px] font-medium text-primary hover:text-primary/80">
                                        Search all inventory...
                                    </button>
                                </div>

                                {batches.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Batch / Lot</label>
                                        <div className="mt-1 space-y-1">
                                            {batches.map(b => (
                                                <button key={b.id} onClick={() => setDispensing(prev => ({ ...prev, batch_id: b.id }))}
                                                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${dispensing.batch_id === b.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}>
                                                    <div>
                                                        <span className="font-medium">{b.batch_number}</span>
                                                        <span className={`ml-2 ${new Date(b.expiry_date) < new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                                                            Exp: {new Date(b.expiry_date).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold">{b.quantity} remaining</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Quantity to Dispense</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <button onClick={() => setDispensing(prev => ({ ...prev, quantity: Math.max(1, (prev?.quantity || 1) - 1) }))}
                                            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted/30">−</button>
                                        <input type="number" value={dispensing.quantity} min="1" max={selected.quantity - selected.quantity_dispensed || 999}
                                            onChange={(e) => setDispensing(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="w-16 rounded-lg border bg-white px-3 py-1.5 text-sm text-center font-semibold outline-none" />
                                        <button onClick={() => setDispensing(prev => ({ ...prev, quantity: Math.min((prev?.quantity || 1) + 1, selected.quantity - selected.quantity_dispensed || 999) }))}
                                            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted/30">+</button>
                                        <span className="text-xs text-muted-foreground">/ {selected.quantity - selected.quantity_dispensed} remaining</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <button onClick={handleDispense} disabled={saving}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                        {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                        Confirm Dispense
                                    </button>
                                    <button onClick={() => { setShowInventory(false); setSelected(null); }}
                                        className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>

                        {stats?.near_expiry_items?.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-2">
                                    <AlertTriangle className="size-3.5" /> Near-Expiry Batches
                                </h4>
                                <div className="space-y-1">
                                    {stats.near_expiry_items.slice(0, 5).map(b => (
                                        <div key={b.id} className="flex items-center justify-between text-[10px] text-amber-700">
                                            <span>{b.inventory_items?.name} — {b.batch_number}</span>
                                            <span>Exp: {new Date(b.expiry_date).toLocaleDateString()} · {b.quantity} left</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
