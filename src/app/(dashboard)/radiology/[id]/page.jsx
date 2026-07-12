"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Upload, Trash2, Save, Send, X, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getRadiologyService } from "@/features/radiology/services/radiology.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const MODALITY_LABELS = {
    xray: "X-Ray", ultrasound: "Ultrasound", ct: "CT Scan", mri: "MRI",
    ecg: "ECG", echo: "Echocardiogram", fluoroscopy: "Fluoroscopy",
    mammography: "Mammography", dexa: "DEXA", other: "Other",
};

const STATUS_STYLES = {
    ordered: "text-amber-600 bg-amber-50",
    scheduled: "text-blue-600 bg-blue-50",
    imaging_done: "text-purple-600 bg-purple-50",
    report_written: "text-indigo-600 bg-indigo-50",
    completed: "text-emerald-600 bg-emerald-50",
    cancelled: "text-gray-600 bg-gray-50",
};

const STATUS_TRANSITIONS = {
    ordered: ["scheduled", "cancelled"],
    scheduled: ["imaging_done", "cancelled"],
    imaging_done: ["report_written"],
    report_written: ["completed"],
    completed: [],
    cancelled: [],
};

function ImageViewer({ image, onDelete, isOwner }) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    return (
        <div className="rounded-xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate max-w-[200px]">{image.file_name}</span>
                    {image.laterality && <span className="text-[10px] text-muted-foreground uppercase">{image.laterality}</span>}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1 rounded hover:bg-muted/50"><ZoomOut className="size-3.5" /></button>
                    <span className="text-[10px] text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1 rounded hover:bg-muted/50"><ZoomIn className="size-3.5" /></button>
                    <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1 rounded hover:bg-muted/50"><RotateCw className="size-3.5" /></button>
                    {isOwner && (
                        <button onClick={() => onDelete(image)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="size-3.5" /></button>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-center bg-black min-h-[300px] max-h-[600px] overflow-auto p-2">
                <img
                    src={image.file_url}
                    alt={image.file_name || "Radiology image"}
                    className="max-w-full max-h-[560px] object-contain transition-transform"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
            </div>
        </div>
    );
}

function ReportEditor({ order, report, onSave, onCancel }) {
    const [findings, setFindings] = useState(report?.findings || "");
    const [impression, setImpression] = useState(report?.impression || "");
    const [technique, setTechnique] = useState(report?.technique || "");
    const [recommendations, setRecommendations] = useState(report?.recommendations || "");
    const [comparisonStudies, setComparisonStudies] = useState(report?.comparison_studies || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async (status) => {
        if (!findings.trim() || !impression.trim()) {
            toast.error("Findings and Impression are required");
            return;
        }
        setSaving(true);
        try {
            await onSave({ findings, impression, technique, recommendations, comparison_studies: comparisonStudies, status });
            toast.success(status === "final" ? "Report signed and finalized" : "Report saved as draft");
            onCancel();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to save report"));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y";
    const labelClass = "text-[10px] font-medium text-muted-foreground uppercase";

    return (
        <div className="rounded-xl border bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{report ? "Edit Report" : "New Report"}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[order.status] || ""}`}>
                    Order: {order.status.replace(/_/g, " ")}
                </span>
            </div>

            <div>
                <label className={labelClass}>Technique</label>
                <input value={technique} onChange={(e) => setTechnique(e.target.value)} className={`mt-1 ${inputClass}`} placeholder="e.g. PA chest X-ray, supine position" />
            </div>

            <div>
                <label className={labelClass}>Comparison Studies</label>
                <input value={comparisonStudies} onChange={(e) => setComparisonStudies(e.target.value)} className={`mt-1 ${inputClass}`} placeholder="e.g. Previous CT from Jan 2026" />
            </div>

            <div>
                <label className={`${labelClass} text-red-600`}>Findings *</label>
                <textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={6} className={`mt-1 ${inputClass}`} placeholder="Describe the radiological findings in detail..." />
            </div>

            <div>
                <label className={`${labelClass} text-red-600`}>Impression *</label>
                <textarea value={impression} onChange={(e) => setImpression(e.target.value)} rows={3} className={`mt-1 ${inputClass}`} placeholder="Summary conclusion and diagnosis..." />
            </div>

            <div>
                <label className={labelClass}>Recommendations</label>
                <textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} className={`mt-1 ${inputClass}`} placeholder="e.g. Correlate with clinical, follow-up in 3 months" />
            </div>

            <div className="flex items-center gap-2 justify-end">
                <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                <button onClick={() => handleSave("draft")} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
                    <Save className="size-3" /> Save Draft
                </button>
                <button onClick={() => handleSave("final")} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">
                    <Send className="size-3" /> Sign & Finalize
                </button>
            </div>
        </div>
    );
}

export default function RadiologyDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getRadiologyService(), []);
    const fileInputRef = useRef(null);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showReportEditor, setShowReportEditor] = useState(false);

    const load = useCallback(async () => {
        if (!clinicId || !id) return;
        setLoading(true);
        try {
            const data = await service.getOrder(clinicId, id);
            setOrder(data);
        } catch {
            toast.error("Failed to load radiology order");
        } finally {
            setLoading(false);
        }
    }, [clinicId, id, service]);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = useCallback(async (newStatus) => {
        if (!clinicId || !order) return;
        try {
            await service.transitionStatus(clinicId, order.id, newStatus, user.id);
            toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to update status"));
        }
    }, [clinicId, order, user, service, load]);

    const handleUpload = useCallback(async (e) => {
        const files = e.target.files;
        if (!files?.length || !clinicId || !order) return;
        setUploading(true);
        try {
            for (const file of files) {
                await service.uploadImage(clinicId, order.id, file, user.id);
            }
            toast.success(`${files.length} image(s) uploaded`);
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Upload failed"));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [clinicId, order, user, service, load]);

    const handleDeleteImage = useCallback(async (image) => {
        if (!clinicId || !confirm("Delete this image?")) return;
        try {
            await service.deleteImage(clinicId, image.id, image.storage_path);
            toast.success("Image deleted");
            load();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to delete image"));
        }
    }, [clinicId, service, load]);

    const handleSaveReport = useCallback(async (reportData) => {
        if (!clinicId || !order) return;
        await service.saveReport(clinicId, order.id, reportData, user.id);
        load();
    }, [clinicId, order, user, service, load]);

    const latestReport = order?.radiology_reports?.length > 0
        ? order.radiology_reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        : null;

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!order) {
        return (
            <div className="space-y-6">
                <PageHeader title="Order Not Found" />
                <p className="text-sm text-muted-foreground">This radiology order does not exist.</p>
            </div>
        );
    }

    const p = order.patients;
    const possibleStatuses = STATUS_TRANSITIONS[order.status] || [];

    return (
        <div className="space-y-5">
            <PageHeader title={`${order.body_part} — ${MODALITY_LABELS[order.modality] || order.modality}`}>
                <div className="flex items-center gap-2">
                    {possibleStatuses.map(s => (
                        <button key={s} onClick={() => handleStatusChange(s)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            s === "cancelled" ? "text-red-600 border-red-200 hover:bg-red-50" :
                            "text-teal-600 border-teal-200 hover:bg-teal-50"
                        }`}>
                            {s.replace(/_/g, " ")}
                        </button>
                    ))}
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" /> Back
                    </button>
                </div>
            </PageHeader>

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-xl border bg-white p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Order Details</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{p?.full_name}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Modality</span><span className="font-medium">{MODALITY_LABELS[order.modality]}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Body Part</span><span className="font-medium">{order.body_part}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Urgency</span><span className={`font-medium uppercase ${order.urgency === "urgent" || order.urgency === "stat" ? "text-red-600" : ""}`}>{order.urgency}</span></div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[order.status] || ""}`}>{order.status.replace(/_/g, " ")}</span>
                            </div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Ordered</span><span>{new Date(order.created_at).toLocaleString()}</span></div>
                            {order.scheduled_at && <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{new Date(order.scheduled_at).toLocaleString()}</span></div>}
                            {order.performed_at && <div className="flex justify-between"><span className="text-muted-foreground">Performed</span><span>{new Date(order.performed_at).toLocaleString()}</span></div>}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Clinical Info</h3>
                        <div className="space-y-2 text-xs">
                            <div><span className="text-muted-foreground">Indication:</span><p className="mt-0.5">{order.clinical_indication}</p></div>
                            {order.special_instructions && <div><span className="text-muted-foreground">Special Instructions:</span><p className="mt-0.5">{order.special_instructions}</p></div>}
                            {order.consultations && (
                                <div><span className="text-muted-foreground">Consultation:</span><p className="mt-0.5">{order.consultations.chief_complaint}</p></div>
                            )}
                        </div>
                    </div>

                    {latestReport && (
                        <div className="rounded-xl border bg-white p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Report</h3>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    latestReport.status === "final" ? "text-emerald-600 bg-emerald-50" :
                                    latestReport.status === "preliminary" ? "text-blue-600 bg-blue-50" :
                                    "text-amber-600 bg-amber-50"
                                }`}>{latestReport.status}</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                {latestReport.technique && <div><span className="text-muted-foreground">Technique:</span><p className="mt-0.5">{latestReport.technique}</p></div>}
                                <div><span className="text-muted-foreground">Findings:</span><p className="mt-0.5 whitespace-pre-wrap">{latestReport.findings}</p></div>
                                <div><span className="text-muted-foreground font-semibold">Impression:</span><p className="mt-0.5 whitespace-pre-wrap font-medium">{latestReport.impression}</p></div>
                                {latestReport.recommendations && <div><span className="text-muted-foreground">Recommendations:</span><p className="mt-0.5">{latestReport.recommendations}</p></div>}
                                {latestReport.signed_at && <div><span className="text-muted-foreground">Signed:</span><span className="ml-1">{new Date(latestReport.signed_at).toLocaleString()}</span></div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Images ({order.radiology_images?.length || 0})</h3>
                        <div className="flex items-center gap-2">
                            <input ref={fileInputRef} type="file" accept="image/*,.dcm" multiple onChange={handleUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">
                                {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3.5" />}
                                Upload Images
                            </button>
                            {!showReportEditor && (
                                <button onClick={() => setShowReportEditor(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                                    Write Report
                                </button>
                            )}
                        </div>
                    </div>

                    {showReportEditor && (
                        <ReportEditor
                            order={order}
                            report={latestReport}
                            onSave={handleSaveReport}
                            onCancel={() => { setShowReportEditor(false); load(); }}
                        />
                    )}

                    {order.radiology_images?.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {order.radiology_images.map((img) => (
                                <ImageViewer key={img.id} image={img} onDelete={handleDeleteImage} isOwner={true} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border-2 border-dashed bg-white">
                            <ImageIcon className="size-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No images uploaded yet</p>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors">
                                <Upload className="size-3.5" /> Upload First Image
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
