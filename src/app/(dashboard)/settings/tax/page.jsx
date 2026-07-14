"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, FileText, Receipt, Calculator, Wifi, WifiOff, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getTaxService, TAX_CLASSES } from "@/features/tax/services/tax.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const RRA_STATUS_STYLES = {
  validated: "text-emerald-600 bg-emerald-50",
  pending: "text-amber-600 bg-amber-50",
  failed: "text-red-600 bg-red-50",
  submitted: "text-blue-600 bg-blue-50",
};

const FORMAT_CURRENCY = (amount) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount || 0);

const TABS = [
  { id: "rra", label: "RRA/EBM Settings", icon: Receipt },
  { id: "receipts", label: "Fiscal Receipts", icon: FileText },
  { id: "report", label: "Tax Report", icon: Calculator },
];

export default function TaxSettingsPage() {
  const { clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getTaxService(), []);

  const [activeTab, setActiveTab] = useState("rra");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ tin_number: "", business_name: "", ebm_serial_number: "", tax_rate: "18", default_tax_class: "D" });
  const [ebmConnected, setEbmConnected] = useState(false);

  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptStatusFilter, setReceiptStatusFilter] = useState("");

  const [taxReport, setTaxReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const loadSettings = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const data = await service.getTaxSettings(clinicId);
      setSettings(data);
      if (data) {
        setForm({
          tin_number: data.tin_number || "",
          business_name: data.business_name || "",
          ebm_serial_number: data.ebm_serial_number || "",
          tax_rate: data.tax_rate?.toString() || "18",
          default_tax_class: data.default_tax_class || "D",
        });
        setEbmConnected(!!data.ebm_serial_number);
      }
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load tax settings"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, service]);

  const loadReceipts = useCallback(async () => {
    if (!clinicId) return;
    setReceiptsLoading(true);
    try {
      const data = await service.getFiscalReceipts(clinicId, receiptStatusFilter ? { rra_status: receiptStatusFilter } : {});
      setReceipts(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load fiscal receipts"));
    } finally {
      setReceiptsLoading(false);
    }
  }, [clinicId, service, receiptStatusFilter]);

  const loadTaxReport = useCallback(async () => {
    if (!clinicId || !reportMonth) return;
    setReportLoading(true);
    try {
      const [year, month] = reportMonth.split("-").map(Number);
      const dateFrom = `${reportMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dateTo = `${reportMonth}-${String(lastDay).padStart(2, "0")}`;
      const data = await service.getTaxReport(clinicId, dateFrom, dateTo);
      setTaxReport(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load tax report"));
    } finally {
      setReportLoading(false);
    }
  }, [clinicId, service, reportMonth]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (activeTab === "receipts") loadReceipts(); }, [activeTab, loadReceipts]);
  useEffect(() => { if (activeTab === "report") loadTaxReport(); }, [activeTab, loadTaxReport]);

  const handleSaveSettings = useCallback(async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      await service.upsertTaxSettings(clinicId, {
        tin_number: form.tin_number || null,
        business_name: form.business_name || null,
        ebm_serial_number: form.ebm_serial_number || null,
        tax_rate: parseFloat(form.tax_rate) || 18,
        default_tax_class: form.default_tax_class || "D",
      });
      setEbmConnected(!!form.ebm_serial_number);
      toast.success("Tax settings saved");
      loadSettings();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save tax settings"));
    } finally {
      setSaving(false);
    }
  }, [clinicId, form, service, loadSettings]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Tax & EBM Settings" description="Configure RRA/EBM integration and tax management" />

      <div className="flex items-center gap-1 rounded-xl border bg-white p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "rra" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">RRA/EBM Configuration</h3>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                ebmConnected ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-gray-50"
              }`}>
                {ebmConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                {ebmConnected ? "EBM Connected" : "EBM Not Configured"}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">TIN Number</label>
                <input value={form.tin_number} onChange={e => setForm(prev => ({ ...prev, tin_number: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="123456789" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Business Name</label>
                <input value={form.business_name} onChange={e => setForm(prev => ({ ...prev, business_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Clinic Name" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">EBM Serial Number</label>
                <input value={form.ebm_serial_number} onChange={e => setForm(prev => ({ ...prev, ebm_serial_number: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="EBM-XXXXXX" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Default Tax Rate (%)</label>
                <input type="number" min="0" max="100" value={form.tax_rate} onChange={e => setForm(prev => ({ ...prev, tax_rate: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Default Tax Class</label>
                <select value={form.default_tax_class} onChange={e => setForm(prev => ({ ...prev, default_tax_class: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                  {Object.entries(TAX_CLASSES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button onClick={handleSaveSettings} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Settings
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm font-semibold mb-3">Tax Classes</h3>
            <div className="space-y-2">
              {Object.entries(TAX_CLASSES).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <span className="text-sm font-semibold">{val.label}</span>
                  </div>
                  <span className={`text-xs font-bold ${val.rate > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {val.rate}% tax
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "receipts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={receiptStatusFilter} onChange={e => setReceiptStatusFilter(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Status</option>
              <option value="validated">Validated</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          {receiptsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Receipt className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No fiscal receipts found</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Fiscal #</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Invoice</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Patient</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase text-right">Amount</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase text-right">Tax</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">RRA Status</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {receipts.map(receipt => (
                      <tr key={receipt.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-xs font-semibold">{receipt.fiscal_number}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{receipt.billing_invoices?.invoice_number || "—"}</td>
                        <td className="px-4 py-3 text-xs">{receipt.billing_invoices?.patients?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-xs font-medium text-right">{FORMAT_CURRENCY(receipt.rra_response?.total || receipt.total_amount)}</td>
                        <td className="px-4 py-3 text-xs text-right">{FORMAT_CURRENCY(receipt.rra_response?.total_tax || receipt.tax_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${RRA_STATUS_STYLES[receipt.rra_status] || "text-gray-600 bg-gray-50"}`}>
                            {receipt.rra_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">
                          {receipt.created_at ? new Date(receipt.created_at).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "report" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={loadTaxReport} disabled={reportLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
              {reportLoading ? <Loader2 className="size-3 animate-spin" /> : <Calculator className="size-3" />}
              Refresh
            </button>
          </div>

          {reportLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : taxReport ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-6">
                <h3 className="text-sm font-semibold mb-3">Tax Summary — {reportMonth}</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-primary/5 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Total Tax Collected</p>
                    <p className="text-xl font-bold text-primary">{FORMAT_CURRENCY(taxReport.total_tax_collected)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Receipts Count</p>
                    <p className="text-xl font-bold">{taxReport.receipt_count}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Tax Classes</p>
                    <p className="text-xl font-bold">{taxReport.by_class?.length || 0}</p>
                  </div>
                </div>
              </div>

              {taxReport.by_class?.length > 0 && (
                <div className="rounded-xl border bg-white p-6">
                  <h3 className="text-sm font-semibold mb-3">Breakdown by Tax Class</h3>
                  <div className="space-y-2">
                    {taxReport.by_class.map(cls => (
                      <div key={cls.tax_class} className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">{cls.label}</p>
                          <p className="text-[10px] text-muted-foreground">{cls.item_count} items · Taxable: {FORMAT_CURRENCY(cls.taxable_amount)}</p>
                        </div>
                        <span className="text-sm font-bold">{FORMAT_CURRENCY(cls.tax_collected)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Calculator className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a month to view tax report</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
