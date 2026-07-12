import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class ComplianceService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getStaffCredentials(clinicId) {
        const { data, error } = await this.supabase
            .from("staff_credentials")
            .select(`
                *,
                users!staff_credentials_staff_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .order("expiry_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getStaffCredentialsByStaff(clinicId, staffId) {
        const { data, error } = await this.supabase
            .from("staff_credentials")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("staff_id", staffId)
            .order("expiry_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createStaffCredential(clinicId, data) {
        const { data: credential, error } = await this.supabase
            .from("staff_credentials")
            .insert({
                clinic_id: clinicId,
                staff_id: data.staff_id,
                credential_type: data.credential_type,
                credential_name: data.credential_name,
                issuing_authority: data.issuing_authority || null,
                credential_number: data.credential_number || null,
                issue_date: data.issue_date || null,
                expiry_date: data.expiry_date || null,
                document_url: data.document_url || null,
                status: data.status || "active",
            })
            .select("id")
            .single();
        if (error) throw error;
        return credential.id;
    }

    async updateStaffCredential(clinicId, credentialId, data) {
        const { error } = await this.supabase
            .from("staff_credentials")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", credentialId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteStaffCredential(clinicId, credentialId) {
        const { error } = await this.supabase
            .from("staff_credentials")
            .delete()
            .eq("id", credentialId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getExpiringCredentials(clinicId, withinDays = 30) {
        const today = new Date().toISOString().split("T")[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + withinDays);
        const futureDateStr = futureDate.toISOString().split("T")[0];

        const { data, error } = await this.supabase
            .from("staff_credentials")
            .select(`
                *,
                users!staff_credentials_staff_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .not("expiry_date", "is", null)
            .lte("expiry_date", futureDateStr)
            .gte("expiry_date", today)
            .order("expiry_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getCredentialComplianceStatus(clinicId) {
        const { count: totalStaff } = await this.supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", clinicId)
            .eq("status", "active");

        const today = new Date().toISOString().split("T")[0];
        const { data: activeCredentials } = await this.supabase
            .from("staff_credentials")
            .select("staff_id")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .or(`expiry_date.is.null,expiry_date.gte.${today}`);

        const uniqueStaffWithCredentials = new Set(
            (activeCredentials || []).map((c) => c.staff_id)
        );

        const total = totalStaff || 0;
        const compliant = uniqueStaffWithCredentials.size;
        const percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;

        return {
            total_staff: total,
            staff_with_active_credentials: compliant,
            compliance_percentage: percentage,
        };
    }

    async getIPCLogs(clinicId, filters) {
        let query = this.supabase
            .from("ipc_logs")
            .select(`
                *,
                users!ipc_logs_performed_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);

        if (filters?.date_from) {
            query = query.gte("log_date", filters.date_from);
        }
        if (filters?.date_to) {
            query = query.lte("log_date", filters.date_to);
        }
        if (filters?.ipc_type) {
            query = query.eq("ipc_type", filters.ipc_type);
        }

        const { data, error } = await query.order("log_date", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createIPCLog(clinicId, data, userId) {
        const { data: log, error } = await this.supabase
            .from("ipc_logs")
            .insert({
                clinic_id: clinicId,
                ipc_type: data.ipc_type,
                log_date: data.log_date || new Date().toISOString().split("T")[0],
                area: data.area || null,
                description: data.description || null,
                performed_by: userId,
                status: data.status || "completed",
                notes: data.notes || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return log.id;
    }

    async getIPCComplianceRate(clinicId, month, year) {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const { data: expected } = await this.supabase
            .from("ipc_schedules")
            .select("ipc_type, frequency")
            .eq("clinic_id", clinicId);

        const { data: completed } = await this.supabase
            .from("ipc_logs")
            .select("ipc_type, log_date")
            .eq("clinic_id", clinicId)
            .gte("log_date", startDate)
            .lte("log_date", endDate)
            .eq("status", "completed");

        const expectedCount = (expected || []).length || 1;
        const completedCount = (completed || []).length;
        const percentage = Math.min(100, Math.round((completedCount / expectedCount) * 100));

        return {
            month,
            year,
            expected_count: expectedCount,
            completed_count: completedCount,
            compliance_rate: percentage,
        };
    }

    async getEquipmentMaintenance(clinicId) {
        const { data, error } = await this.supabase
            .from("equipment_maintenance")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("next_maintenance_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createEquipmentMaintenance(clinicId, data) {
        const { data: equipment, error } = await this.supabase
            .from("equipment_maintenance")
            .insert({
                clinic_id: clinicId,
                equipment_name: data.equipment_name,
                equipment_id_tag: data.equipment_id_tag || null,
                category: data.category || null,
                last_maintenance_date: data.last_maintenance_date || null,
                next_maintenance_date: data.next_maintenance_date,
                maintenance_type: data.maintenance_type || null,
                vendor: data.vendor || null,
                status: data.status || "scheduled",
                notes: data.notes || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return equipment.id;
    }

    async updateEquipmentMaintenance(clinicId, id, data) {
        const { error } = await this.supabase
            .from("equipment_maintenance")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getOverdueMaintenance(clinicId) {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await this.supabase
            .from("equipment_maintenance")
            .select("*")
            .eq("clinic_id", clinicId)
            .not("next_maintenance_date", "is", null)
            .lt("next_maintenance_date", today)
            .neq("status", "completed")
            .order("next_maintenance_date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async getComplianceReports(clinicId, type) {
        let query = this.supabase
            .from("compliance_reports")
            .select(`
                *,
                users!compliance_reports_created_by_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId);
        if (type) {
            query = query.eq("report_type", type);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createComplianceReport(clinicId, data, userId) {
        const { data: report, error } = await this.supabase
            .from("compliance_reports")
            .insert({
                clinic_id: clinicId,
                report_type: data.report_type,
                title: data.title,
                description: data.description || null,
                report_data: data.report_data || {},
                status: "draft",
                created_by: userId,
            })
            .select("id")
            .single();
        if (error) throw error;
        return report.id;
    }

    async submitComplianceReport(clinicId, reportId) {
        const { error } = await this.supabase
            .from("compliance_reports")
            .update({
                status: "submitted",
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", reportId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getAccreditationItems(clinicId) {
        const { data, error } = await this.supabase
            .from("accreditation_items")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("category", { ascending: true })
            .order("item_order", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async updateAccreditationItem(clinicId, itemId, data) {
        const { error } = await this.supabase
            .from("accreditation_items")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", itemId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getAccreditationScore(clinicId) {
        const { data: items, error } = await this.supabase
            .from("accreditation_items")
            .select("status")
            .eq("clinic_id", clinicId);
        if (error) throw error;

        const all = items || [];
        const total = all.length;
        const met = all.filter((i) => i.status === "met").length;
        const percentage = total > 0 ? Math.round((met / total) * 100) : 0;

        return {
            total_items: total,
            items_met: met,
            score_percentage: percentage,
        };
    }

    async getComplianceDashboard(clinicId) {
        const [
            credentialStatus,
            accreditationScore,
            overdueMaintenance,
            expiringCredentials,
            pendingReports,
        ] = await Promise.all([
            this.getCredentialComplianceStatus(clinicId),
            this.getAccreditationScore(clinicId),
            this.getOverdueMaintenance(clinicId),
            this.getExpiringCredentials(clinicId, 30),
            this.supabase
                .from("compliance_reports")
                .select("id", { count: "exact", head: true })
                .eq("clinic_id", clinicId)
                .eq("status", "draft"),
        ]);

        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const ipcRate = await this.getIPCComplianceRate(clinicId, month, year);

        return {
            credential_compliance_percentage: credentialStatus.compliance_percentage,
            ipc_compliance_rate: ipcRate.compliance_rate,
            accreditation_score: accreditationScore.score_percentage,
            overdue_maintenance_count: overdueMaintenance.length,
            expiring_credentials_count: expiringCredentials.length,
            pending_reports_count: pendingReports.count || 0,
        };
    }
}

export function getComplianceService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new ComplianceService(supabase);
    return cachedService;
}
