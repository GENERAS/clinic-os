"use client";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPaymentService } from "@/features/subscription/services/payment.service";
import { getInvoiceService } from "@/features/subscription/services/invoice.service";
import { Check, X, Loader2, Search, Eye, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function SuperAdminPayments() {
  const { user } = useAuth();
  const paymentService = getPaymentService();
  const invoiceService = getInvoiceService();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewPayment, setViewPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  async function loadPayments() {
    setLoading(true);
    try {
      const result = await paymentService.getPendingPayments();
      setPayments(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPayments(); }, []);

  const handleApprove = async (payment) => {
    if (!user) return;
    setActionLoading(payment.id);
    try {
      await paymentService.verifyPayment(payment.id, user.id);
      toast.success("Payment approved — subscription activated");
      loadPayments();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to approve payment"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payment) => {
    if (!user) return;
    setActionLoading(payment.id);
    try {
      await paymentService.rejectPayment(payment.id, user.id, rejectReason);
      toast.success("Payment rejected");
      setShowReject(null);
      setRejectReason("");
      loadPayments();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to reject payment"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadReceipt = async (payment) => {
    const { data: invoices } = await (await import("@/lib/supabase/client")).createClient()
      .from("invoices")
      .select("*, clinics!inner(name)")
      .eq("payment_id", payment.id)
      .maybeSingle();
    if (invoices) {
      invoiceService.downloadReceipt(invoices);
      toast.success("Receipt downloaded");
    } else {
      toast.error("No invoice found for this payment");
    }
  };

  const filtered = search
    ? payments.filter((p) =>
        (p.clinics?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.transaction_reference || "").toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Verification" description={`${total} pending payment${total !== 1 ? "s" : ""} to verify`}>
        <button onClick={loadPayments} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </PageHeader>

      {total === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Check className="mx-auto mb-3 size-8 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900">All caught up</h3>
          <p className="mt-1 text-xs text-slate-500">No pending payment verifications.</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by clinic or reference..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Payment Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.clinics?.name || "—"}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {Number(p.amount).toLocaleString("en-RW")} RWF
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {p.payment_method?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">{p.transaction_reference || "—"}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-xs font-medium text-slate-900">{p.payer_name || "—"}</p>
                        {p.payer_phone && <p className="text-[11px] text-slate-400">{p.payer_phone}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(p.submitted_at).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali" })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(p)}
                          disabled={actionLoading === p.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionLoading === p.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowReject(showReject?.id === p.id ? null : p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                        >
                          <X className="size-3" /> Reject
                        </button>
                        <button onClick={() => setViewPayment(viewPayment?.id === p.id ? null : p)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-slate-50">
                          <Eye className="size-3.5" />
                        </button>
                      </div>

                      {showReject?.id === p.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                          />
                          <button
                            onClick={() => handleReject(p)}
                            disabled={actionLoading === p.id}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Detail Panel */}
          {viewPayment && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Payment Details</h3>
                <button onClick={() => setViewPayment(null)} className="text-xs text-teal-600 hover:text-teal-500">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-slate-500">Clinic:</span> <span className="font-medium text-slate-900">{viewPayment.clinics?.name}</span></div>
                <div><span className="text-xs text-slate-500">Amount:</span> <span className="font-medium text-slate-900">{Number(viewPayment.amount).toLocaleString("en-RW")} RWF</span></div>
                <div><span className="text-xs text-slate-500">Method:</span> <span className="font-medium text-slate-900">{viewPayment.payment_method}</span></div>
                <div><span className="text-xs text-slate-500">Reference:</span> <span className="font-medium text-slate-900 font-mono">{viewPayment.transaction_reference}</span></div>
                <div><span className="text-xs text-slate-500">Payer:</span> <span className="font-medium text-slate-900">{viewPayment.payer_name || "—"}</span></div>
                <div><span className="text-xs text-slate-500">Phone:</span> <span className="font-medium text-slate-900">{viewPayment.payer_phone || "—"}</span></div>
                <div><span className="text-xs text-slate-500">Submitted:</span> <span className="font-medium text-slate-900">{new Date(viewPayment.submitted_at).toLocaleString("en-RW", { timeZone: "Africa/Kigali" })}</span></div>
              </div>
              {viewPayment.notes && (
                <div className="mt-3">
                  <span className="text-xs text-slate-500">Notes:</span>
                  <p className="text-sm text-slate-900 mt-0.5">{viewPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
