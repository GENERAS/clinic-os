"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Edit, Search, DollarSign, TrendingDown, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getExpenseService, EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from "@/features/accounting/services/expense.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const CATEGORY_COLORS = {
  rent: "bg-indigo-50 text-indigo-700",
  utilities: "bg-yellow-50 text-yellow-700",
  internet: "bg-cyan-50 text-cyan-700",
  supplies: "bg-green-50 text-green-700",
  salaries: "bg-purple-50 text-purple-700",
  maintenance: "bg-orange-50 text-orange-700",
  insurance: "bg-blue-50 text-blue-700",
  taxes: "bg-red-50 text-red-700",
  marketing: "bg-pink-50 text-pink-700",
  transport: "bg-teal-50 text-teal-700",
  other: "bg-gray-50 text-gray-700",
};

const FORMAT_CURRENCY = (amount) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount || 0);

const EMPTY_FORM = { category: "", description: "", amount: "", expense_date: "", payment_method: "cash", reference: "", notes: "" };

export default function ExpensesPage() {
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getExpenseService(), []);

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = now.toISOString().split("T")[0];

      const [expensesData, summaryData] = await Promise.all([
        service.getExpenses(clinicId, { category: categoryFilter || undefined, search: searchFilter || undefined }),
        service.getExpenseSummary(clinicId, monthStart, monthEnd),
      ]);
      setExpenses(expensesData);
      setSummary(summaryData);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load expenses"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, service, categoryFilter, searchFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async () => {
    if (!clinicId || !form.category || !form.description || !form.amount) {
      toast.error("Category, description, and amount are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date || new Date().toISOString().split("T")[0],
        payment_method: form.payment_method,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (editing) {
        await service.updateExpense(clinicId, editing.id, payload);
        toast.success("Expense updated");
      } else {
        await service.createExpense(clinicId, payload, user?.id);
        toast.success("Expense added");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save expense"));
    } finally {
      setSaving(false);
    }
  }, [clinicId, form, editing, service, user, load]);

  const handleDelete = useCallback(async (expenseId) => {
    if (!clinicId || !confirm("Delete this expense?")) return;
    try {
      await service.deleteExpense(clinicId, expenseId);
      toast.success("Expense deleted");
      load();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to delete expense"));
    }
  }, [clinicId, service, load]);

  const handleEdit = useCallback((expense) => {
    setEditing(expense);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount?.toString() || "",
      expense_date: expense.expense_date || "",
      payment_method: expense.payment_method || "cash",
      reference: expense.reference || "",
      notes: expense.notes || "",
    });
    setShowForm(true);
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Expenses" description="Track and manage clinic expenses">
        <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
          <Loader2 className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MetricCard label="This Month" value={FORMAT_CURRENCY(summary.total)} icon={<DollarSign className="size-[18px] text-red-500" />} />
              <MetricCard label="Categories" value={Object.keys(summary.byCategory).length} icon={<TrendingDown className="size-[18px] text-amber-500" />} />
              <MetricCard label="Transactions" value={summary.count} icon={<Filter className="size-[18px] text-blue-500" />} />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search expenses..."
                    className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <button onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY_FORM }); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="size-3.5" /> Add Expense
              </button>
            </div>

            {showForm && (
              <SectionCard title={editing ? "Edit Expense" : "New Expense"}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Category *</label>
                    <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select category</option>
                      {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Description *</label>
                    <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. January rent payment" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Amount (RWF) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Date</label>
                    <input type="date" value={form.expense_date} onChange={e => setForm(prev => ({ ...prev, expense_date: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Payment Method</label>
                    <select value={form.payment_method} onChange={e => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                      {EXPENSE_PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Reference</label>
                    <input value={form.reference} onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="Invoice #, receipt ref..." />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Notes</label>
                  <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" placeholder="Optional notes" />
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <button onClick={handleSave} disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving && <Loader2 className="size-3 animate-spin" />}
                    {editing ? "Update" : "Add Expense"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditing(null); }}
                    className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    Cancel
                  </button>
                </div>
              </SectionCard>
            )}

            {expenses.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
                <DollarSign className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No expenses recorded</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-white overflow-hidden">
                <div className="divide-y">
                  {expenses.map(expense => (
                    <div key={expense.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[expense.category] || "bg-gray-50 text-gray-700"}`}>
                          {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{expense.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(expense.expense_date).toLocaleDateString()} · {expense.payment_method?.replace("_", " ")}
                            {expense.reference ? ` · ${expense.reference}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-red-600">-{FORMAT_CURRENCY(expense.amount)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(expense)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                            <Edit className="size-3.5" />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary && Object.keys(summary.byCategory).length > 0 && (
              <SectionCard title="Spending by Category (This Month)">
                <div className="space-y-2">
                  {Object.entries(summary.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => {
                      const pct = summary.total > 0 ? Math.round((amount / summary.total) * 100) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}</span>
                            <span className="text-xs font-semibold">{FORMAT_CURRENCY(amount)} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </SectionCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
