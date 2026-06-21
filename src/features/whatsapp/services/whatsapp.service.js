import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { getSmsService } from "@/features/whatsapp/services/sms.service";
import { fetchUsers, enrichUser } from "@/lib/supabase/users";

const TEMPLATE_VARIABLES = {
    "{{patient_name}}": "Patient's full name",
    "{{clinic_name}}": "Clinic name",
    "{{appointment_date}}": "Appointment date",
    "{{appointment_time}}": "Appointment start time",
    "{{doctor_name}}": "Assigned doctor name",
};

function renderTemplate(content, vars) {
    let result = content;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(key, value || "");
    }
    return result;
}

function getEdgeFunctionBase() {
    const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const ref = url.replace("https://", "").split(".")[0];
    return `https://${ref}.supabase.co/functions/v1`;
}

export function getWhatsAppService() {
    const supabase = createClient();
    const audit = getAuditService();
    const efBase = getEdgeFunctionBase();

    const sms = getSmsService();

    async function trySmsFallback(clinicId, values, originalMessage) {
      try {
        const smsResult = await sms.send(clinicId, values.phone_number,
          `[SMS Fallback] ${values.message_content || "Appointment notification"}`,
          { patient_id: values.patient_id, appointment_id: values.appointment_id }
        );
        return { ...originalMessage, sms_fallback: smsResult.id };
      } catch {
        return originalMessage;
      }
    }

    return {
        getTemplateVariables: () => TEMPLATE_VARIABLES,
        renderTemplate,

        // --- Credentials Management ---
        async getCredentials(clinicId) {
            const { data } = await supabase
                .from("whatsapp_credentials")
                .select("id, phone_number_id, business_account_id, webhook_verify_token, api_version, is_connected, last_health_check_at, health_check_passed")
                .eq("clinic_id", clinicId)
                .maybeSingle();
            return data || null;
        },

        async saveCredentials(clinicId, values, userId) {
            const { data: existing } = await supabase
                .from("whatsapp_credentials")
                .select("id")
                .eq("clinic_id", clinicId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from("whatsapp_credentials")
                    .update({ ...values, updated_at: new Date().toISOString() })
                    .eq("clinic_id", clinicId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("whatsapp_credentials")
                    .insert({ ...values, clinic_id: clinicId });
                if (error) throw error;
            }

            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "whatsapp credentials saved",
                entity_type: "whatsapp_credentials",
                entity_id: clinicId,
            }).catch(() => {});
        },

        async deleteCredentials(clinicId, userId) {
            const { error } = await supabase
                .from("whatsapp_credentials")
                .delete()
                .eq("clinic_id", clinicId);
            if (error) throw error;
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "whatsapp credentials deleted",
                entity_type: "whatsapp_credentials",
                entity_id: clinicId,
            }).catch(() => {});
        },

        // --- Connection Status ---
        async getConnectionStatus(clinicId) {
            const { data: creds } = await supabase
                .from("whatsapp_credentials")
                .select("is_connected, last_health_check_at, health_check_passed")
                .eq("clinic_id", clinicId)
                .maybeSingle();

            const { data: lastMsg } = await supabase
                .from("whatsapp_messages")
                .select("sent_at")
                .eq("clinic_id", clinicId)
                .eq("status", "sent")
                .order("sent_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (creds) {
                return {
                    connected: creds.is_connected && creds.health_check_passed,
                    last_successful_message: lastMsg?.sent_at || null,
                    last_health_check_at: creds.last_health_check_at || null,
                    health_check_passed: creds.health_check_passed,
                };
            }

            if (lastMsg) {
                return { connected: true, last_successful_message: lastMsg.sent_at, last_health_check_at: null, health_check_passed: null };
            }

            return { connected: false, last_successful_message: null, last_health_check_at: null, health_check_passed: null };
        },

        // --- Send Message (calls Meta via edge function, with SMS fallback) ---
        async sendMessage(clinicId, values) {
            const { data: message, error } = await supabase
                .from("whatsapp_messages")
                .insert({ ...values, clinic_id: clinicId, provider: "meta", status: "queued" })
                .select().single();
            if (error) throw error;

            const markFailed = async (errMsg) => {
                const now = new Date().toISOString();
                await supabase.from("whatsapp_messages")
                    .update({ status: "failed", failed_at: now, error_message: errMsg })
                    .eq("id", message.id);
            };

            try {
                if (efBase) {
                    const edgeRes = await fetch(`${efBase}/send-whatsapp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                        body: JSON.stringify({ messageId: message.id, clinicId }),
                    });
                    if (edgeRes.ok) {
                        const edgeResult = await edgeRes.json();
                        audit.log({
                            clinic_id: clinicId, user_id: values.appointment_id || undefined,
                            action: "whatsapp sent", entity_type: "whatsapp_messages",
                            entity_id: message.id,
                            new_value: { type: values.message_type, phone: values.phone_number },
                        }).catch(() => {});
                        return { ...message, ...edgeResult, status: "sent" };
                    }
                    await markFailed("Meta API returned non-200");
                    return await trySmsFallback(clinicId, values, { ...message, status: "failed" });
                }

                const providerMessageId = `wa_${message.id}_${Date.now()}`;
                const now = new Date().toISOString();
                await supabase.from("whatsapp_messages")
                    .update({ status: "sent", provider_message_id: providerMessageId, sent_at: now })
                    .eq("id", message.id);
                audit.log({
                    clinic_id: clinicId, user_id: values.appointment_id || undefined,
                    action: "whatsapp sent", entity_type: "whatsapp_messages",
                    entity_id: message.id,
                    new_value: { type: values.message_type, phone: values.phone_number },
                }).catch(() => {});
                return { ...message, status: "sent", provider_message_id: providerMessageId, sent_at: now };
            } catch {
                await markFailed("Send failed");
                return await trySmsFallback(clinicId, values, { ...message, status: "failed", failed_at: new Date().toISOString(), error_message: "Send failed" });
            }
        },

        // --- Send Test Message ---
        async sendTestMessage(clinicId, phoneNumber, userId) {
            const msgValues = {
                patient_id: null,
                appointment_id: null,
                phone_number: phoneNumber,
                message_type: "system_notification",
                message_template: "test",
                message_content: "This is a test message from your clinic management system. If you received this, WhatsApp is connected and working.",
            };
            const result = await this.sendMessage(clinicId, msgValues);
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "whatsapp test sent",
                entity_type: "whatsapp_messages",
                entity_id: result.id,
            }).catch(() => {});
            return result;
        },

        async sendAppointmentReminder(clinicId, appointmentId, patientId, phoneNumber, patientName, appointmentDate, appointmentTime, doctorName, clinicName) {
            const { data: existing } = await supabase
                .from("whatsapp_messages")
                .select("id, status")
                .eq("appointment_id", appointmentId)
                .eq("message_type", "appointment_reminder")
                .maybeSingle();
            if (existing) return null;
            const { data: templateData } = await supabase
                .from("whatsapp_templates")
                .select("*").eq("clinic_id", clinicId)
                .eq("template_type", "appointment_reminder").eq("is_active", true)
                .maybeSingle();
            const template = templateData;
            const content = template
                ? renderTemplate(template.content, {
                    "{{patient_name}}": patientName,
                    "{{clinic_name}}": clinicName,
                    "{{appointment_date}}": new Date(appointmentDate + "T00:00:00").toLocaleDateString(),
                    "{{appointment_time}}": appointmentTime?.substring(0, 5) || "",
                    "{{doctor_name}}": doctorName,
                })
                : "Reminder: " + patientName + ", you have an appointment at " + clinicName;
            const messageValues = {
                clinic_id: clinicId, patient_id: patientId,
                appointment_id: appointmentId, phone_number: phoneNumber,
                message_type: "appointment_reminder",
                message_template: template?.name || "default",
                message_content: content,
            };
            return this.sendMessage(clinicId, messageValues);
        },

        async getReminderSettings(clinicId) {
            const { data, error } = await supabase
                .from("clinic_notification_settings")
                .select("whatsapp_reminders_enabled, reminder_hours_before")
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
                action: "reminder settings updated",
                entity_type: "clinic_notification_settings",
                entity_id: clinicId, new_value: values,
            }).catch(() => {});
        },

        async getTemplates(clinicId) {
            const { data, error } = await supabase
                .from("whatsapp_templates")
                .select("*").eq("clinic_id", clinicId)
                .order("template_type", { ascending: true });
            if (error) throw error;
            return (data || []).map((t) => ({
                id: t.id, name: t.name, template_type: t.template_type,
                content: t.content, is_active: t.is_active, updated_at: t.updated_at,
            }));
        },

        async createTemplate(clinicId, values, userId) {
            const { data, error } = await supabase
                .from("whatsapp_templates")
                .insert({ ...values, clinic_id: clinicId })
                .select().single();
            if (error) throw error;
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "template created", entity_type: "whatsapp_templates",
                entity_id: data.id,
                new_value: { name: values.name, type: values.template_type },
            }).catch(() => {});
            return data;
        },

        async updateTemplate(clinicId, templateId, values, userId) {
            const { error } = await supabase
                .from("whatsapp_templates")
                .update({ ...values, updated_at: new Date().toISOString() })
                .eq("id", templateId).eq("clinic_id", clinicId);
            if (error) throw error;
            audit.log({
                clinic_id: clinicId, user_id: userId,
                action: "template updated", entity_type: "whatsapp_templates",
                entity_id: templateId, new_value: values,
            }).catch(() => {});
        },

        async getMessageLogs(clinicId, options) {
            const page = options?.page || 0;
            const pageSize = options?.pageSize || 20;
            const from = page * pageSize;
            const to = from + pageSize - 1;
            let query = supabase
                .from("whatsapp_messages")
                .select("*", { count: "exact" })
                .eq("clinic_id", clinicId);
            if (options?.status) query = query.eq("status", options.status);
            if (options?.dateFrom) query = query.gte("created_at", options.dateFrom);
            if (options?.dateTo) query = query.lte("created_at", options.dateTo);
            const { data, error, count } = await query
                .order("created_at", { ascending: false }).range(from, to);
            if (error) throw error;
            const appointmentIds = (data || []).map((r) => r.appointment_id).filter(Boolean);
            const patientIds = (data || []).map((r) => r.patient_id).filter(Boolean);
            let appointmentsMap = new Map();
            let patientsMap = new Map();
            if (appointmentIds.length > 0) {
                const { data: appts } = await supabase
                    .from("appointments")
                    .select("id, appointment_date")
                    .in("id", appointmentIds);
                (appts || []).forEach((a) => appointmentsMap.set(a.id, a));
            }
            if (patientIds.length > 0) {
                const { data: pats } = await supabase
                    .from("patients")
                    .select("id, full_name")
                    .in("id", patientIds);
                (pats || []).forEach((p) => patientsMap.set(p.id, p));
            }
            const logs = (data || []).map((row) => {
                const apt = appointmentsMap.get(row.appointment_id);
                const pat = patientsMap.get(row.patient_id);
                return {
                    id: row.id, patient_name: pat?.full_name || null,
                    patient_id: row.patient_id, phone_number: row.phone_number,
                    message_type: row.message_type, status: row.status,
                    appointment_date: apt?.appointment_date || null,
                    sent_at: row.sent_at || null, delivered_at: row.delivered_at || null,
                    read_at: row.read_at || null, failed_at: row.failed_at || null,
                    created_at: row.created_at,
                };
            });
            return { data: logs, total: count || 0 };
        },

        async getMessageLog(clinicId, messageId) {
            const { data, error } = await supabase
                .from("whatsapp_messages")
                .select("*")
                .eq("id", messageId).eq("clinic_id", clinicId).single();
            if (error) return null;
            let apt = null;
            let patient = null;
            if (data.appointment_id) {
                const { data: apptData } = await supabase
                    .from("appointments")
                    .select("appointment_date")
                    .eq("id", data.appointment_id)
                    .maybeSingle();
                apt = apptData;
            }
            if (data.patient_id) {
                const { data: patData } = await supabase
                    .from("patients")
                    .select("full_name")
                    .eq("id", data.patient_id)
                    .maybeSingle();
                patient = patData;
            }
            return {
                id: data.id, patient_name: patient?.full_name || null,
                patient_id: data.patient_id, phone_number: data.phone_number,
                message_type: data.message_type, status: data.status,
                appointment_date: apt?.appointment_date || null,
                sent_at: data.sent_at || null, delivered_at: data.delivered_at || null,
                read_at: data.read_at || null, failed_at: data.failed_at || null,
                created_at: data.created_at, message_content: data.message_content,
                message_template: data.message_template, provider: data.provider,
                provider_message_id: data.provider_message_id || null,
                error_message: data.error_message || null,
                appointment_id: data.appointment_id || null,
            };
        },

        async processWebhook(payload) {
            const entry = payload.entry || [];
            for (const e of entry) {
                const changes = e.changes || [];
                for (const change of changes) {
                    const value = change.value;
                    if (!value) continue;
                    const statuses = value.statuses || [];
                    for (const status of statuses) {
                        const providerMessageId = status.id;
                        const statusName = status.status;
                        const timestamp = status.timestamp;
                        const dateStr = timestamp ? new Date(Number(timestamp) * 1000).toISOString() : new Date().toISOString();
                        const statusDb = statusName === "sent" ? "sent" :
                            statusName === "delivered" ? "delivered" :
                                statusName === "read" ? "read" : "failed";
                        const updateData = { status: statusDb };
                        if (statusDb === "sent") updateData.sent_at = dateStr;
                        else if (statusDb === "delivered") updateData.delivered_at = dateStr;
                        else if (statusDb === "read") updateData.read_at = dateStr;
                        else if (statusDb === "failed") {
                            updateData.failed_at = dateStr;
                            updateData.error_message = status.errors?.[0]?.title || null;
                        }
                        await supabase.from("whatsapp_messages")
                            .update(updateData).eq("provider_message_id", providerMessageId);
                    }
                }
            }
        },

        verifyWebhook(query) {
            const mode = query["hub.mode"];
            const token = query["hub.verify_token"];
            const challenge = query["hub.challenge"];
            const expectedToken = import.meta.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN;
            if (mode === "subscribe" && token === expectedToken && challenge) {
                return challenge;
            }
            return null;
        },
    };
}
