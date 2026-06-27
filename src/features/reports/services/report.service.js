import { createClient } from "@/lib/supabase/client";

export function getReportService() {
    const supabase = createClient();

    function dateRange(period) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        switch (period) {
            case "today": return { start: new Date(y, m, d).toISOString(), end: now.toISOString() };
            case "yesterday": return { start: new Date(y, m, d - 1).toISOString(), end: new Date(y, m, d).toISOString() };
            case "week": { const sd = new Date(now); sd.setDate(d - now.getDay()); sd.setHours(0, 0, 0, 0); return { start: sd.toISOString(), end: now.toISOString() }; }
            case "month": return { start: new Date(y, m, 1).toISOString(), end: now.toISOString() };
            case "quarter": { const qs = Math.floor(m / 3) * 3; return { start: new Date(y, qs, 1).toISOString(), end: now.toISOString() }; }
            case "year": return { start: new Date(y, 0, 1).toISOString(), end: now.toISOString() };
            default: { const p = parseInt(period); if (!isNaN(p)) { const sd = new Date(now); sd.setDate(d - p); sd.setHours(0, 0, 0, 0); return { start: sd.toISOString(), end: now.toISOString() }; } return { start: new Date(0).toISOString(), end: now.toISOString() }; }
        }
    }

    async function getRevenueReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const [invoices, payments, claims] = await Promise.all([
            supabase.from("billing_invoices").select("id, total, status, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("patient_payments").select("amount, payment_method, payment_date").eq("clinic_id", clinicId).gte("payment_date", start).lte("payment_date", end),
            supabase.from("insurance_claims").select("id, total_amount, status, submission_date").eq("clinic_id", clinicId).gte("submission_date", start).lte("submission_date", end),
        ]);
        const billed = invoices.data?.reduce((s, i) => s + Number(i.total), 0) || 0;
        const collected = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const methodBreakdown = (payments.data || []).reduce((acc, p) => { acc[p.payment_method] = (acc[p.payment_method] || 0) + Number(p.amount); return acc; }, {});
        const claimsByStatus = (claims.data || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + Number(c.total_amount); return acc; }, {});
        return { total_billed: billed, total_collected: collected, outstanding: billed - collected, invoice_count: invoices.data?.length || 0, payment_count: payments.data?.length || 0, method_breakdown: methodBreakdown, claims_by_status: claimsByStatus };
    }

    async function getPatientReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const [patients, consultations, newPatientsCount] = await Promise.all([
            supabase.from("patients").select("gender").eq("clinic_id", clinicId),
            supabase.from("consultations").select("id, patient_id, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
        ]);
        const allPatients = patients.data || [];
        const genderBreakdown = allPatients.reduce((acc, p) => { acc[p.gender || "unknown"] = (acc[p.gender || "unknown"] || 0) + 1; return acc; }, {});
        return { total_patients: allPatients.length, new_patients: newPatientsCount.count || 0, total_visits: consultations.data?.length || 0, gender_breakdown: genderBreakdown };
    }

    async function getClinicalReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const { data: consultationIds } = await supabase
            .from("consultations")
            .select("id, status")
            .eq("clinic_id", clinicId)
            .gte("created_at", start)
            .lte("created_at", end);
        const ids = (consultationIds || []).map(c => c.id);
        const [diagnoses, prescriptions, labTests] = ids.length > 0 ? await Promise.all([
            supabase.from("diagnoses").select("diagnosis_code, diagnosis_name").in("consultation_id", ids),
            supabase.from("prescriptions").select("id, medicine_name").in("consultation_id", ids),
            supabase.from("investigations").select("id, test_name, status").in("consultation_id", ids),
        ]) : [{ data: [] }, { data: [] }, { data: [] }];
        const diagData = diagnoses.data || [];
        const topDiagnoses = Object.entries(diagData.reduce((acc, d) => { acc[d.diagnosis_name] = (acc[d.diagnosis_name] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { total_consultations: consultationIds?.length || 0, completed: (consultationIds || []).filter(c => c.status === "completed").length || 0, total_prescriptions: prescriptions.data?.length || 0, total_lab_orders: labTests.data?.length || 0, pending_labs: labTests.data?.filter(l => l.status === "pending").length || 0, top_diagnoses: topDiagnoses.map(([name, count]) => ({ name, count })) };
    }

    async function getPharmacyReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const [dispensations, inventory, batches] = await Promise.all([
            supabase.from("dispensations").select("id, medicine_name, quantity_dispensed, dispensed_at").eq("clinic_id", clinicId).gte("dispensed_at", start).lte("dispensed_at", end),
            supabase.from("inventory_items").select("id, name, current_stock, minimum_stock, unit, selling_price").eq("clinic_id", clinicId),
            supabase.from("inventory_batches").select("id, inventory_item_id, batch_number, quantity, expiry_date").eq("clinic_id", clinicId).lte("expiry_date", new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]),
        ]);
        const dispensed = dispensations.data || [];
        const lowStock = (inventory.data || []).filter(i => i.current_stock <= i.minimum_stock);
        const nearExpiry = batches.data || [];
        const topDispensed = Object.entries(dispensed.reduce((acc, d) => { acc[d.medicine_name] = (acc[d.medicine_name] || 0) + d.quantity_dispensed; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const inventoryValue = (inventory.data || []).reduce((s, i) => s + (i.current_stock || 0) * (i.selling_price || 0), 0);
        return { total_dispensed: dispensed.reduce((s, d) => s + d.quantity_dispensed, 0), dispensed_count: dispensed.length, low_stock_count: lowStock.length, near_expiry_count: nearExpiry.length, inventory_value: inventoryValue, top_dispensed: topDispensed.map(([name, qty]) => ({ name, quantity: qty })), low_stock_items: lowStock.map(i => ({ name: i.name, stock: i.current_stock, min: i.minimum_stock, unit: i.unit })) };
    }

    async function getProviderReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const consData = await supabase.from("consultations").select("id, doctor_id, status, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end);
        const consultations = consData.data || [];
        const doctorIds = [...new Set(consultations.map(c => c.doctor_id).filter(Boolean))];
        const doctors = doctorIds.length > 0 ? (await supabase.from("users").select("id, full_name").in("id", doctorIds)).data || [] : [];
        const docMap = Object.fromEntries(doctors.map(d => [d.id, d.full_name || "Unknown"]));
        const byDoctor = consultations.reduce((acc, c) => {
            const id = c.doctor_id || "unassigned";
            if (!acc[id]) acc[id] = { doctor_name: docMap[id] || "Unassigned", total: 0, completed: 0 };
            acc[id].total++;
            if (c.status === "completed") acc[id].completed++;
            return acc;
        }, {});
        return { providers: Object.values(byDoctor).sort((a, b) => b.total - a.total) };
    }

    async function getInsuranceReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const data = await supabase.from("insurance_claims").select("id, provider, total_amount, status, submission_date, rejection_reason").eq("clinic_id", clinicId).gte("submission_date", start).lte("submission_date", end);
        const claims = data.data || [];
        const byStatus = claims.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
        const byProvider = claims.reduce((acc, c) => {
            if (!acc[c.provider]) acc[c.provider] = { submitted: 0, paid: 0, rejected: 0, pending: 0, total: 0 };
            acc[c.provider].total += Number(c.total_amount);
            acc[c.provider].submitted++;
            if (c.status === "paid") { acc[c.provider].paid++; acc[c.provider].paid_amount = (acc[c.provider].paid_amount || 0) + Number(c.total_amount); }
            if (c.status === "rejected") acc[c.provider].rejected++;
            if (c.status === "pending" || c.status === "submitted") acc[c.provider].pending++;
            return acc;
        }, {});
        return { total_claims: claims.length, total_amount: claims.reduce((s, c) => s + Number(c.total_amount), 0), paid_amount: claims.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.total_amount), 0), pending_amount: claims.filter(c => c.status === "pending" || c.status === "submitted").reduce((s, c) => s + Number(c.total_amount), 0), by_status: byStatus, by_provider: Object.entries(byProvider).map(([name, data]) => ({ provider: name, ...data })) };
    }

    return { getRevenueReport, getPatientReport, getClinicalReport, getPharmacyReport, getProviderReport, getInsuranceReport };
}
