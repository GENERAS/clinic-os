import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";

function getEdgeFunctionBase() {
    const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const ref = url.replace("https://", "").split(".")[0];
    return `https://${ref}.supabase.co/functions/v1`;
}

export function getSmsService() {
    const supabase = createClient();
    const audit = getAuditService();

    const markFailed = (messageId, errMsg) =>
        supabase.from("whatsapp_messages")
            .update({ status: "failed", failed_at: new Date().toISOString(), error_message: errMsg })
            .eq("id", messageId);

    return {
        async send(clinicId, phoneNumber, messageText, context = {}) {
            if (!phoneNumber) throw new Error("Phone number is required");
            const { data: message, error } = await supabase.from("whatsapp_messages").insert({
                clinic_id: clinicId,
                patient_id: context.patient_id || null,
                appointment_id: context.appointment_id || null,
                phone_number: phoneNumber,
                message_type: context.message_type || "system_notification",
                message_template: context.message_template || "sms",
                message_content: messageText,
                provider: "sms",
                status: "queued",
                direction: "outbound",
            }).select().single();
            if (error) throw error;

            const efBase = getEdgeFunctionBase();
            if (efBase) {
                const edgeRes = await fetch(`${efBase}/send-sms`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ messageId: message.id, clinicId }),
                });
                if (edgeRes.ok) {
                    const edgeResult = await edgeRes.json();
                    const now = new Date().toISOString();
                    return { ...message, ...edgeResult, status: "sent", sent_at: now };
                }
                const edgeErr = await edgeRes.json().catch(() => ({}));
                await markFailed(message.id, edgeErr.error || "SMS send failed");
                throw new Error(edgeErr.error || "SMS send failed");
            }

            // Simulation mode (edge functions not deployed): record locally.
            const now = new Date().toISOString();
            await supabase.from("whatsapp_messages")
                .update({ status: "sent", sent_at: now })
                .eq("id", message.id);
            return { ...message, status: "sent", sent_at: now };
        },

        async sendBulk(clinicId, recipients, messageText) {
            const results = [];
            for (const r of recipients) {
                try {
                    const result = await this.send(clinicId, r.phone, messageText, r.context);
                    results.push({ phone: r.phone, success: true, id: result.id });
                } catch (err) {
                    results.push({ phone: r.phone, success: false, error: err.message });
                }
            }
            return results;
        },

        // --- Credentials Management ---
        async getCredentials(clinicId) {
            const { data } = await supabase
                .from("sms_credentials")
                .select("id, provider, sender_id, config, is_enabled, connection_status, last_health_check_at, health_check_passed")
                .eq("clinic_id", clinicId)
                .maybeSingle();
            return data || null;
        },

        async saveCredentials(clinicId, values, userId) {
            const { provider, sender_id, is_enabled, ...configKeys } = values;
            const config = {};
            for (const [k, v] of Object.entries(configKeys)) {
                if (v !== undefined && v !== null && String(v).trim() !== "") config[k] = v;
            }
            const safeValues = {
                provider: provider || "africastalking",
                sender_id: sender_id || null,
                config,
                is_enabled: !!is_enabled,
                connection_status: "disconnected",
            };
            const { data: existing } = await supabase
                .from("sms_credentials")
                .select("id")
                .eq("clinic_id", clinicId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from("sms_credentials")
                    .update({ ...safeValues, updated_at: new Date().toISOString() })
                    .eq("clinic_id", clinicId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("sms_credentials")
                    .insert({ ...safeValues, clinic_id: clinicId });
                if (error) throw error;
            }

            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "sms credentials saved",
                entity_type: "sms_credentials",
                entity_id: clinicId,
            }).catch(() => {});
        },

        async deleteCredentials(clinicId, userId) {
            const { error } = await supabase
                .from("sms_credentials")
                .delete()
                .eq("clinic_id", clinicId);
            if (error) throw error;
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "sms credentials deleted",
                entity_type: "sms_credentials",
                entity_id: clinicId,
            }).catch(() => {});
        },

        // --- Connection Status ---
        async getConnectionStatus(clinicId) {
            const { data: creds } = await supabase
                .from("sms_credentials")
                .select("is_enabled, connection_status, last_health_check_at, health_check_passed")
                .eq("clinic_id", clinicId)
                .maybeSingle();

            const { data: lastMsg } = await supabase
                .from("whatsapp_messages")
                .select("sent_at")
                .eq("clinic_id", clinicId)
                .eq("provider", "sms")
                .eq("status", "sent")
                .order("sent_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (creds) {
                return {
                    configured: true,
                    enabled: creds.is_enabled,
                    connected: creds.is_enabled && creds.connection_status === "connected",
                    last_successful_message: lastMsg?.sent_at || null,
                    last_health_check_at: creds.last_health_check_at || null,
                    health_check_passed: creds.health_check_passed,
                };
            }
            return { configured: false, enabled: false, connected: false, last_successful_message: null, last_health_check_at: null, health_check_passed: null };
        },

        // --- Test Send ---
        async sendTestMessage(clinicId, phoneNumber, userId) {
            const msgValues = {
                phone_number: phoneNumber,
                message_type: "system_notification",
                message_template: "test",
                message_content: "This is a test SMS from your clinic management system. If you received this, the SMS integration is working.",
            };
            const result = await this.send(clinicId, phoneNumber, msgValues.message_content, msgValues);
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "sms test sent",
                entity_type: "whatsapp_messages",
                entity_id: result.id,
            }).catch(() => {});
            return result;
        },

        // --- Reminder Settings ---
        async getReminderSettings(clinicId) {
            const { data, error } = await supabase
                .from("clinic_notification_settings")
                .select("sms_reminders_enabled, sms_reminder_hours_before")
                .eq("clinic_id", clinicId)
                .single();
            if (error) return null;
            return data;
        },

        async updateReminderSettings(clinicId, values, userId) {
            const { error } = await supabase
                .from("clinic_notification_settings")
                .update({ ...values, updated_at: new Date().toISOString() })
                .eq("clinic_id", clinicId);
            if (error) throw error;
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "sms reminder settings updated",
                entity_type: "clinic_notification_settings",
                entity_id: clinicId, new_value: values,
            }).catch(() => {});
        },
    };
}