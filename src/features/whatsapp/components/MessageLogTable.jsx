"use client";
import { Link } from "react-router-dom";
import { WhatsAppStatusBadge } from "./WhatsAppStatusBadge";
import { MESSAGE_TYPE_LABELS } from "../types";
export function MessageLogTable({ logs, total, page, pageSize, onPageChange, loading }) {
    const totalPages = Math.ceil(total / pageSize);
    if (loading) {
        return (<div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100"/>))}
      </div>);
    }
    if (logs.length === 0) {
        return (<div className="py-12 text-center text-sm text-slate-500">
        No messages found
      </div>);
    }
    return (<div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 font-medium text-slate-500">Patient</th>
              <th className="px-4 py-3 font-medium text-slate-500">Type</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500">Appointment</th>
              <th className="px-4 py-3 font-medium text-slate-500">Sent</th>
              <th className="px-4 py-3 font-medium text-slate-500"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (<tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900">{log.patient_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">
                    {MESSAGE_TYPE_LABELS[log.message_type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <WhatsAppStatusBadge status={log.status}/>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {log.appointment_date ? new Date(log.appointment_date + "T00:00:00").toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/whatsapp/logs/${log.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-500">
                    View
                  </Link>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Previous
            </button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Next
            </button>
          </div>
        </div>)}
    </div>);
}
