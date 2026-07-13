"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CreditCard, TrendingUp, ArrowUpRight, DollarSign, Receipt, CalendarRange, RefreshCw, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getBillingService } from "@/features/billing/services/billing.service";
import { getExpenseService } from "@/features/accounting/services/expense.service";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function FinancialsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const billingService = useMemo(() => getBillingService(), []);
    const expenseService = useMemo(() => getExpenseService(), []);
    const [summary, setSummary] = useState(null);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [expenseSummary, setExpenseSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("today");

    const getDateRange = useCallback((p) => {
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const now = new Date();
        const today = fmt(now);
        if (p === "today") return { from: today, to: today };
        if (p === "week") {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return { from: fmt(weekStart), to: today };
        }
        if (p === "month") {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from: fmt(monthStart), to: today };
        }
        return { from: today, to: today };
    }, []);

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const range = getDateRange(period);

            const [summaryData, invoicesData, expSummary] = await Promise.all([
                billingService.getFinancialSummary(clinicId, range.from, range.to + "T23:59:59"),
                billingService.getInvoices(clinicId, { dateFrom: range.from, dateTo: range.to + "T23:59:59" }),
                expenseService.getExpenseSummary(clinicId, range.from, range.to + "T23:59:59").catch(() => ({ total: 0, byCategory: {}, count: 0 })),
            ]);
            setSummary(summaryData);
            setRecentInvoices(invoicesData.slice(0, 20));
            setExpenseSummary(expSummary);
        } catch (err) { toast.error(handleApiError(err, "Failed to load financial data")); }
        finally { setLoading(false); }
    }, [clinicId, period, billingService, expenseService, getDateRange]);

    useEffect(() => { load(); }, [load]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);
    };

    const profit = summary && expenseSummary ? summary.total_collected - expenseSummary.total : null;

    return (
        <div className="space-y-5">
            <PageHeader title="Financials" description="Revenue, expenses, and profit overview">
                <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </PageHeader>

            <div className="flex items-center gap-1 rounded-lg border p-0.5 w-fit">
                {["today", "week", "month"].map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>
            ) : !summary ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <DollarSign className="size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No financial data for this period</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        <MetricCard label="Total Billed" value={formatCurrency(summary.total_billed)} icon={<Receipt className="size-[18px] text-blue-500"/>} />
                        <MetricCard label="Collected" value={formatCurrency(summary.total_collected)} icon={<CreditCard className="size-[18px] text-emerald-500"/>} />
                        <MetricCard label="Expenses" value={formatCurrency(expenseSummary?.total || 0)} icon={<TrendingDown className="size-[18px] text-red-500"/>} />
                        <MetricCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={<TrendingUp className="size-[18px] text-amber-500"/>} />
                        <MetricCard
                            label="Profit"
                            value={formatCurrency(profit || 0)}
                            icon={<DollarSign className={`size-[18px] ${profit !== null && profit >= 0 ? "text-emerald-500" : "text-red-500"}`}/>}
                        />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-4">
                            <SectionCard title={`Invoices (${recentInvoices.length})`}>
                                {recentInvoices.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">No invoices</p>
                                ) : (
                                    <div className="space-y-1">
                                        {recentInvoices.map((inv) => (
                                            <div key={inv.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className="text-xs font-medium truncate">{inv.patients?.full_name || "Unknown"}</p>
                                                    <p className="text-[10px] text-muted-foreground">{inv.invoice_number}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        inv.status === "paid" ? "text-emerald-600 bg-emerald-50" :
                                                        inv.status === "issued" ? "text-blue-600 bg-blue-50" :
                                                        inv.status === "partially_paid" ? "text-amber-600 bg-amber-50" :
                                                        "text-gray-600 bg-gray-50"
                                                    }`}>{inv.status.replace("_", " ")}</span>
                                                    <span className="text-xs font-semibold">{formatCurrency(inv.total)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </div>

                        <div className="space-y-4">
                            <SectionCard title="Payment Methods">
                                {Object.keys(summary.method_breakdown).length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 text-center">No payments</p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(summary.method_breakdown)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([method, amount]) => (
                                                <div key={method} className="flex items-center justify-between">
                                                    <span className="text-xs font-medium capitalize">{method.replace("_", " ")}</span>
                                                    <span className="text-xs font-semibold">{formatCurrency(amount)}</span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </SectionCard>

                            {expenseSummary && Object.keys(expenseSummary.byCategory).length > 0 && (
                                <SectionCard title="Expense Breakdown">
                                    <div className="space-y-2">
                                        {Object.entries(expenseSummary.byCategory)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([category, amount]) => (
                                                <div key={category} className="flex items-center justify-between">
                                                    <span className="text-xs font-medium capitalize">{category.replace("_", " ")}</span>
                                                    <span className="text-xs font-semibold text-red-600">{formatCurrency(amount)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </SectionCard>
                            )}

                            <SectionCard title="Quick Actions">
                                <div className="space-y-1.5">
                                    <Link to="/expenses" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors">
                                        <TrendingDown className="size-3.5" /> Manage Expenses
                                    </Link>
                                    <Link to="/reports" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors">
                                        <CreditCard className="size-3.5" /> View Reports
                                    </Link>
                                    <Link to="/triage" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors">
                                        <TrendingUp className="size-3.5" /> Today's Queue
                                    </Link>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
