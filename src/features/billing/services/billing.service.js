import { createClient } from "@/lib/supabase/client";

let cachedService = null;

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
                patient_payments(*)
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

        const { data: paymentsByInvoiceRaw } = await this.supabase
            .from("patient_payments")
            .select("invoice_id, amount")
            .eq("clinic_id", clinicId)
            .gte("payment_date", dateFrom)
            .lte("payment_date", dateTo);

        const paidByInvoice = {};
        (paymentsByInvoiceRaw || []).forEach(p => {
            paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] || 0) + parseFloat(p.amount);
        });

        const outstanding = invs
            .filter(i => i.status !== "paid" && i.status !== "cancelled" && i.status !== "refunded")
            .reduce((s, i) => {
                const paid = paidByInvoice[i.id] || 0;
                return s + Math.max(0, parseFloat(i.total) - paid);
            }, 0);

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

    async searchPatientsWithOutstanding(clinicId, search) {
        if (!search || search.trim().length < 2) return [];

        const trimmed = search.trim();

        const { data: patients, error: patientError } = await this.supabase
            .from("patients")
            .select("id, full_name, phone")
            .eq("clinic_id", clinicId)
            .or(`full_name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
            .order("full_name")
            .limit(20);
        if (patientError) throw patientError;
        if (!patients || patients.length === 0) return [];

        const patientIds = patients.map(p => p.id);

        const { data: invoices, error: invError } = await this.supabase
            .from("billing_invoices")
            .select("id, invoice_number, created_at, total, status, patient_id")
            .eq("clinic_id", clinicId)
            .in("patient_id", patientIds)
            .in("status", ["issued", "partially_paid"])
            .order("created_at", { ascending: false });
        if (invError) throw invError;

        const { data: allPayments } = await this.supabase
            .from("patient_payments")
            .select("invoice_id, amount")
            .eq("clinic_id", clinicId)
            .in("invoice_id", (invoices || []).map(i => i.id));

        const paymentsByInvoice = {};
        (allPayments || []).forEach(p => {
            if (!paymentsByInvoice[p.invoice_id]) paymentsByInvoice[p.invoice_id] = 0;
            paymentsByInvoice[p.invoice_id] += parseFloat(p.amount);
        });

        const invoicesByPatient = {};
        (invoices || []).forEach(inv => {
            if (!invoicesByPatient[inv.patient_id]) invoicesByPatient[inv.patient_id] = [];
            const paid = paymentsByInvoice[inv.id] || 0;
            invoicesByPatient[inv.patient_id].push({
                id: inv.id,
                invoice_number: inv.invoice_number,
                created_at: inv.created_at,
                total: parseFloat(inv.total),
                paid,
                outstanding: parseFloat(inv.total) - paid,
                status: inv.status,
            });
        });

        return patients
            .filter(p => invoicesByPatient[p.id]?.length > 0)
            .map(p => ({
                ...p,
                outstanding_count: invoicesByPatient[p.id].length,
                outstanding_total: invoicesByPatient[p.id].reduce((s, i) => s + i.outstanding, 0),
                invoices: invoicesByPatient[p.id],
            }));
    }

    async searchPatientsByInvoice(clinicId, invoiceNumber) {
        if (!invoiceNumber || invoiceNumber.trim().length < 3) return [];

        const { data: invoices, error: invError } = await this.supabase
            .from("billing_invoices")
            .select("id, invoice_number, created_at, total, status, patient_id")
            .eq("clinic_id", clinicId)
            .ilike("invoice_number", `%${invoiceNumber.trim()}%`)
            .in("status", ["issued", "partially_paid"])
            .order("created_at", { ascending: false });
        if (invError) throw invError;
        if (!invoices || invoices.length === 0) return [];

        const patientIds = [...new Set(invoices.map(i => i.patient_id))];
        const { data: patients } = await this.supabase
            .from("patients")
            .select("id, full_name, phone")
            .in("id", patientIds);

        const patientMap = {};
        (patients || []).forEach(p => patientMap[p.id] = p);

        const { data: allPayments } = await this.supabase
            .from("patient_payments")
            .select("invoice_id, amount")
            .eq("clinic_id", clinicId)
            .in("invoice_id", invoices.map(i => i.id));

        const paymentsByInvoice = {};
        (allPayments || []).forEach(p => {
            if (!paymentsByInvoice[p.invoice_id]) paymentsByInvoice[p.invoice_id] = 0;
            paymentsByInvoice[p.invoice_id] += parseFloat(p.amount);
        });

        const grouped = {};
        invoices.forEach(inv => {
            const paid = paymentsByInvoice[inv.id] || 0;
            const patient = patientMap[inv.patient_id];
            if (!patient) return;
            if (!grouped[inv.patient_id]) {
                grouped[inv.patient_id] = { ...patient, invoices: [], outstanding_count: 0, outstanding_total: 0 };
            }
            const outstanding = parseFloat(inv.total) - paid;
            grouped[inv.patient_id].invoices.push({
                id: inv.id,
                invoice_number: inv.invoice_number,
                created_at: inv.created_at,
                total: parseFloat(inv.total),
                paid,
                outstanding,
                status: inv.status,
            });
            grouped[inv.patient_id].outstanding_count++;
            grouped[inv.patient_id].outstanding_total += outstanding;
        });

        return Object.values(grouped);
    }

    async getDailyPayments(clinicId) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        const { data: payments, error } = await this.supabase
            .from("patient_payments")
            .select(`
                *,
                patients(id, full_name, phone),
                billing_invoices(invoice_number)
            `)
            .eq("clinic_id", clinicId)
            .gte("payment_date", startOfDay)
            .lte("payment_date", endOfDay)
            .order("payment_date", { ascending: false });
        if (error) throw error;

        const pays = payments || [];
        const totalCollected = pays.reduce((s, p) => s + parseFloat(p.amount), 0);

        const methodBreakdown = {};
        pays.forEach(p => {
            const method = p.payment_method || "unknown";
            if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, total: 0 };
            methodBreakdown[method].count++;
            methodBreakdown[method].total += parseFloat(p.amount);
        });

        return {
            payments: pays,
            total_collected: totalCollected,
            payment_count: pays.length,
            method_breakdown: methodBreakdown,
        };
    }

    async getPatientInsurance(clinicId, patientId) {
        const { data, error } = await this.supabase
            .from("patient_insurance")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .eq("status", "active")
            .order("is_primary", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async updatePatientInsurance(clinicId, patientId, insuranceData) {
        const { data: existing } = await this.supabase
            .from("patient_insurance")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("patient_id", patientId)
            .eq("is_primary", true)
            .maybeSingle();

        if (existing) {
            const { error } = await this.supabase
                .from("patient_insurance")
                .update({
                    provider: insuranceData.insurance_provider,
                    policy_number: insuranceData.insurance_policy_number,
                    member_name: insuranceData.insurance_member_name,
                    coverage_type: insuranceData.insurance_coverage || "basic",
                    valid_from: insuranceData.insurance_valid_from,
                    valid_until: insuranceData.insurance_valid_until,
                    relationship: insuranceData.insurance_relationship,
                })
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            const { error } = await this.supabase
                .from("patient_insurance")
                .insert({
                    clinic_id: clinicId,
                    patient_id: patientId,
                    provider: insuranceData.insurance_provider,
                    policy_number: insuranceData.insurance_policy_number,
                    member_name: insuranceData.insurance_member_name,
                    coverage_type: insuranceData.insurance_coverage || "basic",
                    valid_from: insuranceData.insurance_valid_from,
                    valid_until: insuranceData.insurance_valid_until,
                    relationship: insuranceData.insurance_relationship,
                    is_primary: true,
                    status: "active",
                });
            if (error) throw error;
        }
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
