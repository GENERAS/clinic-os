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
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground"
                    }`}>
                        {i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                        {step}
                    </span>
                    {i < steps.length - 1 && <div className="h-px w-6 bg-border"/>}
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
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {successMsg}
                </div>
            )}

            {/* Onboarding Steps */}
            <SectionCard title="Connection Setup">
                <StepIndicator
                    currentStep={onboardingStep}
                    steps={["Connect API", "Verify Webhook", "Send Test"]}
                />

                {/* Step 1: API Credentials */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Step 1: Enter WhatsApp Cloud API Credentials</h4>
                    <p className="text-xs text-muted-foreground">
                        Create a Meta Business Account and WhatsApp Business Account, then enter your credentials below.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-medium text-foreground">Phone Number ID *</label>
                            <input
                                type="text" value={credForm.phone_number_id}
                                onChange={(e) => setCredForm({ ...credForm, phone_number_id: e.target.value })}
                                placeholder="e.g. 123456789012345"
                                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-foreground">Business Account ID</label>
                            <input
                                type="text" value={credForm.business_account_id}
                                onChange={(e) => setCredForm({ ...credForm, business_account_id: e.target.value })}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-foreground">Access Token *</label>
                            <input
                                type="password" value={credForm.access_token}
                                onChange={(e) => setCredForm({ ...credForm, access_token: e.target.value })}
                                placeholder="Paste your permanent access token"
                                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Generate a permanent token from your Meta Business Account settings.
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-foreground">Webhook Verify Token</label>
                            <input
                                type="text" value={credForm.webhook_verify_token}
                                onChange={(e) => setCredForm({ ...credForm, webhook_verify_token: e.target.value })}
                                placeholder="Set a custom verify token for webhook security"
                                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveCredentials}
                            disabled={savingCreds || !credForm.access_token || !credForm.phone_number_id}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
                        {/* Step 2: Webhook */}
                        <div className="mt-8 border-t border-border pt-6 space-y-4">
                            <h4 className="text-sm font-medium text-foreground">Step 2: Configure Webhook</h4>
                            <p className="text-xs text-muted-foreground">
                                Add this webhook URL in your Meta WhatsApp Business Account settings to receive delivery status updates.
                            </p>
                            <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
                                <code className="flex-1 text-xs break-all font-mono">{webhookUrl}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                                    className="shrink-0 text-xs font-medium text-primary hover:text-primary/80"
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className={`h-2 w-2 rounded-full ${connectionStatus?.connected ? "bg-green-500" : "bg-amber-500"}`}/>
                                {connectionStatus?.connected
                                    ? "Webhook verified — receiving delivery updates."
                                    : "Webhook not yet verified. Configure it in Meta and send a test message."}
                            </div>
                        </div>

                        {/* Step 3: Test */}
                        <div className="mt-8 border-t border-border pt-6 space-y-4">
                            <h4 className="text-sm font-medium text-foreground">Step 3: Send Test Message</h4>
                            <p className="text-xs text-muted-foreground">
                                Send a test WhatsApp message to verify everything is working.
                            </p>
                            <div className="flex items-end gap-3 max-w-md">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-foreground">Phone Number</label>
                                    <input
                                        type="tel" value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="+12025551234"
                                        className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                                    />
                                </div>
                                <button
                                    onClick={handleTestSend}
                                    disabled={testing || !testPhone}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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

            {/* Template Management */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Message Templates</h3>
                        <p className="text-xs text-muted-foreground">Manage WhatsApp message templates with dynamic variables</p>
                    </div>
                    {!editingTemplate && (
                        <button onClick={() => setEditingTemplate({
                            id: "", name: "", template_type: "appointment_reminder", content: "", is_active: true, updated_at: "",
                        })} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
                            <div key={tpl.id} className="rounded-xl border bg-card p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground">{tpl.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {tpl.template_type.replace(/_/g, " ")} —{" "}
                                            {tpl.is_active ? (
                                                <span className="text-green-600">Active</span>
                                            ) : (
                                                <span className="text-muted-foreground">Inactive</span>
                                            )}
                                        </p>
                                    </div>
                                    <button onClick={() => setEditingTemplate(tpl)}
                                        className="text-xs font-medium text-primary hover:text-primary/80">
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">No templates yet. Create your first template.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
