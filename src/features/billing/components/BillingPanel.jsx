"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Printer, CreditCard, FileText, Download, CheckCircle2, AlertCircle, Shield, Pill, Beaker, Stethoscope, Receipt } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
import { TAX_CLASSES } from "@/features/insurance/services/insurance.service";

const escapeHtml = (str) => {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

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

    const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0, service_catalog_id: null, tax_classification: "D" }]);
    const [notes, setNotes] = useState("");
    const [patientInsurance, setPatientInsurance] = useState(null);
    const [insuranceData, setInsuranceData] = useState({
        provider: "", policy_number: "", covered_amount: 0, co_pay_amount: 0,
    });

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const [invoicesData, catalogData, insData] = await Promise.all([
                service.getInvoicesForConsultation(clinicId, consultationId),
                service.getServiceCatalog(clinicId),
                service.getPatientInsurance(clinicId, patientId),
            ]);
            setInvoices(invoicesData);
            setCatalog(catalogData);
            setPatientInsurance(insData);
        } catch (err) { toast.error(handleApiError(err, "Failed to load billing data")); }
        finally { setLoading(false); }
    }, [clinicId, consultationId, patientId, service]);

    useEffect(() => { load(); }, [load]);

    const subtotal = useMemo(() =>
        items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1), 0),
    [items]);

    const taxBreakdown = useMemo(() => {
        const breakdown = {};
        let totalTax = 0;
        items.forEach(item => {
            const lineTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1);
            const classKey = item.tax_classification || "D";
            const rate = TAX_CLASSES[classKey]?.rate || 0;
            const taxAmount = Math.round(lineTotal * rate / 100);
            if (!breakdown[classKey]) breakdown[classKey] = { rate, amount: 0 };
            breakdown[classKey].amount += taxAmount;
            totalTax += taxAmount;
        });
        return { breakdown, totalTax };
    }, [items]);

    const addItem = useCallback(() => {
        setItems(prev => [...prev, { description: "", quantity: 1, unit_price: 0, service_catalog_id: null, tax_classification: "D" }]);
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
            tax_classification: catalogItem.tax_classification || "D",
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
                tax: taxBreakdown.totalTax,
                total: subtotal + taxBreakdown.totalTax,
                items: items.filter(i => i.description),
                notes,
            };
            await service.createInvoice(clinicId, invoiceData, userId);
            toast.success("Invoice created");
            setShowAddForm(false);
            setItems([{ description: "", quantity: 1, unit_price: 0, service_catalog_id: null, tax_classification: "D" }]);
            setNotes("");
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to create invoice"));
        } finally { setSaving(false); }
    }, [items, subtotal, taxBreakdown, notes, patientId, consultationId, clinicId, userId, service, load]);

    const handlePayment = useCallback(async (invoiceId) => {
        const inv = invoices.find(i => i.id === invoiceId);
        if (inv) {
            const paid = (inv.patient_payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
            const outstanding = inv.total - paid;
            if ((showPayment?.amount || 0) > outstanding + 0.01) {
                toast.error(`Payment (${formatCurrency(showPayment.amount)}) exceeds outstanding balance (${formatCurrency(outstanding)})`);
                return;
            }
        }
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
    }, [clinicId, patientId, userId, service, showPayment, load, invoices]);

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
                                        <select value={item.tax_classification} onChange={(e) => updateItem(index, "tax_classification", e.target.value)} className="w-14 rounded-lg border bg-white px-1 py-1.5 text-[10px] outline-none text-center" title="Tax Class">
                                            {Object.entries(TAX_CLASSES).map(([k, v]) => <option key={k} value={k}>{k}</option>)}
                                        </select>
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
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground">Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span></span>
                                {taxBreakdown.totalTax > 0 && (
                                    <span className="text-xs text-muted-foreground ml-2">Tax: <span className="font-semibold">{formatCurrency(taxBreakdown.totalTax)}</span></span>
                                )}
                                <div className="text-sm font-bold">{formatCurrency(subtotal + taxBreakdown.totalTax)}</div>
                            </div>
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
                                <button onClick={() => {
                                        const paid = (inv.patient_payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                                        const outstanding = Math.max(0, inv.total - paid);
                                        setShowPayment(showPayment?.id === inv.id ? null : { id: inv.id, amount: outstanding, method: "cash", reference: "" });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors">
                                    <CreditCard className="size-3" /> Record Payment
                                </button>
                                {patientInsurance && (
                                    <button onClick={() => setShowInsurance(showInsurance === inv.id ? null : inv.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors">
                                        <Shield className="size-3" /> Insurance Claim
                                    </button>
                                )}
                                {(inv.status === "paid" || inv.status === "partially_paid") && (
                                    <button onClick={async () => {
                                        try {
                                            const { getTaxService } = await import("@/features/tax/services/tax.service");
                                            const taxSvc = getTaxService();
                                            const receipt = await taxSvc.generateFiscalReceipt(clinicId, inv.id, {
                                                total: inv.total,
                                                total_tax: inv.tax || 0,
                                                tax_class: "D",
                                            });
                                            toast.success(`Fiscal receipt ${receipt.fiscal_number} generated`);
                                            load();
                                        } catch (err) { toast.error(handleApiError(err, "Failed to generate fiscal receipt")); }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-violet-600 border-violet-200 hover:bg-violet-50 transition-colors">
                                        <Receipt className="size-3" /> Fiscal Receipt
                                    </button>
                                )}
                                <button onClick={() => {
                                        const printWindow = window.open("", "_blank", "width=800,height=600");
                                        if (!printWindow) { toast.error("Pop-up blocked. Please allow pop-ups."); return; }
                                        const clinicName = escapeHtml(patient?.clinic_name || "ClinicOS");
                                        const clinicPhone = escapeHtml(patient?.clinic_phone || "");
                                        const clinicAddress = escapeHtml(patient?.clinic_address || "");
                                        const payStatus = inv.status === "paid" ? "PAID" : inv.status === "partially_paid" ? "PARTIALLY PAID" : "UNPAID";
                                        const paid = (inv.patient_payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                                        const balance = inv.total - paid;
                                        const lineItemsHtml = (inv.billing_line_items || []).map((line, i) =>
                                            `<tr>
                                                <td style="padding:6px 0;border-bottom:1px solid #eee;">${i + 1}. ${escapeHtml(line.description)}</td>
                                                <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">${line.quantity}</td>
                                                <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(line.unit_price)}</td>
                                                <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatCurrency(line.total)}</td>
                                            </tr>`
                                        ).join("");
                                        const paymentsHtml = (inv.patient_payments || []).map(p =>
                                            `<tr>
                                                <td style="padding:4px 0;border-bottom:1px solid #eee;">${new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                                <td style="padding:4px 0;border-bottom:1px solid #eee;text-transform:capitalize;">${(p.payment_method || "").replace("_", " ")}</td>
                                                <td style="padding:4px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
                                            </tr>`
                                        ).join("");
                                        printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Receipt - ${inv.invoice_number}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #222; max-width: 600px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
  .clinic-name { font-size: 20px; font-weight: 700; margin: 0; }
  .clinic-info { font-size: 11px; color: #666; margin-top: 4px; }
  .title { text-align: center; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .totals { margin-top: 12px; border-top: 2px solid #000; padding-top: 8px; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .total-row.grand { font-size: 16px; font-weight: 700; border-top: 1px solid #000; padding-top: 6px; margin-top: 4px; }
  .status-badge { text-align: center; font-size: 13px; font-weight: 700; padding: 6px; margin: 12px 0; border: 2px solid; border-radius: 4px; }
  .status-paid { color: #16a34a; border-color: #16a34a; background: #f0fdf4; }
  .status-unpaid { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { padding: 15px; } }
</style></head><body>
<div class="header">
  <p class="clinic-name">${clinicName}</p>
  <p class="clinic-info">${clinicAddress ? clinicAddress + " · " : ""}${clinicPhone}</p>
</div>
<div class="title">Tax Invoice / Receipt</div>
<table style="margin-bottom:12px;">
  <tr><td style="padding:2px 0;font-size:12px;"><strong>Invoice #:</strong></td><td style="padding:2px 0;text-align:right;font-size:12px;">${inv.invoice_number}</td></tr>
  <tr><td style="padding:2px 0;font-size:12px;"><strong>Date:</strong></td><td style="padding:2px 0;text-align:right;font-size:12px;">${new Date(inv.created_at).toLocaleDateString()}</td></tr>
  <tr><td style="padding:2px 0;font-size:12px;"><strong>Patient:</strong></td><td style="padding:2px 0;text-align:right;font-size:12px;">${escapeHtml(inv.patients?.full_name) || "N/A"}</td></tr>
</table>
<table>
  <thead><tr style="border-bottom:2px solid #000;">
    <th style="padding:6px 0;text-align:left;font-size:11px;text-transform:uppercase;">Item</th>
    <th style="padding:6px 0;text-align:center;font-size:11px;text-transform:uppercase;">Qty</th>
    <th style="padding:6px 0;text-align:right;font-size:11px;text-transform:uppercase;">Price</th>
    <th style="padding:6px 0;text-align:right;font-size:11px;text-transform:uppercase;">Total</th>
  </tr></thead>
  <tbody>${lineItemsHtml || '<tr><td colspan="4" style="padding:8px 0;text-align:center;color:#999;">No line items</td></tr>'}</tbody>
</table>
<div class="totals">
  <div class="total-row"><span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span></div>
  ${(inv.tax || 0) > 0 ? `<div class="total-row"><span>Tax</span><span>${formatCurrency(inv.tax)}</span></div>` : ""}
  <div class="total-row grand"><span>TOTAL</span><span>${formatCurrency(inv.total)}</span></div>
</div>
${paymentsHtml ? `
<p style="font-size:12px;font-weight:600;margin-top:16px;margin-bottom:4px;">Payments</p>
<table><thead><tr style="border-bottom:1px solid #000;">
  <th style="padding:4px 0;text-align:left;font-size:10px;">Date</th>
  <th style="padding:4px 0;text-align:left;font-size:10px;">Method</th>
  <th style="padding:4px 0;text-align:right;font-size:10px;">Amount</th>
</tr></thead><tbody>${paymentsHtml}</tbody></table>
<div class="totals">
  <div class="total-row"><span>Total Paid</span><span style="color:#16a34a;">${formatCurrency(paid)}</span></div>
  ${balance > 0 ? `<div class="total-row"><span>Balance Due</span><span style="color:#dc2626;font-weight:700;">${formatCurrency(balance)}</span></div>` : ""}
</div>` : ""}
<div class="status-badge ${inv.status === 'paid' || inv.status === 'partially_paid' ? 'status-paid' : 'status-unpaid'}">${payStatus}</div>
<div class="footer">Generated by ClinicOS · ${new Date().toLocaleString()}</div>
</body></html>`);
                                        printWindow.document.close();
                                        setTimeout(() => printWindow.print(), 500);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
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
                                    <div className="text-xs space-y-0.5">
                                        <p className="font-medium">Insurance: {patientInsurance?.provider}</p>
                                        <p className="text-muted-foreground">Policy: {patientInsurance?.policy_number}</p>
                                        <p className="text-muted-foreground">Coverage: {patientInsurance?.coverage_type}</p>
                                        {patientInsurance?.valid_until && <p className="text-muted-foreground">Valid until: {new Date(patientInsurance.valid_until).toLocaleDateString()}</p>}
                                    </div>
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
