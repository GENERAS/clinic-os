"use client";
import { Download, FileText } from "lucide-react";

export function BillingHistoryTable({ invoices, onDownload }) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        <FileText className="mx-auto mb-2 size-8 text-slate-300" />
        No billing history yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{inv.invoice_number}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {new Date(inv.issued_at).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali" })}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                {Number(inv.amount).toLocaleString("en-RW")} RWF
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  inv.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                  inv.status === "pending" ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-700"
                }`}>
                  {inv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {inv.payment_id ? "Verified" : "—"}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDownload(inv)}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Download className="size-3" /> Receipt
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
