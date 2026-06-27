import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export const INSURANCE_SPLITS = {
  RSSB_RAMA: { patient: 15, insurer: 85, label: "RSSB RAMA (15/85)" },
  MMI: { patient: 10, insurer: 90, label: "MMI (10/90)" },
};

export class BillingService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getServiceCatalog(clinicId, category = null) {
        let query = this.supabase
            .from("service_catalog")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("is_active", true);
        if (category) query = query.eq("category", category);
        const { data, error } = await query.order("name");
        if (error) throw error;
        return data || [];
    }

    async addServiceToCatalog(clinicId, item) {
        const { data, error } = await this.supabase
            .from("service_catalog")
            .insert({ clinic_id: clinicId, ...item })
            .select("id")
            .single();
        if (error) throw error;
        return data.id;
    }

    async getInvoicesForConsultation(clinicId, consultationId) {
        const { data, error } = await this.supabase
            .from("billing_invoices")
            .select(`
                *,
                billing_line_items(*),
                patient_payments(*),
                insurance_claims(*)
            `)
            .eq("clinic_id", clinicId)
            .eq("consultation_id", consultationId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async generateInvoiceNumber() {
        const { data, error } = await this.supabase
            .rpc("generate_billing_invoice_number");
        if (error) throw error;
        return data;
    }

    async createInvoice(clinicId, data, userId) {
        const invoiceNumber = await this.generateInvoiceNumber();
        const { data: invoice, error } = await this.supabase
            .from("billing_invoices")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                consultation_id: data.consultation_id || null,
                invoice_number: invoiceNumber,
                subtotal: data.subtotal || 0,
                tax: data.tax || 0,
                total: data.total || 0,
                status: "issued",
                notes: data.notes || null,
                created_by: userId,
                issued_at: new Date().toISOString(),
            })
            .select("id")
            .single();
        if (error) throw error;

        if (data.items?.length > 0) {
            const { error: itemsError } = await this.supabase
                .from("billing_line_items")
                .insert(data.items.map(item => ({
                    invoice_id: invoice.id,
                    description: item.description,
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price,
                    total: (item.quantity || 1) * item.unit_price,
                    service_catalog_id: item.service_catalog_id || null,
                })));
            if (itemsError) {
                await this.supabase.from("billing_invoices").delete().eq("id", invoice.id);
                throw itemsError;
            }
        }

        return invoice.id;
    }

    async getInvoices(clinicId, filters = {}) {
        let query = this.supabase
            .from("billing_invoices")
            .select(`
                *,
                patients(id, full_name, phone),
                billing_line_items(*)
            `)
            .eq("clinic_id", clinicId);

        if (filters.status) query = query.eq("status", filters.status);
        if (filters.patientId) query = query.eq("patient_id", filters.patientId);
        if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
        if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async recordPayment(clinicId, data, userId) {
        const { data: payment, error } = await this.supabase
            .from("patient_payments")
            .insert({
                clinic_id: clinicId,
                invoice_id: data.invoice_id || null,
                patient_id: data.patient_id,
                amount: data.amount,
                payment_method: data.payment_method,
                transaction_reference: data.transaction_reference || null,
                notes: data.notes || null,
                received_by: userId,
            })
            .select("id")
            .single();
        if (error) throw error;

        if (data.invoice_id) {
            await this.recalculateInvoiceStatus(clinicId, data.invoice_id);
        }

        return payment.id;
    }

    async recalculateInvoiceStatus(clinicId, invoiceId) {
        const { data: invoice } = await this.supabase
            .from("billing_invoices")
            .select("total")
            .eq("id", invoiceId)
            .eq("clinic_id", clinicId)
            .single();

        if (!invoice) return;

        const { data: payments } = await this.supabase
            .from("patient_payments")
            .select("amount")
            .eq("invoice_id", invoiceId);

        const paid = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const total = parseFloat(invoice.total);
        let status;
        if (paid >= total) status = "paid";
        else if (paid > 0) status = "partially_paid";
        else status = "issued";

        const updateData = { status };
        if (status === "paid") updateData.paid_at = new Date().toISOString();

        await this.supabase
            .from("billing_invoices")
            .update(updateData)
            .eq("id", invoiceId)
            .eq("clinic_id", clinicId);
    }

    async getFinancialSummary(clinicId, dateFrom, dateTo) {
        const { data: invoices } = await this.supabase
            .from("billing_invoices")
            .select("total, status, created_at, paid_at")
            .eq("clinic_id", clinicId)
            .gte("created_at", dateFrom)
            .lte("created_at", dateTo);

        const { data: payments } = await this.supabase
            .from("patient_payments")
            .select("amount, payment_method, payment_date, patient_id")
            .eq("clinic_id", clinicId)
            .gte("payment_date", dateFrom)
            .lte("payment_date", dateTo);

        const invs = invoices || [];
        const pays = payments || [];

        const totalBilled = invs.reduce((s, i) => s + parseFloat(i.total), 0);
        const totalCollected = pays.reduce((s, p) => s + parseFloat(p.amount), 0);
        const outstanding = invs.filter(i => i.status === "issued" || i.status === "partially_paid")
            .reduce((s, i) => s + parseFloat(i.total), 0);

        const methodBreakdown = {};
        pays.forEach(p => {
            methodBreakdown[p.payment_method] = (methodBreakdown[p.payment_method] || 0) + parseFloat(p.amount);
        });

        return {
            total_billed: totalBilled,
            total_collected: totalCollected,
            outstanding: outstanding,
            invoice_count: invs.length,
            payment_count: pays.length,
            method_breakdown: methodBreakdown,
        };
    }

    async getPatientInsurance(clinicId, patientId) {
        const { data, error } = await this.supabase
            .from("patients")
            .select("insurance_provider, insurance_policy_number, insurance_coverage, insurance_member_name, insurance_relationship, insurance_valid_from, insurance_valid_until")
            .eq("clinic_id", clinicId)
            .eq("id", patientId)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async updatePatientInsurance(clinicId, patientId, insuranceData) {
        const { error } = await this.supabase
            .from("patients")
            .update(insuranceData)
            .eq("clinic_id", clinicId)
            .eq("id", patientId);
        if (error) throw error;
    }

    async createInsuranceClaim(clinicId, data, userId) {
        const { data: claim, error } = await this.supabase
            .from("insurance_claims")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                invoice_id: data.invoice_id,
                provider: data.provider,
                policy_number: data.policy_number,
                claim_number: data.claim_number || null,
                total_amount: data.total_amount || 0,
                covered_amount: data.covered_amount || 0,
                co_pay_amount: data.co_pay_amount || 0,
                status: "draft",
                notes: data.notes || null,
                created_by: userId,
            })
            .select("id")
            .single();
        if (error) throw error;

        await this.supabase
            .from("billing_invoices")
            .update({ insurance_claim_id: claim.id })
            .eq("id", data.invoice_id)
            .eq("clinic_id", clinicId);

        return claim.id;
    }
}

export function getBillingService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new BillingService(supabase);
    return cachedService;
}
