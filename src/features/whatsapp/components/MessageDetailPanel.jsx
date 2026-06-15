"use client";
import { WhatsAppStatusBadge } from "./WhatsAppStatusBadge";
import { MESSAGE_TYPE_LABELS } from "../types";
export function MessageDetailPanel({ message }) {
    const statusHistory = [
        { label: "Queued", time: message.created_at, active: true },
        { label: "Sent", time: message.sent_at, active: !!message.sent_at },
        { label: "Delivered", time: message.delivered_at, active: !!message.delivered_at },
        { label: "Read", time: message.read_at, active: !!message.read_at },
    ];
    return (<div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Message Details</h2>
        <WhatsAppStatusBadge status={message.status}/>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Patient</label>
          <p className="text-sm text-gray-900 dark:text-white">{message.patient_name || "N/A"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
          <p className="text-sm text-gray-900 dark:text-white">{message.phone_number}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
          <p className="text-sm text-gray-900 dark:text-white">{MESSAGE_TYPE_LABELS[message.message_type]}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Template</label>
          <p className="text-sm text-gray-900 dark:text-white">{message.message_template}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Provider</label>
          <p className="text-sm text-gray-900 dark:text-white">{message.provider}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Provider Message ID</label>
          <p className="text-sm text-gray-900 dark:text-white">{message.provider_message_id || "—"}</p>
        </div>
        {message.error_message && (<div className="col-span-2">
            <label className="text-xs font-medium text-red-500">Error</label>
            <p className="text-sm text-red-600 dark:text-red-400">{message.error_message}</p>
          </div>)}
      </div>

      {/* Message Content */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Message Content</label>
        <div className="mt-1 rounded-lg bg-gray-50 p-4 text-sm text-gray-900 dark:bg-gray-800 dark:text-white">
          {message.message_content}
        </div>
      </div>

      {/* Status Timeline */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Timeline</label>
        <div className="mt-2 space-y-3">
          {statusHistory.map((item) => (<div key={item.label} className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${item.active ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}/>
              <div>
                <p className={`text-sm ${item.active ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                  {item.label}
                </p>
                {item.time && (<p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.time).toLocaleString()}
                  </p>)}
              </div>
            </div>))}
          {message.status === "failed" && (<div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500"/>
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                {message.failed_at && (<p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(message.failed_at).toLocaleString()}
                  </p>)}
              </div>
            </div>)}
        </div>
      </div>
    </div>);
}
