import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class PrivacyService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getPatientConsents(clinicId, patientId) {
        const { data, error } = await this.supabase
            .from("patient_consents")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createPatientConsent(clinicId, data) {
        const { data: consent, error } = await this.supabase
            .from("patient_consents")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                consent_type: data.consent_type,
                consent_given: data.consent_given !== undefined ? data.consent_given : true,
                consent_date: data.consent_date || new Date().toISOString().split("T")[0],
                expiry_date: data.expiry_date || null,
                notes: data.notes || null,
                witness_id: data.witness_id || data.recorded_by || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return consent.id;
    }

    async revokePatientConsent(clinicId, consentId) {
        const { error } = await this.supabase
            .from("patient_consents")
            .update({
                consent_given: false,
            })
            .eq("id", consentId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async hasConsent(clinicId, patientId, consentType) {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await this.supabase
            .from("patient_consents")
            .select("id, consent_given, expiry_date")
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .eq("consent_type", consentType)
            .eq("consent_given", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        if (!data) return false;
        if (data.expiry_date && data.expiry_date < today) return false;
        return true;
    }

    async logDataAccess(clinicId, data) {
        const { data: log, error } = await this.supabase
            .from("data_access_logs")
            .insert({
                clinic_id: clinicId,
                user_id: data.user_id,
                action: data.action,
                entity_type: data.entity_type,
                entity_id: data.entity_id || null,
                fields_accessed: data.fields_accessed || null,
                ip_address: data.ip_address || null,
                user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return log.id;
    }

    async getDataAccessLogs(clinicId, filters) {
        let query = this.supabase
            .from("data_access_logs")
            .select(`
                *,
                users!data_access_logs_user_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);

        if (filters?.user_id) {
            query = query.eq("user_id", filters.user_id);
        }
        if (filters?.entity_type) {
            query = query.eq("entity_type", filters.entity_type);
        }
        if (filters?.action) {
            query = query.eq("action", filters.action);
        }
        if (filters?.date_from) {
            query = query.gte("created_at", filters.date_from);
        }
        if (filters?.date_to) {
            query = query.lte("created_at", filters.date_to);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getDataAccessLogsByUser(clinicId, userId) {
        const { data, error } = await this.supabase
            .from("data_access_logs")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getRetentionPolicies(clinicId) {
        const { data, error } = await this.supabase
            .from("data_retention_policies")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("entity_type", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async upsertRetentionPolicy(clinicId, data) {
        const { data: existing } = await this.supabase
            .from("data_retention_policies")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("entity_type", data.entity_type)
            .maybeSingle();

        if (existing) {
            const { error } = await this.supabase
                .from("data_retention_policies")
                .update({
                    retention_days: data.retention_days,
                    archive_after_days: data.archive_after_days || data.retention_days,
                    delete_after_days: data.delete_after_days || data.retention_days,
                    is_active: data.is_active !== undefined ? data.is_active : true,
                })
                .eq("id", existing.id);
            if (error) throw error;
            return existing.id;
        }

        const { data: policy, error } = await this.supabase
            .from("data_retention_policies")
            .insert({
                clinic_id: clinicId,
                entity_type: data.entity_type,
                retention_days: data.retention_days,
                archive_after_days: data.archive_after_days || data.retention_days,
                delete_after_days: data.delete_after_days || data.retention_days,
                is_active: data.is_active !== undefined ? data.is_active : true,
            })
            .select("id")
            .single();
        if (error) throw error;
        return policy.id;
    }

    maskSensitiveData(data, fields) {
        if (!data || !fields || fields.length === 0) return data;

        const masked = { ...data };
        fields.forEach((field) => {
            const value = masked[field];
            if (typeof value === "string" && value.length >= 6) {
                const visibleStart = 3;
                const visibleEnd = 3;
                const maskedLength = value.length - visibleStart - visibleEnd;
                masked[field] =
                    value.substring(0, visibleStart) +
                    "*".repeat(maskedLength) +
                    value.substring(value.length - visibleEnd);
            } else if (typeof value === "string") {
                masked[field] = "*".repeat(value.length);
            }
        });
        return masked;
    }

    async getAuditTrail(clinicId, filters) {
        let query = this.supabase
            .from("audit_logs")
            .select(`
                *,
                users!audit_logs_user_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);

        if (filters?.entity_type) {
            query = query.eq("entity_type", filters.entity_type);
        }
        if (filters?.user_id) {
            query = query.eq("user_id", filters.user_id);
        }
        if (filters?.action) {
            query = query.eq("action", filters.action);
        }
        if (filters?.date_from) {
            query = query.gte("created_at", filters.date_from);
        }
        if (filters?.date_to) {
            query = query.lte("created_at", filters.date_to);
        }

        const limit = filters?.limit || 100;
        const { data, error } = await query
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    }

    async getClientIP() {
        try {
            const response = await fetch("https://api.ipify.org?format=json", {
                signal: AbortSignal.timeout(3000),
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.ip || null;
        } catch {
            return null;
        }
    }
}

export function getPrivacyService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new PrivacyService(supabase);
    return cachedService;
}
