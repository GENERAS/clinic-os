import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export class SchedulingService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async getDoctorSchedules(clinicId, doctorId) {
        const { data, error } = await this.supabase
            .from("doctor_schedules")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .order("day_of_week", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createDoctorSchedule(clinicId, data) {
        const { data: schedule, error } = await this.supabase
            .from("doctor_schedules")
            .insert({
                clinic_id: clinicId,
                doctor_id: data.doctor_id,
                day_of_week: data.day_of_week,
                start_time: data.start_time,
                end_time: data.end_time,
                slot_duration: data.slot_duration || 30,
                max_patients: data.max_patients || 20,
                is_active: data.is_active !== undefined ? data.is_active : true,
            })
            .select("id")
            .single();
        if (error) throw error;
        return schedule.id;
    }

    async updateDoctorSchedule(clinicId, scheduleId, data) {
        const { error } = await this.supabase
            .from("doctor_schedules")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", scheduleId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async deleteDoctorSchedule(clinicId, scheduleId) {
        const { error } = await this.supabase
            .from("doctor_schedules")
            .delete()
            .eq("id", scheduleId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getAvailableSlots(clinicId, doctorId, date) {
        const dayOfWeek = new Date(date + "T00:00:00").getDay();

        const { data: schedule, error: schedError } = await this.supabase
            .from("doctor_schedules")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true)
            .maybeSingle();
        if (schedError) throw schedError;
        if (!schedule) return [];

        const { data: appointments, error: apptError } = await this.supabase
            .from("appointments")
            .select("start_time, end_time, status")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .eq("appointment_date", date)
            .not("status", "in", `("cancelled","no_show")`);
        if (apptError) throw apptError;

        const slotDuration = schedule.slot_duration || 30;
        const startMinutes = this._timeToMinutes(schedule.start_time);
        const endMinutes = this._timeToMinutes(schedule.end_time);
        const booked = (appointments || []).map((a) => ({
            start: this._timeToMinutes(a.start_time),
            end: this._timeToMinutes(a.end_time),
        }));

        const { count: currentCount } = await this.supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .eq("appointment_date", date)
            .not("status", "in", `("cancelled","no_show")`);

        const maxPatients = schedule.max_patients || 20;
        const slots = [];

        for (let min = startMinutes; min + slotDuration <= endMinutes; min += slotDuration) {
            const slotEnd = min + slotDuration;
            const isBooked = booked.some((b) => min < b.end && slotEnd > b.start);
            const isFull = (currentCount || 0) >= maxPatients;
            slots.push({
                start_time: this._minutesToTime(min),
                end_time: this._minutesToTime(slotEnd),
                available: !isBooked && !isFull,
            });
        }

        return slots;
    }

    async getDoctorFacilityAssignments(clinicId, doctorId) {
        const { data, error } = await this.supabase
            .from("doctor_facility_assignments")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createFacilityAssignment(clinicId, data) {
        const { data: assignment, error } = await this.supabase
            .from("doctor_facility_assignments")
            .insert({
                clinic_id: clinicId,
                doctor_id: data.doctor_id,
                facility_name: data.facility_name,
                facility_address: data.facility_address || null,
                day_of_week: data.day_of_week,
                start_time: data.start_time,
                end_time: data.end_time,
                notes: data.notes || null,
                is_active: data.is_active !== undefined ? data.is_active : true,
            })
            .select("id")
            .single();
        if (error) throw error;
        return assignment.id;
    }

    async updateFacilityAssignment(clinicId, assignmentId, data) {
        const { error } = await this.supabase
            .from("doctor_facility_assignments")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", assignmentId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getDoctorBusyHours(clinicId, doctorId, dateFrom, dateTo) {
        const { data: assignments, error: assignError } = await this.supabase
            .from("doctor_facility_assignments")
            .select("day_of_week, start_time, end_time, facility_name")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .eq("is_active", true);
        if (assignError) throw assignError;

        const { data: appointments, error: apptError } = await this.supabase
            .from("appointments")
            .select("appointment_date, start_time, end_time, patient_name")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", doctorId)
            .gte("appointment_date", dateFrom)
            .lte("appointment_date", dateTo)
            .not("status", "in", `("cancelled","no_show")`);
        if (apptError) throw apptError;

        const busyHours = [];
        const currentDate = new Date(dateFrom + "T00:00:00");
        const endDate = new Date(dateTo + "T00:00:00");

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dateStr = currentDate.toISOString().split("T")[0];

            const facilitySlots = (assignments || []).filter((a) => a.day_of_week === dayOfWeek);
            facilitySlots.forEach((slot) => {
                busyHours.push({
                    date: dateStr,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    source: "facility_assignment",
                    facility_name: slot.facility_name,
                });
            });

            const dayAppts = (appointments || []).filter((a) => a.appointment_date === dateStr);
            dayAppts.forEach((appt) => {
                busyHours.push({
                    date: dateStr,
                    start_time: appt.start_time,
                    end_time: appt.end_time,
                    source: "appointment",
                    patient_name: appt.patient_name,
                });
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return busyHours;
    }

    async createShift(clinicId, data) {
        const { data: shift, error } = await this.supabase
            .from("shifts")
            .insert({
                clinic_id: clinicId,
                name: data.name,
                start_time: data.start_time,
                end_time: data.end_time,
                shift_type: data.shift_type || null,
                notes: data.notes || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return shift.id;
    }

    async getShifts(clinicId) {
        const { data, error } = await this.supabase
            .from("shifts")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("start_time", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async assignStaffToShift(clinicId, staffId, shiftId, date) {
        const { data: existing } = await this.supabase
            .from("staff_shift_assignments")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("staff_id", staffId)
            .eq("date", date)
            .maybeSingle();
        if (existing) {
            throw new Error("Staff member is already assigned to a shift on this date");
        }

        const { data: assignment, error } = await this.supabase
            .from("staff_shift_assignments")
            .insert({
                clinic_id: clinicId,
                staff_id: staffId,
                shift_id: shiftId,
                date: date,
                status: "assigned",
            })
            .select("id")
            .single();
        if (error) throw error;
        return assignment.id;
    }

    async getStaffShiftAssignments(clinicId, dateFrom, dateTo) {
        const { data, error } = await this.supabase
            .from("staff_shift_assignments")
            .select(`
                *,
                shifts(name, start_time, end_time, shift_type),
                users!staff_shift_assignments_staff_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .gte("date", dateFrom)
            .lte("date", dateTo)
            .order("date", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async swapShifts(clinicId, assignmentId1, assignmentId2) {
        const { data: a1, error: e1 } = await this.supabase
            .from("staff_shift_assignments")
            .select("shift_id, staff_id, date")
            .eq("id", assignmentId1)
            .eq("clinic_id", clinicId)
            .single();
        if (e1 || !a1) throw new Error("First assignment not found");

        const { data: a2, error: e2 } = await this.supabase
            .from("staff_shift_assignments")
            .select("shift_id, staff_id, date")
            .eq("id", assignmentId2)
            .eq("clinic_id", clinicId)
            .single();
        if (e2 || !a2) throw new Error("Second assignment not found");

        const { error: u1 } = await this.supabase
            .from("staff_shift_assignments")
            .update({ shift_id: a2.shift_id, staff_id: a2.staff_id, date: a2.date })
            .eq("id", assignmentId1);
        if (u1) throw u1;

        const { error: u2 } = await this.supabase
            .from("staff_shift_assignments")
            .update({ shift_id: a1.shift_id, staff_id: a1.staff_id, date: a1.date })
            .eq("id", assignmentId2);
        if (u2) throw u2;
    }

    async getQueueStatus(clinicId, date) {
        const { data, error } = await this.supabase
            .from("patient_queue")
            .select(`
                *,
                patients(id, full_name, phone),
                users!patient_queue_doctor_id_fkey(id, full_name)
            `)
            .eq("clinic_id", clinicId)
            .eq("queue_date", date)
            .order("queue_number", { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async addToQueue(clinicId, data) {
        const queueNumber = await this.getNextQueueNumber(clinicId, data.queue_date);

        const { data: entry, error } = await this.supabase
            .from("patient_queue")
            .insert({
                clinic_id: clinicId,
                patient_id: data.patient_id,
                doctor_id: data.doctor_id || null,
                queue_date: data.queue_date,
                queue_number: queueNumber,
                status: data.status || "waiting",
                priority: data.priority || "normal",
                notes: data.notes || null,
                sms_notified: false,
            })
            .select("id")
            .single();
        if (error) throw error;
        return { id: entry.id, queue_number: queueNumber };
    }

    async updateQueuePosition(clinicId, queueId, status) {
        const updates = { status };
        if (status === "in_consultation") {
            updates.started_at = new Date().toISOString();
        } else if (status === "completed") {
            updates.completed_at = new Date().toISOString();
        }
        const { error } = await this.supabase
            .from("patient_queue")
            .update(updates)
            .eq("id", queueId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getNextQueueNumber(clinicId, date) {
        const { data, error } = await this.supabase
            .from("patient_queue")
            .select("queue_number")
            .eq("clinic_id", clinicId)
            .eq("queue_date", date)
            .order("queue_number", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return (data?.queue_number || 0) + 1;
    }

    async sendQueueNotification(clinicId, queueId) {
        const { error } = await this.supabase
            .from("patient_queue")
            .update({ sms_notified: true })
            .eq("id", queueId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async getProviderRevenueSplits(clinicId) {
        const { data, error } = await this.supabase
            .from("provider_revenue_splits")
            .select("*")
            .eq("clinic_id", clinicId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createProviderRevenueSplit(clinicId, data) {
        const { data: split, error } = await this.supabase
            .from("provider_revenue_splits")
            .insert({
                clinic_id: clinicId,
                provider_id: data.provider_id,
                service_type: data.service_type,
                split_percentage: data.split_percentage,
                fixed_amount: data.fixed_amount || null,
                effective_from: data.effective_from || new Date().toISOString().split("T")[0],
                effective_until: data.effective_until || null,
                notes: data.notes || null,
            })
            .select("id")
            .single();
        if (error) throw error;
        return split.id;
    }

    async updateProviderRevenueSplit(clinicId, splitId, data) {
        const { error } = await this.supabase
            .from("provider_revenue_splits")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", splitId)
            .eq("clinic_id", clinicId);
        if (error) throw error;
    }

    async calculateProviderEarnings(clinicId, providerId, dateFrom, dateTo) {
        const { data: splits } = await this.supabase
            .from("provider_revenue_splits")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("provider_id", providerId)
            .lte("effective_from", dateTo)
            .or(`effective_until.is.null,effective_until.gte.${dateFrom}`);

        const { data: consultations } = await this.supabase
            .from("consultations")
            .select("id, created_at")
            .eq("clinic_id", clinicId)
            .eq("doctor_id", providerId)
            .eq("status", "completed")
            .gte("created_at", dateFrom)
            .lte("created_at", dateTo);

        const { data: procedures } = await this.supabase
            .from("billing_line_items")
            .select(`
                total, description,
                billing_invoices!inner(clinic_id, created_at, status)
            `)
            .eq("billing_invoices.clinic_id", clinicId)
            .eq("billing_invoices.status", "paid")
            .gte("billing_invoices.created_at", dateFrom)
            .lte("billing_invoices.created_at", dateTo);

        const serviceSplits = (splits || []).filter((s) => s.service_type);
        let totalEarnings = 0;
        const earningsBreakdown = [];

        const consultationCount = (consultations || []).length;
        const consultationSplit = serviceSplits.find((s) => s.service_type === "consultation");
        if (consultationSplit && consultationCount > 0) {
            let consultationEarnings;
            if (consultationSplit.fixed_amount) {
                consultationEarnings = consultationCount * parseFloat(consultationSplit.fixed_amount);
            } else {
                consultationEarnings = consultationCount * parseFloat(consultationSplit.split_percentage || 0);
            }
            totalEarnings += consultationEarnings;
            earningsBreakdown.push({
                type: "consultation",
                count: consultationCount,
                earnings: consultationEarnings,
            });
        }

        const procedureSplit = serviceSplits.find((s) => s.service_type === "procedure");
        if (procedureSplit) {
            const totalProcedures = (procedures || []).reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
            let procedureEarnings;
            if (procedureSplit.fixed_amount) {
                procedureEarnings = (procedures || []).length * parseFloat(procedureSplit.fixed_amount);
            } else {
                procedureEarnings = totalProcedures * (parseFloat(procedureSplit.split_percentage || 0) / 100);
            }
            totalEarnings += procedureEarnings;
            earningsBreakdown.push({
                type: "procedure",
                count: (procedures || []).length,
                total_revenue: totalProcedures,
                earnings: procedureEarnings,
            });
        }

        return {
            provider_id: providerId,
            date_from: dateFrom,
            date_to: dateTo,
            total_earnings: totalEarnings,
            breakdown: earningsBreakdown,
        };
    }

    _timeToMinutes(time) {
        if (!time) return 0;
        const str = String(time);
        const parts = str.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    _minutesToTime(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    }
}

export function getSchedulingService() {
    if (cachedService) return cachedService;
    const supabase = createClient();
    cachedService = new SchedulingService(supabase);
    return cachedService;
}
