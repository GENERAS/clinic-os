"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingState } from "@/components/shared/loading-state";
import { ConnectionStatusCard } from "@/features/whatsapp/components/ConnectionStatusCard";
import { ReminderSettingsCard } from "@/features/whatsapp/components/ReminderSettingsCard";
import { TemplateEditor } from "@/features/whatsapp/components/TemplateEditor";
import { getWhatsAppService } from "@/features/whatsapp/services/whatsapp.service";
import { useAuth } from "@/features/auth/hooks/use-auth";

function StepIndicator({ currentStep, steps }) {
    return (
        <div className="flex items-center gap-2 mb-6">
            {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                        i <= currentStep
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-500"
                    }`}>
                        {i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i <= currentStep ? "text-slate-900" : "text-slate-500"}`}>
                        {step}
                    </span>
                    {i < steps.length - 1 && <div className="h-px w-6 bg-slate-200"/>}
                </div>
            ))}
        </div>
    );
}

export default function WhatsAppSettingsPage() {
    const { user } = useAuth();
    const whatsapp = getWhatsAppService();
    const clinicId = user?.clinicId;

    const [settings, setSettings] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Credentials form
    const [credForm, setCredForm] = useState({ access_token: "", phone_number_id: "", business_account_id: "", webhook_verify_token: "" });
    const [savingCreds, setSavingCreds] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState("");

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        try {
            const [settingsData, credsData, statusData, templatesData] = await Promise.all([
                whatsapp.getReminderSettings(clinicId),
                whatsapp.getCredentials(clinicId),
                whatsapp.getConnectionStatus(clinicId),
                whatsapp.getTemplates(clinicId),
            ]);
            setSettings(settingsData);
            setCredentials(credsData);
            setConnectionStatus(statusData);
            setTemplates(templatesData);
            if (credsData) {
                setCredForm({
                    access_token: "",
                    phone_number_id: credsData.phone_number_id || "",
                    business_account_id: credsData.business_account_id || "",
                    webhook_verify_token: credsData.webhook_verify_token || "",
                });
            }
        } catch {
            setError("Failed to load WhatsApp settings");
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveCredentials = async () => {
        if (!clinicId || !user) return;
        setSavingCreds(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await whatsapp.saveCredentials(clinicId, credForm, user.id);
            setSuccessMsg("Credentials saved successfully.");
            await loadData();
        } catch {
            setError("Failed to save credentials");
        } finally {
            setSavingCreds(false);
        }
    };

    const handleDisconnect = async () => {
        if (!clinicId || !user) return;
        setSavingCreds(true);
        try {
            await whatsapp.deleteCredentials(clinicId, user.id);
            setCredentials(null);
            setConnectionStatus({ connected: false, last_successful_message: null });
            setCredForm({ access_token: "", phone_number_id: "", business_account_id: "", webhook_verify_token: "" });
            setSuccessMsg("Disconnected successfully.");
        } catch {
            setError("Failed to disconnect");
        } finally {
            setSavingCreds(false);
        }
    };

    const handleTestSend = async () => {
        if (!clinicId || !user || !testPhone) return;
        setTesting(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await whatsapp.sendTestMessage(clinicId, testPhone, user.id);
            setSuccessMsg("Test message sent! Check the WhatsApp number.");
        } catch {
            setError("Failed to send test message");
        } finally {
            setTesting(false);
        }
    };

    const handleSaveSettings = async (values) => {
        if (!clinicId || !user) return;
        await whatsapp.updateReminderSettings(clinicId, values, user.id);
        setSettings(values);
    };

    const handleSaveTemplate = async (values) => {
        if (!clinicId || !user) return;
        if (editingTemplate?.id) {
            await whatsapp.updateTemplate(clinicId, editingTemplate.id, values, user.id);
        } else {
            await whatsapp.createTemplate(clinicId, values, user.id);
        }
        setEditingTemplate(null);
        const templatesData = await whatsapp.getTemplates(clinicId);
        setTemplates(templatesData);
    };

    if (!clinicId) return null;
    if (loading) return <LoadingState title="Loading WhatsApp settings..."/>;

    const webhookUrl = `${import.meta.env.NEXT_PUBLIC_APP_URL || "https://ehsqtdmjfgbnhrfobilf.supabase.co"}/functions/v1/whatsapp-webhook`;
    const hasCredentials = !!credentials;
    const onboardingStep = !hasCredentials ? 0 : !connectionStatus?.connected ? 1 : 2;

    const templateVariables = whatsapp.getTemplateVariables();

    return (
        <div className="space-y-6">
            <PageHeader title="WhatsApp Integration" description="Connect WhatsApp to send automated appointment reminders to patients"/>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {successMsg}
                </div>
            )}

            <SectionCard title="Connection Setup">
                <StepIndicator
                    currentStep={onboardingStep}
                    steps={["Connect API", "Verify Webhook", "Send Test"]}
                />

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-900">Step 1: Enter WhatsApp Cloud API Credentials</h4>
                    <p className="text-xs text-slate-500">
                        Create a Meta Business Account and WhatsApp Business Account, then enter your credentials below.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-medium text-slate-700">Phone Number ID *</label>
                            <input
                                type="text" value={credForm.phone_number_id}
                                onChange={(e) => setCredForm({ ...credForm, phone_number_id: e.target.value })}
                                placeholder="e.g. 123456789012345"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-700">Business Account ID</label>
                            <input
                                type="text" value={credForm.business_account_id}
                                onChange={(e) => setCredForm({ ...credForm, business_account_id: e.target.value })}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-slate-700">Access Token *</label>
                            <input
                                type="password" value={credForm.access_token}
                                onChange={(e) => setCredForm({ ...credForm, access_token: e.target.value })}
                                placeholder="Paste your permanent access token"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Generate a permanent token from your Meta Business Account settings.
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-slate-700">Webhook Verify Token</label>
                            <input
                                type="text" value={credForm.webhook_verify_token}
                                onChange={(e) => setCredForm({ ...credForm, webhook_verify_token: e.target.value })}
                                placeholder="Set a custom verify token for webhook security"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveCredentials}
                            disabled={savingCreds || !credForm.access_token || !credForm.phone_number_id}
                            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                        >
                            {savingCreds ? "Saving..." : hasCredentials ? "Update Credentials" : "Save & Connect"}
                        </button>
                        {hasCredentials && (
                            <button
                                onClick={handleDisconnect}
                                disabled={savingCreds}
                                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {hasCredentials && (
                    <>
                        <div className="mt-8 border-t border-slate-200 pt-6 space-y-4">
                            <h4 className="text-sm font-medium text-slate-900">Step 2: Configure Webhook</h4>
                            <p className="text-xs text-slate-500">
                                Add this webhook URL in your Meta WhatsApp Business Account settings to receive delivery status updates.
                            </p>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3">
                                <code className="flex-1 text-xs break-all font-mono text-slate-700">{webhookUrl}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                                    className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-500"
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className={`h-2 w-2 rounded-full ${connectionStatus?.connected ? "bg-emerald-500" : "bg-amber-500"}`}/>
                                {connectionStatus?.connected
                                    ? "Webhook verified — receiving delivery updates."
                                    : "Webhook not yet verified. Configure it in Meta and send a test message."}
                            </div>
                        </div>

                        <div className="mt-8 border-t border-slate-200 pt-6 space-y-4">
                            <h4 className="text-sm font-medium text-slate-900">Step 3: Send Test Message</h4>
                            <p className="text-xs text-slate-500">
                                Send a test WhatsApp message to verify everything is working.
                            </p>
                            <div className="flex items-end gap-3 max-w-md">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-700">Phone Number</label>
                                    <input
                                        type="tel" value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="+12025551234"
                                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                                <button
                                    onClick={handleTestSend}
                                    disabled={testing || !testPhone}
                                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                                >
                                    {testing ? "Sending..." : "Send Test"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </SectionCard>

            {/* Status + Reminder Settings */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <ConnectionStatusCard status={connectionStatus} hasCredentials={hasCredentials}/>
                </div>
                <div className="lg:col-span-2">
                    <ReminderSettingsCard settings={settings} onSave={handleSaveSettings}/>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Message Templates</h3>
                        <p className="text-xs text-slate-500">Manage WhatsApp message templates with dynamic variables</p>
                    </div>
                    {!editingTemplate && (
                        <button onClick={() => setEditingTemplate({
                            id: "", name: "", template_type: "appointment_reminder", content: "", is_active: true, updated_at: "",
                        })} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500">
                            New Template
                        </button>
                    )}
                </div>

                {editingTemplate ? (
                    <SectionCard title={editingTemplate.id ? "Edit Template" : "Create Template"}>
                        <TemplateEditor
                            template={editingTemplate.id ? editingTemplate : null}
                            templateVariables={templateVariables}
                            onSave={handleSaveTemplate}
                            onCancel={() => setEditingTemplate(null)}
                        />
                    </SectionCard>
                ) : (
                    <div className="space-y-3">
                        {templates.map((tpl) => (
                            <div key={tpl.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900">{tpl.name}</h4>
                                        <p className="text-xs text-slate-500">
                                            {tpl.template_type.replace(/_/g, " ")} —{" "}
                                            {tpl.is_active ? (
                                                <span className="text-emerald-600">Active</span>
                                            ) : (
                                                <span className="text-slate-400">Inactive</span>
                                            )}
                                        </p>
                                    </div>
                                    <button onClick={() => setEditingTemplate(tpl)}
                                        className="text-xs font-medium text-teal-600 hover:text-teal-500">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <p className="py-6 text-center text-sm text-slate-500">No templates yet. Create your first template.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
