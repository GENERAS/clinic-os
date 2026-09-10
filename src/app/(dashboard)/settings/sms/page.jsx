"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { LoadingState } from "@/components/shared/loading-state";
import { getSmsService } from "@/features/whatsapp/services/sms.service";
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

export default function SmsSettingsPage() {
    const { clinic: authClinic, user } = useAuth();
    const sms = getSmsService();
    const clinicId = authClinic?.id;

    const [provider, setProvider] = useState("africastalking");
    const [senderId, setSenderId] = useState("");
    const [config, setConfig] = useState({});
    const [enabled, setEnabled] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [savingCreds, setSavingCreds] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState("");

    const loadData = useCallback(async () => {
        if (!clinicId) return;
        try {
            const [credsData, statusData] = await Promise.all([
                sms.getCredentials(clinicId),
                sms.getConnectionStatus(clinicId),
            ]);
            setConnectionStatus(statusData);
            if (credsData) {
                setProvider(credsData.provider || "africastalking");
                setSenderId(credsData.sender_id || "");
                setConfig(credsData.config || {});
                setEnabled(!!credsData.is_enabled);
            }
        } catch {
            setError("Failed to load SMS settings");
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => { loadData(); }, [loadData]);

    const configFields = provider === "twilio"
        ? [{ key: "accountSid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxx", type: "text" },
           { key: "authToken", label: "Auth Token", placeholder: "Paste your auth token", type: "password" },
           { key: "from", label: "From Number", placeholder: "+15005550006", type: "tel" }]
        : [{ key: "username", label: "Username", placeholder: "sandbox", type: "text" },
           { key: "apiKey", label: "API Key", placeholder: "Paste your API key", type: "password" }];

    const handleSaveCredentials = async () => {
        if (!clinicId || !user) return;
        setSavingCreds(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const values = { provider, sender_id: senderId, is_enabled: enabled, ...config };
            await sms.saveCredentials(clinicId, values, user.id);
            setSuccessMsg(`SMS credentials saved. ${enabled ? "SMS is enabled." : "SMS is currently disabled — enable it to start sending."}`);
            await loadData();
        } catch {
            setError("Failed to save SMS credentials");
        } finally {
            setSavingCreds(false);
        }
    };

    const handleDisconnect = async () => {
        if (!clinicId || !user) return;
        setSavingCreds(true);
        try {
            await sms.deleteCredentials(clinicId, user.id);
            setConnectionStatus(null);
            setProvider("africastalking");
            setSenderId("");
            setConfig({});
            setEnabled(false);
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
            await sms.sendTestMessage(clinicId, testPhone, user.id);
            setSuccessMsg("Test message sent! Check the phone number.");
        } catch (err) {
            setError(`Failed to send test message: ${err.message}`);
        } finally {
            setTesting(false);
        }
    };

    if (!clinicId) return null;
    if (loading) return <LoadingState title="Loading SMS settings..."/>;

    const hasCredentials = !!connectionStatus?.configured;
    const onboardingStep = !hasCredentials ? 0 : !connectionStatus?.connected ? 1 : 2;

    return (
        <div className="space-y-6">
            <PageHeader title="SMS Integration" description="Connect an SMS provider to send automated appointment reminders to patients"/>

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
                    steps={["Connect Provider", "Enable SMS", "Send Test"]}
                />

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-900">Step 1: Choose Provider & Enter Credentials</h4>
                    <p className="text-xs text-slate-500">
                        Recommended for Rwanda (+250): <strong>Africa's Talking</strong> — free sandbox for testing, SMS coverage on MTN/Airtel. Twilio also works (international, pay-per-SMS).
                    </p>

                    <div>
                        <label className="text-xs font-medium text-slate-700">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                            <option value="africastalking">Africa's Talking</option>
                            <option value="twilio">Twilio</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {configFields.map((field) => (
                            <div key={field.key}>
                                <label className="text-xs font-medium text-slate-700">{field.label} *</label>
                                <input
                                    type={field.type}
                                    value={config[field.key] || ""}
                                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="text-xs font-medium text-slate-700">Sender ID</label>
                            <input
                                type="text" value={senderId}
                                onChange={(e) => setSenderId(e.target.value)}
                                placeholder="e.g. CLINICOS (optional for Twilio)"
                                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-slate-900">Enable SMS Messaging</p>
                            <p className="text-xs text-slate-500">Disable to stop all outgoing SMS without removing credentials</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="peer sr-only"/>
                            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-teal-600 peer-checked:after:translate-x-full peer-checked:after:border-white"/>
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveCredentials}
                            disabled={savingCreds}
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
                    <div className="mt-8 border-t border-slate-200 pt-6 space-y-4">
                        <h4 className="text-sm font-medium text-slate-900">Step 2: Send Test Message</h4>
                        <p className="text-xs text-slate-500">
                            Send a test SMS to verify everything is working. Use an E.164 number (e.g. +2507xxxxxxxx).
                        </p>
                        <div className="flex items-end gap-3 max-w-md">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-slate-700">Phone Number</label>
                                <input
                                    type="tel" value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="+2507xxxxxxxx"
                                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                            <button
                                onClick={handleTestSend}
                                disabled={testing || !testPhone || !enabled}
                                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
                            >
                                {testing ? "Sending..." : "Send Test"}
                            </button>
                        </div>
                    </div>
                )}

                {hasCredentials && (
                    <div className="mt-8 border-t border-slate-200 pt-6">
                        <h4 className="text-sm font-medium text-slate-900">Status</h4>
                        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                            <div className="rounded-lg bg-slate-100 px-4 py-3">
                                <p className="text-xs text-slate-500">Provider</p>
                                <p className="font-medium text-slate-900 capitalize">{provider}</p>
                            </div>
                            <div className="rounded-lg bg-slate-100 px-4 py-3">
                                <p className="text-xs text-slate-500">Status</p>
                                <p className={`font-medium ${connectionStatus?.connected ? "text-emerald-600" : "text-amber-600"}`}>
                                    {connectionStatus?.connected ? "Connected" : "Not verified"}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-100 px-4 py-3">
                                <p className="text-xs text-slate-500">Last sent</p>
                                <p className="font-medium text-slate-900">
                                    {connectionStatus?.last_successful_message
                                        ? new Date(connectionStatus.last_successful_message).toLocaleString()
                                        : "Never"}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-100 px-4 py-3">
                                <p className="text-xs text-slate-500">Last check</p>
                                <p className="font-medium text-slate-900">
                                    {connectionStatus?.last_health_check_at
                                        ? new Date(connectionStatus.last_health_check_at).toLocaleString()
                                        : "Never"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}