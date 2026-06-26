"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Printer, CreditCard, FileText, Download, CheckCircle2, AlertCircle, Shield, Pill, Beaker, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const SERVICE_CATEGORIES = [
    { value: "consultation", label: "Consultation", icon: Stethoscope },
    { value: "lab", label: "Lab", icon: Beaker },
    { value: "procedure", label: "Procedure", icon: Shield },
    { value: "pharmacy", label: "Pharmacy", icon: Pill },
    { value: "other", label: "Other", icon: FileText },
];

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "mtn_momo", label: "MTN MoMo" },
    { value: "airtel_money", label: "Airtel Money" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "card", label: "Card" },
    { value: "insurance", label: "Insurance" },
];

const INVOICE_STATUS_STYLES = {
    draft: "text-gray-600 bg-gray-50",
    issued: "text-blue-600 bg-blue-50",
    paid: "text-emerald-600 bg-emerald-50",
    partially_paid: "text-amber-600 bg-amber-50",
    cancelled: "text-red-600 bg-red-50",
};

export function BillingPanel({ consultationId, patientId, clinicId, userId, service, patient }) {
    const [invoices, setInvoices] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showPayment, setShowPayment] = useState(null);
    const [showInsurance, setShowInsurance] = useState(null);
    const [saving, setSaving] = useState(false);

    const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0, service_catalog_id: null }]);
    const [notes, setNotes] = useState("");
    const [insuranceData, setInsuranceData] = useState({
        provider: "", policy_number: "", covered_amount: 0, co_pay_amount: 0,
    });

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const [invoicesData, catalogData] = await Promise.all([
                service.getInvoicesForConsultation(clinicId, consultationId),
                service.getServiceCatalog(clinicId),
            ]);
            setInvoices(invoicesData);
            setCatalog(catalogData);
        } catch { toast.error("Failed to load billing data"); }
        finally { setLoading(false); }
    }, [clinicId, consultationId, service]);

    useEffect(() => { load(); }, [load]);

    const subtotal = useMemo(() =>
        items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1), 0),
    [items]);

    const addItem = useCallback(() => {
        setItems(prev => [...prev, { description: "", quantity: 1, unit_price: 0, service_catalog_id: null }]);
    }, []);

    const removeItem = useCallback((index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateItem = useCallback((index, field, value) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    }, []);

    const selectCatalogItem = useCallback((index, catalogItem) => {
        setItems(prev => prev.map((item, i) => i === index ? {
            description: catalogItem.name,
            quantity: 1,
            unit_price: parseFloat(catalogItem.price),
            service_catalog_id: catalogItem.id,
        } : item));
    }, []);

    const handleCreateInvoice = useCallback(async () => {
        if (items.length === 0 || items.every(i => !i.description)) {
            toast.error("Add at least one item");
            return;
        }
        setSaving(true);
        try {
            const invoiceData = {
                patient_id: patientId,
                consultation_id: consultationId,
                subtotal,
                tax: 0,
                total: subtotal,
                items: items.filter(i => i.description),
                notes,
            };
            await service.createInvoice(clinicId, invoiceData, userId);
            toast.success("Invoice created");
            setShowAddForm(false);
            setItems([{ description: "", quantity: 1, unit_price: 0, service_catalog_id: null }]);
            setNotes("");
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to create invoice"));
        } finally { setSaving(false); }
    }, [items, subtotal, notes, patientId, consultationId, clinicId, userId, service, load]);

    const handlePayment = useCallback(async (invoiceId) => {
        setSaving(true);
        try {
            const paymentData = {
                invoice_id: invoiceId,
                patient_id: patientId,
                amount: showPayment?.amount || 0,
                payment_method: showPayment?.method || "cash",
                transaction_reference: showPayment?.reference || null,
                notes: null,
            };
            await service.recordPayment(clinicId, paymentData, userId);
            toast.success("Payment recorded");
            setShowPayment(null);
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to record payment"));
        } finally { setSaving(false); }
    }, [clinicId, patientId, userId, service, showPayment, load]);

    const handleInsuranceClaim = useCallback(async (invoiceId) => {
        setSaving(true);
        try {
            await service.createInsuranceClaim(clinicId, {
                patient_id: patientId,
                invoice_id: invoiceId,
                provider: insuranceData.provider,
                policy_number: insuranceData.policy_number || null,
                total_amount: invoices.find(i => i.id === invoiceId)?.total || 0,
                covered_amount: parseFloat(insuranceData.covered_amount) || 0,
                co_pay_amount: parseFloat(insuranceData.co_pay_amount) || 0,
            }, userId);
            toast.success("Insurance claim created");
            setShowInsurance(null);
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to create claim"));
        } finally { setSaving(false); }
    }, [clinicId, patientId, userId, service, insuranceData, invoices, load]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground"/></div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="size-4 text-emerald-500" /> Billing & Invoices
                </h3>
                <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Plus className="size-3" /> {showAddForm ? "Cancel" : "New Invoice"}
                </button>
            </div>

            {showAddForm && (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {SERVICE_CATEGORIES.map(cat => (
                            <button key={cat.value} onClick={async () => {
                                const items = await service.getServiceCatalog(clinicId, cat.value);
                                if (items.length === 0) {
                                    toast.error("No services in this category. Add one first.");
                                    return;
                                }
                                setCatalog(prev => {
                                    const existing = new Map(prev.map(c => [c.id, c]));
                                    items.forEach(i => existing.set(i.id, i));
                                    return [...existing.values()];
                                });
                            }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                                <cat.icon className="size-3" /> {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <select value={item.service_catalog_id || ""} onChange={(e) => {
                                            const ci = catalog.find(c => c.id === e.target.value);
                                            if (ci) selectCatalogItem(index, ci);
                                            else updateItem(index, "service_catalog_id", null);
                                        }} className="flex-1 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none min-w-[120px]">
                                            <option value="">Quick add...</option>
                                            {catalog.map(c => <option key={c.id} value={c.id}>{c.name} — {formatCurrency(c.price)}</option>)}
                                        </select>
                                        <input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Description" className="flex-1 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none min-w-[100px]" />
                                        <input type="number" value={item.quantity} min="1" onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)} className="w-14 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none text-center" />
                                        <input type="number" value={item.unit_price} min="0" step="100" onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} className="w-20 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none text-right" placeholder="Price" />
                                        <span className="text-xs font-semibold w-16 text-right">{(parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1)} RWF</span>
                                        <button onClick={() => removeItem(index)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="size-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={addItem} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"><Plus className="size-3" /> Add item</button>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none max-w-xs" />
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span></span>
                            <button onClick={handleCreateInvoice} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                {saving && <Loader2 className="size-3 animate-spin" />}
                                Issue Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No invoices yet</p>
            ) : (
                <div className="space-y-2">
                    {invoices.map(inv => (
                        <div key={inv.id} className="rounded-xl border bg-white p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-semibold">{inv.invoice_number}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${INVOICE_STATUS_STYLES[inv.status]}`}>{inv.status.replace("_", " ")}</span>
                                    <span className="text-sm font-bold">{formatCurrency(inv.total)}</span>
                                </div>
                            </div>

                            <div className="space-y-1 mb-2">
                                {(inv.billing_line_items || []).map((line, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{line.description} x{line.quantity}</span>
                                        <span>{formatCurrency(line.total)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => setShowPayment(showPayment?.id === inv.id ? null : { id: inv.id, amount: inv.total, method: "cash", reference: "" })}
                                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors">
                                    <CreditCard className="size-3" /> Record Payment
                                </button>
                                {patient?.insurance_provider && (
                                    <button onClick={() => setShowInsurance(showInsurance === inv.id ? null : inv.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors">
                                        <Shield className="size-3" /> Insurance Claim
                                    </button>
                                )}
                                <button className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                                    <Printer className="size-3" /> Print
                                </button>
                            </div>

                            {showPayment?.id === inv.id && (
                                <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <select value={showPayment.method} onChange={(e) => setShowPayment(prev => ({ ...prev, method: e.target.value }))}
                                            className="rounded-lg border bg-white px-2 py-1.5 text-xs outline-none">
                                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                        <input type="number" value={showPayment.amount} onChange={(e) => setShowPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                            className="w-28 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none text-right" placeholder="Amount" />
                                        <input value={showPayment.reference} onChange={(e) => setShowPayment(prev => ({ ...prev, reference: e.target.value }))}
                                            className="flex-1 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none" placeholder="Transaction ref (optional)" />
                                        <button onClick={() => handlePayment(inv.id)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                            {saving ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} Pay
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showInsurance === inv.id && (
                                <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
                                    <p className="text-xs font-medium">Insurance: {patient?.insurance_provider} ({patient?.insurance_policy_number})</p>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={insuranceData.covered_amount} onChange={(e) => setInsuranceData(prev => ({ ...prev, covered_amount: e.target.value }))}
                                            className="w-24 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none text-right" placeholder="Covered" />
                                        <input type="number" value={insuranceData.co_pay_amount} onChange={(e) => setInsuranceData(prev => ({ ...prev, co_pay_amount: e.target.value }))}
                                            className="w-24 rounded-lg border bg-white px-2 py-1.5 text-xs outline-none text-right" placeholder="Co-pay" />
                                        <button onClick={() => handleInsuranceClaim(inv.id)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Shield className="size-3" />} Submit Claim
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
