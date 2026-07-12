"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, CreditCard, CheckCircle2, Printer, User, FileText, ChevronDown, ChevronUp, RefreshCw, Banknote, Smartphone, Building2, CreditCardIcon, Shield, XCircle, Clock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getBillingService } from "@/features/billing/services/billing.service";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const PAYMENT_METHODS = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "mtn_momo", label: "MTN MoMo", icon: Smartphone },
    { value: "airtel_money", label: "Airtel Money", icon: Smartphone },
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "card", label: "Card", icon: CreditCardIcon },
    { value: "insurance", label: "Insurance", icon: Shield },
];

const METHOD_ICONS = {
    cash: Banknote,
    mtn_momo: Smartphone,
    airtel_money: Smartphone,
    bank_transfer: Building2,
    card: CreditCardIcon,
    insurance: Shield,
};

const INVOICE_STATUS_STYLES = {
    issued: "text-blue-600 bg-blue-50",
    paid: "text-emerald-600 bg-emerald-50",
    partially_paid: "text-amber-600 bg-amber-50",
    cancelled: "text-red-600 bg-red-50",
    draft: "text-gray-600 bg-gray-50",
};

export default function CashierPage() {
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getBillingService(), []);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchType, setSearchType] = useState("patient");

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [expandedLineItems, setExpandedLineItems] = useState({});

    const [paymentForm, setPaymentForm] = useState({
        invoice_id: null,
        amount: "",
        payment_method: "cash",
        transaction_reference: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    const [receipt, setReceipt] = useState(null);

    const [dailySummary, setDailySummary] = useState(null);
    const [loadingDaily, setLoadingDaily] = useState(true);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);
    };

    const loadDailySummary = useCallback(async () => {
        if (!clinicId) return;
        setLoadingDaily(true);
        try {
            const data = await service.getDailyPayments(clinicId);
            setDailySummary(data);
        } catch (err) {
            console.error("Failed to load daily summary", err);
        } finally {
            setLoadingDaily(false);
        }
    }, [clinicId, service]);

    useEffect(() => { loadDailySummary(); }, [loadDailySummary]);

    const handleSearch = useCallback(async () => {
        if (!clinicId || searchQuery.trim().length < 2) return;
        setSearching(true);
        try {
            let results;
            if (searchType === "invoice") {
                results = await service.searchPatientsByInvoice(clinicId, searchQuery);
            } else {
                results = await service.searchPatientsWithOutstanding(clinicId, searchQuery);
            }
            setSearchResults(results);
            if (results.length === 0) {
                toast.info("No patients with outstanding invoices found");
            }
        } catch (err) {
            toast.error(handleApiError(err, "Search failed"));
        } finally {
            setSearching(false);
        }
    }, [clinicId, searchQuery, searchType, service]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter") handleSearch();
    }, [handleSearch]);

    const selectPatient = useCallback((patient) => {
        setSelectedPatient(patient);
        setSearchResults([]);
        setSearchQuery("");
        setPaymentForm({ invoice_id: null, amount: "", payment_method: "cash", transaction_reference: "", notes: "" });
        setReceipt(null);
    }, []);

    const handleSelectInvoice = useCallback((invoice) => {
        setPaymentForm(prev => ({
            ...prev,
            invoice_id: invoice.id,
            amount: invoice.outstanding.toString(),
        }));
    }, []);

    const handleRecordPayment = useCallback(async () => {
        if (!paymentForm.invoice_id) {
            toast.error("Select an invoice to pay");
            return;
        }
        const amount = parseFloat(paymentForm.amount);
        if (!amount || amount <= 0) {
            toast.error("Enter a valid payment amount");
            return;
        }

        const selectedInvoice = selectedPatient?.invoices?.find(i => i.id === paymentForm.invoice_id);
        if (selectedInvoice && amount > selectedInvoice.outstanding + 0.01) {
            toast.error(`Amount exceeds outstanding balance of ${formatCurrency(selectedInvoice.outstanding)}`);
            return;
        }

        if (["mtn_momo", "airtel_money", "bank_transfer"].includes(paymentForm.payment_method) && !paymentForm.transaction_reference.trim()) {
            toast.error("Transaction reference is required for mobile money and bank transfers");
            return;
        }

        setSaving(true);
        try {
            await service.recordPayment(clinicId, {
                invoice_id: paymentForm.invoice_id,
                patient_id: selectedPatient.id,
                amount,
                payment_method: paymentForm.payment_method,
                transaction_reference: paymentForm.transaction_reference || null,
                notes: paymentForm.notes || null,
            }, user?.id);

            toast.success("Payment recorded successfully");

            setReceipt({
                invoice_number: selectedInvoice?.invoice_number || "—",
                patient_name: selectedPatient.full_name,
                amount,
                payment_method: paymentForm.payment_method,
                date: new Date().toLocaleString(),
                received_by: user?.full_name || user?.email || "—",
                transaction_reference: paymentForm.transaction_reference || null,
                notes: paymentForm.notes || null,
                clinic_name: authClinic?.name || "ClinicOS",
            });

            loadDailySummary();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to record payment"));
        } finally {
            setSaving(false);
        }
    }, [clinicId, user, service, paymentForm, selectedPatient, authClinic, loadDailySummary]);

    const handleNewPayment = useCallback(() => {
        setReceipt(null);
        setPaymentForm({ invoice_id: null, amount: "", payment_method: "cash", transaction_reference: "", notes: "" });
        setSelectedPatient(null);
    }, []);

    const handlePrintReceipt = useCallback(() => {
        window.print();
    }, []);

    const toggleLineItems = useCallback((invoiceId) => {
        setExpandedLineItems(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
    }, []);

    const getInvoiceLineItems = useCallback(async (invoiceId) => {
        try {
            const { data } = await service.supabase
                .from("billing_line_items")
                .select("*")
                .eq("invoice_id", invoiceId);
            return data || [];
        } catch {
            return [];
        }
    }, [service]);

    const [lineItemsCache, setLineItemsCache] = useState({});

    const loadLineItems = useCallback(async (invoiceId) => {
        if (lineItemsCache[invoiceId]) return lineItemsCache[invoiceId];
        const items = await getInvoiceLineItems(invoiceId);
        setLineItemsCache(prev => ({ ...prev, [invoiceId]: items }));
        return items;
    }, [lineItemsCache, getInvoiceLineItems]);

    const selectedInvoice = selectedPatient?.invoices?.find(i => i.id === paymentForm.invoice_id);
    const isRefRequired = ["mtn_momo", "airtel_money", "bank_transfer"].includes(paymentForm.payment_method);

    return (
        <div className="space-y-5">
            <PageHeader title="Cashier" description="Search patients, record payments, and issue receipts">
                <button onClick={() => { loadDailySummary(); if (selectedPatient) handleSearch(); }} disabled={searching || loadingDaily}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    <RefreshCw className={`size-3.5 ${(searching || loadingDaily) ? "animate-spin" : ""}`} /> Refresh
                </button>
            </PageHeader>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-5">

                    {!receipt ? (
                        <>
                            <SectionCard title="Search Patient or Invoice">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 rounded-lg border p-0.5">
                                            {["patient", "invoice"].map((t) => (
                                                <button key={t} onClick={() => setSearchType(t)}
                                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${searchType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                                    {t === "patient" ? "By Name/Phone" : "By Invoice #"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={searchType === "patient" ? "Search by patient name or phone..." : "Search by invoice number..."}
                                                className="w-full rounded-lg border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                autoFocus
                                            />
                                        </div>
                                        <button onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                            {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                                            Search
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>

                            {searchResults.length > 0 && !selectedPatient && (
                                <SectionCard title={`Results (${searchResults.length})`}>
                                    <div className="space-y-1.5">
                                        {searchResults.map((patient) => (
                                            <button key={patient.id} onClick={() => selectPatient(patient)}
                                                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors text-left">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                                        <User className="size-3.5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold truncate">{patient.full_name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{patient.phone}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-semibold text-amber-600">{patient.outstanding_count} invoice{patient.outstanding_count !== 1 ? "s" : ""}</p>
                                                    <p className="text-[10px] font-medium">{formatCurrency(patient.outstanding_total)}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </SectionCard>
                            )}

                            {selectedPatient && (
                                <>
                                    <SectionCard title="Selected Patient" actions={
                                        <button onClick={() => { setSelectedPatient(null); setPaymentForm({ invoice_id: null, amount: "", payment_method: "cash", transaction_reference: "", notes: "" }); }}
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                            <XCircle className="size-3" /> Change
                                        </button>
                                    }>
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                                <User className="size-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{selectedPatient.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                                <p className="text-sm font-bold text-amber-600">{formatCurrency(selectedPatient.outstanding_total)}</p>
                                            </div>
                                        </div>
                                    </SectionCard>

                                    <SectionCard title={`Outstanding Invoices (${selectedPatient.invoices.length})`}>
                                        <div className="space-y-2">
                                            {selectedPatient.invoices.map((inv) => (
                                                <div key={inv.id} className={`rounded-xl border p-4 transition-colors ${paymentForm.invoice_id === inv.id ? "border-primary bg-primary/5" : "bg-white hover:bg-muted/20"}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleSelectInvoice(inv)}
                                                                className={`size-4 rounded-full border-2 flex items-center justify-center transition-colors ${paymentForm.invoice_id === inv.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                                                                {paymentForm.invoice_id === inv.id && <CheckCircle2 className="size-2.5 text-primary-foreground" />}
                                                            </button>
                                                            <div>
                                                                <p className="text-xs font-semibold">{inv.invoice_number}</p>
                                                                <p className="text-[10px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${INVOICE_STATUS_STYLES[inv.status]}`}>
                                                                {inv.status.replace("_", " ")}
                                                            </span>
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(inv.total)}</span></p>
                                                                {inv.paid > 0 && <p className="text-[10px] text-emerald-600">Paid: {formatCurrency(inv.paid)}</p>}
                                                                <p className="text-xs font-bold text-amber-600">Due: {formatCurrency(inv.outstanding)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <button onClick={() => toggleLineItems(inv.id)}
                                                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                                                            {expandedLineItems[inv.id] ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                                                            {expandedLineItems[inv.id] ? "Hide" : "Show"} items
                                                        </button>
                                                    </div>
                                                    {expandedLineItems[inv.id] && (
                                                        <ExpandedLineItems invoiceId={inv.id} loadLineItems={loadLineItems} formatCurrency={formatCurrency} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>

                                    {paymentForm.invoice_id && (
                                        <SectionCard title="Record Payment" icon={<CreditCard className="size-4 text-emerald-500" />}>
                                            <div className="space-y-3">
                                                <div className="rounded-lg bg-muted/30 px-3 py-2 flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Invoice</span>
                                                    <span className="text-xs font-semibold">{selectedInvoice?.invoice_number}</span>
                                                </div>
                                                <div className="rounded-lg bg-muted/30 px-3 py-2 flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Outstanding</span>
                                                    <span className="text-sm font-bold text-amber-600">{formatCurrency(selectedInvoice?.outstanding || 0)}</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (RWF)</label>
                                                        <input type="number" value={paymentForm.amount} min="0" step="100"
                                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
                                                        <select value={paymentForm.payment_method}
                                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value, transaction_reference: "" }))}
                                                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none">
                                                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {isRefRequired && (
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Transaction Reference *</label>
                                                        <input value={paymentForm.transaction_reference}
                                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                                                            placeholder="e.g. MTN ref number, bank ref..."
                                                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
                                                    <input value={paymentForm.notes}
                                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                                        placeholder="Payment notes..."
                                                        className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                                </div>

                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <button onClick={() => setPaymentForm({ invoice_id: null, amount: "", payment_method: "cash", transaction_reference: "", notes: "" })}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                                                        Cancel
                                                    </button>
                                                    <button onClick={handleRecordPayment} disabled={saving || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                                                        Record Payment
                                                    </button>
                                                </div>
                                            </div>
                                        </SectionCard>
                                    )}
                                </>
                            )}

                            {!selectedPatient && searchResults.length === 0 && !searching && (
                                <div className="flex flex-col items-center gap-2 py-12 text-center">
                                    <Search className="size-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">Search for a patient to begin collecting payment</p>
                                    <p className="text-[10px] text-muted-foreground/70">Search by name, phone, or invoice number</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <SectionCard title="Payment Receipt">
                            <div className="space-y-4 print:space-y-3" id="receipt-content">
                                <div className="text-center border-b pb-3">
                                    <h2 className="text-lg font-bold">{receipt.clinic_name}</h2>
                                    <p className="text-xs text-muted-foreground">Payment Receipt</p>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Date & Time</span>
                                        <span className="font-medium">{receipt.date}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Patient</span>
                                        <span className="font-medium">{receipt.patient_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Invoice</span>
                                        <span className="font-medium">{receipt.invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Method</span>
                                        <span className="font-medium capitalize">{receipt.payment_method.replace("_", " ")}</span>
                                    </div>
                                    {receipt.transaction_reference && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Reference</span>
                                            <span className="font-medium">{receipt.transaction_reference}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="font-semibold">Amount Paid</span>
                                        <span className="text-lg font-bold text-emerald-600">{formatCurrency(receipt.amount)}</span>
                                    </div>
                                    {receipt.notes && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Notes</span>
                                            <span className="font-medium">{receipt.notes}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Received by</span>
                                        <span className="font-medium">{receipt.received_by}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t print:hidden">
                                    <button onClick={handlePrintReceipt}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                                        <Printer className="size-3.5" /> Print Receipt
                                    </button>
                                    <button onClick={handleNewPayment}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                                        <CreditCard className="size-3.5" /> New Payment
                                    </button>
                                </div>
                            </div>
                        </SectionCard>
                    )}
                </div>

                <div className="space-y-4">
                    <SectionCard title="Today's Summary">
                        {loadingDaily ? (
                            <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                        ) : dailySummary ? (
                            <div className="space-y-3">
                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                                    <p className="text-[10px] font-medium uppercase text-emerald-600">Total Collected</p>
                                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(dailySummary.total_collected)}</p>
                                    <p className="text-[10px] text-emerald-600">{dailySummary.payment_count} payment{dailySummary.payment_count !== 1 ? "s" : ""}</p>
                                </div>

                                {Object.keys(dailySummary.method_breakdown).length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-medium uppercase text-muted-foreground">By Method</p>
                                        {Object.entries(dailySummary.method_breakdown)
                                            .sort(([, a], [, b]) => b.total - a.total)
                                            .map(([method, data]) => {
                                                const MethodIcon = METHOD_ICONS[method] || CreditCard;
                                                return (
                                                    <div key={method} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <MethodIcon className="size-3.5 text-muted-foreground" />
                                                            <span className="text-xs font-medium capitalize">{method.replace("_", " ")}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-semibold">{formatCurrency(data.total)}</p>
                                                            <p className="text-[10px] text-muted-foreground">{data.count}x</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}

                                {dailySummary.payments.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-medium uppercase text-muted-foreground">Recent Payments</p>
                                        <div className="space-y-1 max-h-64 overflow-y-auto">
                                            {dailySummary.payments.slice(0, 10).map((p) => (
                                                <div key={p.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-muted/30 transition-colors">
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-medium truncate">{p.patients?.full_name || "—"}</p>
                                                        <p className="text-[10px] text-muted-foreground">{p.billing_invoices?.invoice_number || "—"}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[11px] font-semibold">{formatCurrency(p.amount)}</p>
                                                        <p className="text-[10px] text-muted-foreground capitalize">{(p.payment_method || "").replace("_", " ")}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground py-4 text-center">No payments today</p>
                        )}
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}

function ExpandedLineItems({ invoiceId, loadLineItems, formatCurrency }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLineItems(invoiceId).then(setItems).finally(() => setLoading(false));
    }, [invoiceId, loadLineItems]);

    if (loading) return <div className="flex justify-center py-3"><Loader2 className="size-3.5 animate-spin text-muted-foreground" /></div>;
    if (items.length === 0) return <p className="text-[10px] text-muted-foreground py-2 text-center">No line items</p>;

    return (
        <div className="mt-2 rounded-lg bg-muted/20 p-2 space-y-1">
            {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.description} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
            ))}
        </div>
    );
}
