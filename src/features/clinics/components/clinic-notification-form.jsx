"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
const TOGGLES = [
    {
        key: "appointment_reminders_enabled",
        label: "Appointment Reminders",
        description: "Send automatic reminders to patients before scheduled appointments",
    },
    {
        key: "low_stock_alerts_enabled",
        label: "Low Stock Alerts",
        description: "Receive notifications when inventory levels are running low",
    },
    {
        key: "system_notifications_enabled",
        label: "System Notifications",
        description: "Receive updates about system changes and important notices",
    },
];
export function ClinicNotificationForm({ settings, isOwner, onSave }) {
    const [form, setForm] = useState({
        appointment_reminders_enabled: true,
        low_stock_alerts_enabled: true,
        system_notifications_enabled: true,
    });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        if (settings) {
            setForm({
                appointment_reminders_enabled: settings.appointment_reminders_enabled,
                low_stock_alerts_enabled: settings.low_stock_alerts_enabled,
                system_notifications_enabled: settings.system_notifications_enabled,
            });
        }
    }, [settings]);
    const handleToggle = async (key) => {
        const updated = { ...form, [key]: !form[key] };
        setForm(updated);
        if (isOwner) {
            setSaving(true);
            try {
                await onSave(updated);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
            catch {
                setForm(form);
            }
            finally {
                setSaving(false);
            }
        }
    };
    return (<SectionCard title="Notification Settings" description="Configure which notifications your clinic receives" actions={!isOwner && (<span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bell className="size-3"/> View only
          </span>)}>
      {!settings && !isOwner ? (<div className="flex flex-col items-center gap-2 py-8 text-center">
          <Bell className="size-8 text-muted-foreground"/>
          <p className="text-sm text-muted-foreground">No notification settings configured</p>
        </div>) : (<div className="space-y-4">
          {TOGGLES.map(({ key, label, description }) => (<div key={key} className="flex items-center justify-between rounded-lg border bg-background p-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <button type="button" role="switch" aria-checked={form[key]} onClick={() => isOwner && handleToggle(key)} disabled={!isOwner || saving} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${form[key] ? "bg-primary" : "bg-input"}`}>
                <span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition-transform ${form[key] ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>))}
          {success && <p className="text-xs text-green-600">Saved</p>}
        </div>)}
    </SectionCard>);
}
