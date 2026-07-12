"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Plus, Trash2, Package, Scissors } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getProcedureService } from "@/features/procedures/services/procedure.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function NewProcedurePage() {
    const navigate = useNavigate();
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getProcedureService(), []);

    const [saving, setSaving] = useState(false);

    // Patient search
    const [patientQuery, setPatientQuery] = useState("");
    const [patientResults, setPatientResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientSearching, setPatientSearching] = useState(false);

    // Doctors
    const [doctors, setDoctors] = useState([]);
    const [doctorId, setDoctorId] = useState("");

    // Procedure catalog
    const [catalog, setCatalog] = useState([]);
    const [procedureName, setProcedureName] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Clinical fields
    const [findings, setFindings] = useState("");
    const [notes, setNotes] = useState("");

    // Consumables
    const [inventoryItems, setInventoryItems] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [loadingConsumables, setLoadingConsumables] = useState(false);

    useEffect(() => {
        if (!clinicId) return;
        Promise.all([
            service.getDoctors(clinicId),
            service.getProcedureCatalog(clinicId),
            service.getInventoryItems(clinicId),
        ]).then(([docs, cat, items]) => {
            setDoctors(docs);
            setCatalog(cat);
            setInventoryItems(items);
        }).catch(() => {});
    }, [clinicId, service]);

    // Patient search with debounce
    useEffect(() => {
        if (!clinicId || !patientQuery || patientQuery.trim().length < 2) {
            setPatientResults([]);
            return;
        }
        setPatientSearching(true);
        const timer = setTimeout(async () => {
            try {
                const results = await service.searchPatients(clinicId, patientQuery);
                setPatientResults(results);
            } catch {
                setPatientResults([]);
            } finally {
                setPatientSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [clinicId, patientQuery, service]);

    // Auto-load consumables when procedure name matches catalog
    const loadConsumablesForProcedure = useCallback(async (name) => {
        if (!clinicId || !name) return;
        setLoadingConsumables(true);
        try {
            const data = await service.getProcedureConsumables(clinicId, name);
            if (data.length > 0) {
                setConsumables(data.map(c => ({
                    inventory_item_id: c.inventory_item_id,
                    name: c.inventory_items?.name,
                    current_stock: c.inventory_items?.current_stock,
                    unit: c.inventory_items?.unit,
                    quantity: c.default_quantity || 1,
                })));
                toast.success(`Loaded ${data.length} consumable${data.length !== 1 ? "s" : ""} for "${name}"`);
            }
        } catch {
            // silently fail
        } finally {
            setLoadingConsumables(false);
        }
    }, [clinicId, service]);

    const handleProcedureNameChange = (value) => {
        setProcedureName(value);
        setShowSuggestions(value.length > 0);
    };

    const handleCatalogSelect = (name) => {
        setProcedureName(name);
        setShowSuggestions(false);
        loadConsumablesForProcedure(name);
    };

    const filteredCatalog = useMemo(() => {
        if (!procedureName.trim()) return catalog;
        const q = procedureName.toLowerCase();
        return catalog.filter(c => c.toLowerCase().includes(q));
    }, [catalog, procedureName]);

    // Consumables management
    const addConsumable = () => {
        setConsumables(prev => [...prev, {
            inventory_item_id: "",
            name: "",
            current_stock: 0,
            unit: "",
            quantity: 1,
        }]);
    };

    const updateConsumable = (index, field, value) => {
        setConsumables(prev => prev.map((c, i) => {
            if (i !== index) return c;
            if (field === "inventory_item_id") {
                const item = inventoryItems.find(it => it.id === value);
                return {
                    ...c,
                    inventory_item_id: value,
                    name: item?.name || "",
                    current_stock: item?.current_stock || 0,
                    unit: item?.unit || "",
                };
            }
            return { ...c, [field]: value };
        }));
    };

    const removeConsumable = (index) => {
        setConsumables(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!clinicId || !user) return;
        if (!selectedPatient) { toast.error("Please select a patient"); return; }
        if (!procedureName.trim()) { toast.error("Procedure name is required"); return; }
        if (!doctorId) { toast.error("Please select a doctor"); return; }

        setSaving(true);
        try {
            const validConsumables = consumables.filter(c => c.inventory_item_id && c.quantity > 0);
            await service.recordProcedure(clinicId, {
                patient_id: selectedPatient.id,
                doctor_id: doctorId,
                procedure_name: procedureName.trim(),
                findings,
                notes,
                consumables: validConsumables,
            }, user.id);
            toast.success("Procedure recorded successfully");
            navigate("/procedures");
        } catch (err) {
            toast.error(handleApiError(err, "Failed to record procedure"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader title="Record Procedure">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-4" /> Back
                </button>
            </PageHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                <SectionCard title="Patient" icon={<Scissors className="size-4" />}>
                    {selectedPatient ? (
                        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {selectedPatient.full_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{selectedPatient.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">{selectedPatient.phone || "No phone"} · {selectedPatient.gender || "—"}</p>
                            </div>
                            <button type="button" onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                                className="rounded-lg border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50">
                                Change
                            </button>
                        </div>
                    ) : (
                        <div>
                            <input value={patientQuery} onChange={e => setPatientQuery(e.target.value)}
                                placeholder="Search patient by name or phone..."
                                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                            {patientSearching && <p className="mt-1 text-[10px] text-muted-foreground">Searching...</p>}
                            {patientResults.length > 0 && (
                                <div className="mt-1 rounded-lg border bg-white shadow-sm max-h-48 overflow-y-auto">
                                    {patientResults.map(p => (
                                        <button key={p.id} type="button"
                                            onClick={() => { setSelectedPatient(p); setPatientQuery(""); setPatientResults([]); }}
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors border-b last:border-0">
                                            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                                {p.full_name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium truncate">{p.full_name}</p>
                                                <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {patientQuery.length >= 2 && !patientSearching && patientResults.length === 0 && (
                                <p className="mt-1 text-[10px] text-muted-foreground">No patients found. <Link to="/patients/new" className="text-primary hover:underline">Add new patient</Link></p>
                            )}
                        </div>
                    )}
                </SectionCard>

                {/* Procedure Details */}
                <SectionCard title="Procedure Details" icon={<Scissors className="size-4" />}>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium">Procedure Name *</label>
                            <div className="relative">
                                <input value={procedureName} onChange={e => handleProcedureNameChange(e.target.value)}
                                    onFocus={() => setShowSuggestions(procedureName.length > 0)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="e.g. Tooth Extraction, Wound Suturing, ECG..."
                                    className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                {showSuggestions && filteredCatalog.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-sm max-h-48 overflow-y-auto">
                                        {filteredCatalog.map(name => (
                                            <button key={name} type="button"
                                                onMouseDown={(e) => { e.preventDefault(); handleCatalogSelect(name); }}
                                                className="flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-muted/30 transition-colors border-b last:border-0">
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {catalog.length > 0 && (
                                <p className="mt-1 text-[10px] text-muted-foreground">{catalog.length} procedure(s) in catalog — start typing to search</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium">Doctor *</label>
                            <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
                                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                                <option value="">Select doctor</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium">Findings / Observations</label>
                            <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={3}
                                placeholder="Clinical findings, observations..."
                                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                placeholder="Additional notes, post-procedure instructions..."
                                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                        </div>
                    </div>
                </SectionCard>

                {/* Consumables */}
                <SectionCard
                    title="Consumables"
                    icon={<Package className="size-4" />}
                    actions={
                        <button type="button" onClick={addConsumable}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors">
                            <Plus className="size-3" /> Add
                        </button>
                    }
                >
                    {loadingConsumables && (
                        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> Loading consumables from catalog...
                        </div>
                    )}
                    {consumables.length === 0 && !loadingConsumables ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                            No consumables added. Select a procedure from the catalog to auto-load, or add manually.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {consumables.map((c, idx) => (
                                <div key={idx} className="flex items-center gap-2 rounded-lg border bg-muted/10 p-3">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <select value={c.inventory_item_id} onChange={e => updateConsumable(idx, "inventory_item_id", e.target.value)}
                                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                                            <option value="">Select inventory item</option>
                                            {inventoryItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} (Stock: {item.current_stock} {item.unit})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-muted-foreground">Quantity</label>
                                                <input type="number" min="1" value={c.quantity}
                                                    onChange={e => updateConsumable(idx, "quantity", parseInt(e.target.value) || 1)}
                                                    className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                            </div>
                                            {c.inventory_item_id && (
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground">Current Stock</p>
                                                    <p className={`text-sm font-semibold ${c.current_stock <= 0 ? "text-red-600" : "text-emerald-600"}`}>
                                                        {c.current_stock} {c.unit}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeConsumable(idx)}
                                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* Submit */}
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={saving || !selectedPatient || !procedureName.trim() || !doctorId}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
                        {saving ? "Recording..." : "Record Procedure"}
                    </button>
                    <button type="button" onClick={() => navigate(-1)}
                        className="rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
