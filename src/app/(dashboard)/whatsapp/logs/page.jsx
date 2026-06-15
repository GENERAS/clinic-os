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

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"/>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"/>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <MessageLogTable logs={logs} total={total} page={page} pageSize={20} onPageChange={setPage} loading={loading}/>
        </div>
      </div>);
}
