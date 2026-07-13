import { createClient } from "@/lib/supabase/client";

export function getReportService() {
    const supabase = createClient();

    function dateRange(period) {
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (period && typeof period === "object" && period.start && period.end) {
            return { start: fmt(new Date(period.start)), end: fmt(new Date(period.end)) };
        }
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        const today = fmt(now);
        const fmtDate = (yr, mo, dy) => `${yr}-${String(mo + 1).padStart(2, "0")}-${String(dy).padStart(2, "0")}`;
        switch (period) {
            case "today": return { start: fmtDate(y, m, d), end: today };
            case "yesterday": { const yesterday = new Date(y, m, d - 1); return { start: fmt(yesterday), end: fmtDate(y, m, d) }; }
            case "week": { const sd = new Date(now); sd.setDate(d - now.getDay()); return { start: fmt(sd), end: today }; }
            case "month": return { start: fmtDate(y, m, 1), end: today };
            case "quarter": { const qs = Math.floor(m / 3) * 3; return { start: fmtDate(y, qs, 1), end: today }; }
            case "year": return { start: fmtDate(y, 0, 1), end: today };
            default: { const p = parseInt(period); if (!isNaN(p)) { const sd = new Date(now); sd.setDate(d - p); return { start: fmt(sd), end: today }; } return { start: "2000-01-01", end: today }; }
        }
    }

    function previousPeriod(start, end) {
        const s = new Date(start);
        const e = new Date(end);
        const diff = e.getTime() - s.getTime();
        return { start: new Date(s.getTime() - diff).toISOString(), end: s.toISOString() };
    }

    async function getOverviewReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const prev = previousPeriod(start, end);

        const [patientCount, newPatients, appointments, consultations, revenue, expenses, radiologyOrders, lowStock] = await Promise.all([
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("appointments").select("id, status, appointment_date").eq("clinic_id", clinicId).gte("appointment_date", start.split("T")[0]).lte("appointment_date", end.split("T")[0]),
            supabase.from("consultations").select("id, status, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("patient_payments").select("amount").eq("clinic_id", clinicId).gte("payment_date", start).lte("payment_date", end),
            supabase.from("clinic_expenses").select("amount, category").eq("clinic_id", clinicId).gte("expense_date", start.split("T")[0]).lte("expense_date", end.split("T")[0]),
            supabase.from("radiology_orders").select("id, status").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).filter("current_stock", "lte", "minimum_stock"),
        ]);

        const totalRevenue = (revenue.data || []).reduce((s, p) => s + Number(p.amount), 0) || 0;
        const totalExpenses = (expenses.data || []).reduce((s, e) => s + Number(e.amount), 0) || 0;
        const appts = appointments.data || [];
        const completed = appts.filter(a => a.status === "completed").length;
        const noShows = appts.filter(a => a.status === "no_show").length;
        const cancelled = appts.filter(a => a.status === "cancelled").length;

        return {
            total_patients: patientCount.count || 0,
            new_patients: newPatients.count || 0,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            net_income: totalRevenue - totalExpenses,
            appointments_total: appts.length,
            appointments_completed: completed,
            appointments_no_show: noShows,
            appointments_cancelled: cancelled,
            consultation_count: consultations.data?.length || 0,
            consultation_completed: (consultations.data || []).filter(c => c.status === "completed").length,
            radiology_ordered: (radiologyOrders.data || []).filter(o => o.status === "ordered").length,
            radiology_completed: (radiologyOrders.data || []).filter(o => o.status === "completed").length,
            low_stock_items: lowStock.count || 0,
            expense_categories: Object.entries((expenses.data || []).reduce((acc, e) => { acc[e.category || "other"] = (acc[e.category || "other"] || 0) + Number(e.amount); return acc; }, {})).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
        };
    }

    async function getTrendReport(clinicId, period = "30") {
        const { start, end } = dateRange(period);
        const [payments, visits, expenses] = await Promise.all([
            supabase.from("patient_payments").select("amount, payment_date").eq("clinic_id", clinicId).gte("payment_date", start).lte("payment_date", end),
            supabase.from("consultations").select("created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("clinic_expenses").select("amount, expense_date").eq("clinic_id", clinicId).gte("expense_date", start.split("T")[0]).lte("expense_date", end.split("T")[0]),
        ]);

        const days = {};
        const d1 = new Date(start);
        const d2 = new Date(end);
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split("T")[0];
            days[key] = { date: key, revenue: 0, visits: 0, expenses: 0 };
        }

        (payments.data || []).forEach(p => {
            const key = p.payment_date?.split("T")[0];
            if (days[key]) days[key].revenue += Number(p.amount);
        });
        (visits.data || []).forEach(v => {
            const key = v.created_at?.split("T")[0];
            if (days[key]) days[key].visits++;
        });
        (expenses.data || []).forEach(e => {
            const key = e.expense_date;
            if (days[key]) days[key].expenses += Number(e.amount);
        });

        return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
    }

    async function getRevenueReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const prev = previousPeriod(start, end);

        const [invoices, payments, claims, prevPayments] = await Promise.all([
            supabase.from("billing_invoices").select("id, total, status, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("patient_payments").select("amount, payment_method, payment_date").eq("clinic_id", clinicId).gte("payment_date", start).lte("payment_date", end),
            supabase.from("insurance_claims").select("id, total_amount, status, submission_date").eq("clinic_id", clinicId).gte("submission_date", start).lte("submission_date", end),
            supabase.from("patient_payments").select("amount").eq("clinic_id", clinicId).gte("payment_date", prev.start).lte("payment_date", prev.end),
        ]);

        const billed = invoices.data?.reduce((s, i) => s + Number(i.total), 0) || 0;
        const collected = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const prevCollected = prevPayments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const trend = prevCollected > 0 ? ((collected - prevCollected) / prevCollected) * 100 : null;
        const methodBreakdown = (payments.data || []).reduce((acc, p) => { acc[p.payment_method] = (acc[p.payment_method] || 0) + Number(p.amount); return acc; }, {});
        const claimsByStatus = (claims.data || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + Number(c.total_amount); return acc; }, {});

        return { total_billed: billed, total_collected: collected, outstanding: billed - collected, invoice_count: invoices.data?.length || 0, payment_count: payments.data?.length || 0, method_breakdown: methodBreakdown, claims_by_status: claimsByStatus, trend };
    }

    async function getPatientReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const [patients, consultations, newPatientsCount] = await Promise.all([
            supabase.from("patients").select("gender, date_of_birth, created_at").eq("clinic_id", clinicId),
            supabase.from("consultations").select("id, patient_id, created_at").eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
            supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", start).lte("created_at", end),
        ]);
        const allPatients = patients.data || [];
        const genderBreakdown = allPatients.reduce((acc, p) => { acc[p.gender || "unknown"] = (acc[p.gender || "unknown"] || 0) + 1; return acc; }, {});

        const now = new Date();
        const ageGroups = { "0-5": 0, "6-17": 0, "18-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };
        allPatients.forEach(p => {
            if (!p.date_of_birth) return;
            const age = Math.floor((now - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
            if (age <= 5) ageGroups["0-5"]++;
            else if (age <= 17) ageGroups["6-17"]++;
            else if (age <= 35) ageGroups["18-35"]++;
            else if (age <= 50) ageGroups["36-50"]++;
            else if (age <= 65) ageGroups["51-65"]++;
            else ageGroups["65+"]++;
        });

        return {
            total_patients: allPatients.length,
            new_patients: newPatientsCount.count || 0,
            total_visits: consultations.data?.length || 0,
            gender_breakdown: genderBreakdown,
            age_distribution: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
        };
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
            supabase.from("diagnoses").select("diagnosis_code, description").in("consultation_id", ids),
            supabase.from("prescriptions").select("id, medicine_name").in("consultation_id", ids),
            supabase.from("investigations").select("id, test_name, status").in("consultation_id", ids),
        ]) : [{ data: [] }, { data: [] }, { data: [] }];
        const diagData = diagnoses.data || [];
        const topDiagnoses = Object.entries(diagData.reduce((acc, d) => { acc[d.description] = (acc[d.description] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return { total_consultations: consultationIds?.length || 0, completed: (consultationIds || []).filter(c => c.status === "completed").length || 0, total_prescriptions: prescriptions.data?.length || 0, total_lab_orders: labTests.data?.length || 0, pending_labs: labTests.data?.filter(l => l.status === "pending" || l.status === "ordered").length || 0, top_diagnoses: topDiagnoses.map(([name, count]) => ({ name, count })) };
    }

    async function getPharmacyReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const [dispensations, inventory, batches] = await Promise.all([
            supabase.from("dispensations").select("id, medicine_name, quantity_dispensed, dispensed_at").eq("clinic_id", clinicId).gte("dispensed_at", start).lte("dispensed_at", end),
            supabase.from("inventory_items").select("id, name, current_stock, minimum_stock, unit, selling_price, cost_price").eq("clinic_id", clinicId),
            supabase.from("inventory_batches").select("id, inventory_item_id, batch_number, quantity, expiry_date").eq("clinic_id", clinicId).lte("expiry_date", new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]),
        ]);
        const dispensed = dispensations.data || [];
        const items = inventory.data || [];
        const lowStock = items.filter(i => i.current_stock <= i.minimum_stock);
        const nearExpiry = batches.data || [];
        const topDispensed = Object.entries(dispensed.reduce((acc, d) => { acc[d.medicine_name] = (acc[d.medicine_name] || 0) + d.quantity_dispensed; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const inventoryValue = items.reduce((s, i) => s + (i.current_stock || 0) * (i.selling_price || 0), 0);
        const inventoryCost = items.reduce((s, i) => s + (i.current_stock || 0) * (i.cost_price || 0), 0);
        return {
            total_dispensed: dispensed.reduce((s, d) => s + d.quantity_dispensed, 0),
            dispensed_count: dispensed.length,
            low_stock_count: lowStock.length,
            near_expiry_count: nearExpiry.length,
            inventory_value: inventoryValue,
            inventory_cost: inventoryCost,
            top_dispensed: topDispensed.map(([name, qty]) => ({ name, quantity: qty })),
            low_stock_items: lowStock.map(i => ({ name: i.name, stock: i.current_stock, min: i.minimum_stock, unit: i.unit })),
        };
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

    async function getAppointmentsReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const { data: appts } = await supabase
            .from("appointments")
            .select("id, status, appointment_date, appointment_time, appointment_type, created_at")
            .eq("clinic_id", clinicId)
            .gte("appointment_date", start.split("T")[0])
            .lte("appointment_date", end.split("T")[0]);

        const all = appts || [];
        const byStatus = all.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
        const byType = all.reduce((acc, a) => { acc[a.appointment_type || "general"] = (acc[a.appointment_type || "general"] || 0) + 1; return acc; }, {});
        const byHour = all.reduce((acc, a) => {
            const h = a.appointment_time?.split(":")[0];
            if (h) acc[h] = (acc[h] || 0) + 1;
            return acc;
        }, {});
        const byDay = all.reduce((acc, a) => {
            const day = new Date(a.appointment_date).toLocaleDateString("en-US", { weekday: "short" });
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        const completed = byStatus.completed || 0;
        const noShows = byStatus.no_show || 0;
        const total = all.length;

        return {
            total: total,
            completed,
            no_shows: noShows,
            cancelled: byStatus.cancelled || 0,
            scheduled: byStatus.scheduled || 0,
            no_show_rate: total > 0 ? ((noShows / total) * 100).toFixed(1) : 0,
            completion_rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
            by_status: Object.entries(byStatus).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            by_type: Object.entries(byType).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            by_hour: Object.entries(byHour).map(([hour, count]) => ({ hour: `${hour}:00`, count })).sort((a, b) => a.hour.localeCompare(b.hour)),
            by_day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({ day: d, count: byDay[d] || 0 })),
        };
    }

    async function getRadiologyReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const { data: orders } = await supabase
            .from("radiology_orders")
            .select("id, modality, status, body_part, urgency, created_at")
            .eq("clinic_id", clinicId)
            .gte("created_at", start)
            .lte("created_at", end);

        const all = orders || [];
        const byModality = all.reduce((acc, o) => { acc[o.modality] = (acc[o.modality] || 0) + 1; return acc; }, {});
        const byStatus = all.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
        const byBodyPart = all.reduce((acc, o) => { acc[o.body_part] = (acc[o.body_part] || 0) + 1; return acc; }, {});

        return {
            total_orders: all.length,
            urgent_count: all.filter(o => o.urgency === "urgent" || o.urgency === "stat").length,
            completed: byStatus.completed || 0,
            pending: (byStatus.ordered || 0) + (byStatus.scheduled || 0) + (byStatus.imaging_done || 0),
            by_modality: Object.entries(byModality).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            by_status: Object.entries(byStatus).map(([name, count]) => ({ name: name.replace(/_/g, " "), count })).sort((a, b) => b.count - a.count),
            by_body_part: Object.entries(byBodyPart).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        };
    }

    async function getExpenseReport(clinicId, period = "today") {
        const { start, end } = dateRange(period);
        const { data: expenses } = await supabase
            .from("clinic_expenses")
            .select("id, description, amount, category, expense_date, created_at")
            .eq("clinic_id", clinicId)
            .gte("expense_date", start.split("T")[0])
            .lte("expense_date", end.split("T")[0]);

        const all = expenses || [];
        const total = all.reduce((s, e) => s + Number(e.amount), 0);
        const byCategory = all.reduce((acc, e) => { acc[e.category || "other"] = (acc[e.category || "other"] || 0) + Number(e.amount); return acc; }, {});
        const topExpenses = [...all].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 10);

        return {
            total_expenses: total,
            count: all.length,
            by_category: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
            top_expenses: topExpenses.map(e => ({ description: e.description, amount: Number(e.amount), category: e.category, date: e.expense_date })),
        };
    }

    function exportToCSV(data, filename) {
        if (!data || data.length === 0) return "";
        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(","),
            ...data.map(row => headers.map(h => {
                const val = row[h];
                const str = String(val ?? "");
                return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(","))
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return csv;
    }

    return {
        getOverviewReport, getTrendReport, getRevenueReport, getPatientReport,
        getClinicalReport, getPharmacyReport, getProviderReport, getInsuranceReport,
        getAppointmentsReport, getRadiologyReport, getExpenseReport, exportToCSV,
    };
}
