"use client";
import { Link } from "react-router-dom";
import { WhatsAppStatusBadge } from "./WhatsAppStatusBadge";
import { MESSAGE_TYPE_LABELS } from "../types";
export function MessageLogTable({ logs, total, page, pageSize, onPageChange, loading }) {
    const totalPages = Math.ceil(total / pageSize);
    if (loading) {
        return (<div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"/>))}
      </div>);
    }
    if (logs.length === 0) {
        return (<div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        No messages found
      </div>);
    }
    return (<div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Patient</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Appointment</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Sent</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (<tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">{log.patient_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {MESSAGE_TYPE_LABELS[log.message_type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <WhatsAppStatusBadge status={log.status}/>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {log.appointment_date ? new Date(log.appointment_date + "T00:00:00").toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/whatsapp/logs/${log.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View
                  </Link>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page + 1} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 0} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600">
              Previous
            </button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600">
              Next
            </button>
          </div>
        </div>)}
    </div>);
}
