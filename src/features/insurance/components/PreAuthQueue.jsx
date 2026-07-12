"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const STATUS_STYLES = {
  pending: "text-amber-600 bg-amber-50",
  approved: "text-emerald-600 bg-emerald-50",
  rejected: "text-red-600 bg-red-50",
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const FORMAT_CURRENCY = (amount) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);

export function PreAuthQueue({ service, clinicId, userId }) {
  const [preAuths, setPreAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [notesModal, setNotesModal] = useState(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!clinicId || !service) return;
    setLoading(true);
    try {
      const data = await service.getPreAuthorizations(clinicId, statusFilter || null);
      setPreAuths(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load pre-authorizations"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, service, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = useCallback(async (authId) => {
    setProcessingId(authId);
    try {
      await service.updatePreAuthorizationStatus(clinicId, authId, "approved", notes || null);
      toast.success("Pre-authorization approved");
      setNotesModal(null);
      setNotes("");
      load();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to approve"));
    } finally {
      setProcessingId(null);
    }
  }, [service, clinicId, notes, load]);

  const handleReject = useCallback(async (authId) => {
    setProcessingId(authId);
    try {
      await service.updatePreAuthorizationStatus(clinicId, authId, "rejected", notes || null);
      toast.success("Pre-authorization rejected");
      setNotesModal(null);
      setNotes("");
      load();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to reject"));
    } finally {
      setProcessingId(null);
    }
  }, [service, clinicId, notes, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="size-4 text-blue-500" /> Pre-Authorization Queue
        </h3>
        <div className="flex items-center gap-1.5">
          {["", "pending", "approved", "rejected"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {status === "" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {preAuths.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-center">
          <AlertCircle className="size-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No pre-authorization requests found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {preAuths.map(auth => {
            const StatusIcon = STATUS_ICONS[auth.status] || Clock;
            return (
              <div key={auth.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{auth.patients?.full_name || "Unknown Patient"}</p>
                    <p className="text-[10px] text-muted-foreground">{auth.procedure_description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[auth.status]}`}>
                      <StatusIcon className="size-3" /> {auth.status}
                    </span>
                    <span className="text-sm font-bold">{FORMAT_CURRENCY(auth.estimated_cost)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                  <span>Provider: {auth.patient_insurance?.provider || "N/A"} ({auth.patient_insurance?.policy_number || "—"})</span>
                  {auth.diagnosis_code && <span>ICD: {auth.diagnosis_code}</span>}
                </div>

                {auth.notes && (
                  <p className="text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-2 py-1 mb-2">{auth.notes}</p>
                )}

                {auth.status === "pending" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setNotesModal({ id: auth.id, action: "approve" })}
                      disabled={processingId === auth.id}
                      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {processingId === auth.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />} Approve
                    </button>
                    <button
                      onClick={() => setNotesModal({ id: auth.id, action: "reject" })}
                      disabled={processingId === auth.id}
                      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-red-600 border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="size-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-4 w-full max-w-sm space-y-3">
            <h4 className="text-sm font-semibold">
              {notesModal.action === "approve" ? "Approve" : "Reject"} Pre-Authorization
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              className="w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none min-h-[80px]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setNotesModal(null); setNotes(""); }}
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => notesModal.action === "approve" ? handleApprove(notesModal.id) : handleReject(notesModal.id)}
                disabled={processingId === notesModal.id}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                  notesModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processingId === notesModal.id && <Loader2 className="size-3 animate-spin" />}
                {notesModal.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
