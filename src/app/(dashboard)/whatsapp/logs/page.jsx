"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { MessageLogTable } from "@/features/whatsapp/components/MessageLogTable";
import { getWhatsAppService } from "@/features/whatsapp/services/whatsapp.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
export default function WhatsAppLogsPage() {
    const { user } = useAuth();
    const whatsapp = getWhatsAppService();
    const clinicId = user?.clinicId;
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(true);
    const loadLogs = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const result = await whatsapp.getMessageLogs(clinicId, {
                page,
                pageSize: 20,
                status: statusFilter || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            });
            setLogs(result.data);
            setTotal(result.total);
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, page, statusFilter, dateFrom, dateTo]);
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);
    if (!clinicId)
        return null;
    return (<div className="space-y-6">
        <PageHeader title="Message Logs" description="View all WhatsApp messages sent to patients"/>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"/>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <MessageLogTable logs={logs} total={total} page={page} pageSize={20} onPageChange={setPage} loading={loading}/>
        </div>
      </div>);
}
