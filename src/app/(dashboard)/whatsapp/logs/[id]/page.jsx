"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { MessageDetailPanel } from "@/features/whatsapp/components/MessageDetailPanel";
import { getWhatsAppService } from "@/features/whatsapp/services/whatsapp.service";
import { useAuth } from "@/features/auth/hooks/use-auth";
export default function MessageDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const whatsapp = getWhatsAppService();
    const clinicId = user?.clinicId;
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const loadMessage = useCallback(async () => {
        if (!clinicId || !id)
            return;
        try {
            const data = await whatsapp.getMessageLog(clinicId, id);
            if (data) {
                setMessage(data);
            }
            else {
                setError("Message not found");
            }
        }
        catch {
            setError("Failed to load message");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, id]);
    useEffect(() => {
        loadMessage();
    }, [loadMessage]);
    if (!clinicId)
        return null;
    return (<div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/whatsapp/logs" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
          &larr; Back to Logs
        </Link>
      </div>

      <PageHeader title="Message Details" description="Full message details and status history"/>

      {loading && <LoadingState title="Loading message..."/>}

      {error && (<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>)}

      {message && (<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <MessageDetailPanel message={message}/>
        </div>)}
    </div>);
}
