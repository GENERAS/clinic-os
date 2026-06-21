import { createClient } from "@/lib/supabase/client";
import { getAuditService } from "@/services/database/audit.service";
import { getWhatsAppAutomationService } from "@/features/whatsapp/services/whatsapp-automation.service";
import { APPOINTMENT_STATUS_TRANSITIONS } from "../types";
import { fetchUsers as fetchUsersBatch, enrichUser } from "@/lib/supabase/users";

export function getAppointmentService() {
  const supabase = createClient();
  const audit = getAuditService();

  const mapAppointment = (row) => ({
    id: row.id,
    clinic_id: row.clinic_id,
    patient_name: row.patient_name,
    patient_phone: row.patient_phone,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    created_by: row.created_by,
    appointment_date: row.appointment_date,
    start_time: row.start_time,
    end_time: row.end_time,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  const validateTransition = (currentStatus, newStatus) => {
    const allowed = APPOINTMENT_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from "${currentStatus}" to "${newStatus}"`);
    }
  };

  const whatsapp = getWhatsAppAutomationService();

  const checkConflict = async (clinicId, doctorId, date, startTime, endTime, excludeAppointmentId) => {
    let query = supabase
      .from("appointments")
      .select("id, start_time, end_time, patient_name")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId)
      .eq("appointment_date", date)
      .not("status", "in", `("cancelled","no_show")`);
    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId);
    }
    const { data: existing } = await query;
    if (existing) {
      const conflict = existing.find((a) => {
        const existingStart = a.start_time;
        const existingEnd = a.end_time;
        return startTime < existingEnd && endTime > existingStart;
      });
      if (conflict) {
        throw new Error(`Doctor already has an appointment with ${conflict.patient_name} at ${conflict.start_time?.substring(0, 5)}-${conflict.end_time?.substring(0, 5)} on this date`);
      }
    }
  };

  const logStatusChange = async (appointmentId, oldStatus, newStatus, changedBy) => {
    const { error } = await supabase
      .from("appointment_status_history")
      .insert({
        appointment_id: appointmentId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
      });
    if (error) throw error;
  };

  return {
    async createAppointment(clinicId, values, userId) {
      await checkConflict(clinicId, values.doctor_id, values.appointment_date, values.start_time, values.end_time);
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...values, clinic_id: clinicId, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      await logStatusChange(data.id, null, data.status, userId);
      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment created",
        entity_type: "appointments",
        entity_id: data.id,
        new_value: { patient_name: values.patient_name, doctor_id: values.doctor_id, date: values.appointment_date, start_time: values.start_time, end_time: values.end_time },
      }).catch(() => {});
      whatsapp.queueAppointmentConfirmation(data.id).catch(() => {});
      return mapAppointment(data);
    },

    async updateAppointment(clinicId, appointmentId, values, userId) {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (!current) throw new Error("Appointment not found");
      const date = values.appointment_date || current.appointment_date;
      const startTime = values.start_time || current.start_time;
      const endTime = values.end_time || current.end_time;
      const doctorId = values.doctor_id || current.doctor_id;
      if (values.doctor_id || values.appointment_date || values.start_time || values.end_time) {
        await checkConflict(clinicId, doctorId, date, startTime, endTime, appointmentId);
      }
      const { data, error } = await supabase
        .from("appointments")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single();
      if (error) throw error;
      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment updated",
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: { patient_name: current.patient_name, doctor_id: current.doctor_id, date: current.appointment_date, start_time: current.start_time, end_time: current.end_time },
        new_value: values,
      }).catch(() => {});
      return mapAppointment(data);
    },

    async cancelAppointment(clinicId, appointmentId, userId) {
      return this.changeStatus(clinicId, appointmentId, "cancelled", userId);
    },

    async rescheduleAppointment(clinicId, appointmentId, values, userId) {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (!current) throw new Error("Appointment not found");
      await checkConflict(clinicId, current.doctor_id, values.appointment_date, values.start_time, values.end_time, appointmentId);
      const { data, error } = await supabase
        .from("appointments")
        .update({
          appointment_date: values.appointment_date,
          start_time: values.start_time,
          end_time: values.end_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single();
      if (error) throw error;
      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "appointment rescheduled",
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: { date: current.appointment_date, start_time: current.start_time, end_time: current.end_time },
        new_value: values,
      }).catch(() => {});
      return mapAppointment(data);
    },

    async changeStatus(clinicId, appointmentId, newStatus, userId) {
      const { data: current } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (!current) throw new Error("Appointment not found");
      validateTransition(current.status, newStatus);
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .select()
        .single();
      if (error) throw error;
      await logStatusChange(appointmentId, current.status, newStatus, userId);
      if (newStatus === "cancelled") {
        supabase.from("notifications").insert({
          clinic_id: clinicId,
          title: "Appointment Cancelled",
          message: `${current.patient_name}'s appointment on ${current.appointment_date} at ${String(current.start_time).substring(0, 5)} was cancelled`,
          type: "warning",
        }).then().catch(() => {});
        whatsapp.queueAppointmentCancelled(appointmentId).catch(() => {});
        supabase.from("revenue_recovery").insert({
          clinic_id: clinicId,
          appointment_id: appointmentId,
          patient_id: current.patient_id,
          lost_revenue: 12000,
          currency: "RWF",
          reason: "cancellation",
          cancelled_at: new Date().toISOString(),
          recovered: false,
        }).then().catch(() => {});
      }
      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: `appointment ${newStatus}`,
        entity_type: "appointments",
        entity_id: appointmentId,
        old_value: { status: current.status },
        new_value: { status: newStatus },
      }).catch(() => {});
      return mapAppointment(data);
    },

    async getAppointment(clinicId, appointmentId) {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (error) return null;

      const ids = [];
      if (data.doctor_id) ids.push(data.doctor_id);
      if (data.created_by) ids.push(data.created_by);
      await fetchUsersBatch(clinicId, ids);

      const { data: statusHistory } = await supabase
        .from("appointment_status_history")
        .select("*, changed_by")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });

      const shIds = (statusHistory || []).map((r) => r.changed_by).filter(Boolean);
      await fetchUsersBatch(clinicId, shIds);

      const { data: notes } = await supabase
        .from("appointment_notes")
        .select("*, author_id")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });

      const noteIds = (notes || []).map((r) => r.author_id).filter(Boolean);
      await fetchUsersBatch(clinicId, noteIds);

      return {
        ...mapAppointment(data),
        doctor: enrichUser(data.doctor_id),
        creator: enrichUser(data.created_by),
        status_history: (statusHistory || []).map((r) => ({
          id: r.id,
          appointment_id: r.appointment_id,
          old_status: r.old_status,
          new_status: r.new_status,
          changed_by: r.changed_by,
          created_at: r.created_at,
          changed_by_name: enrichUser(r.changed_by)?.full_name || "Unknown",
        })),
        appointmentNotes: (notes || []).map((r) => ({
          id: r.id,
          appointment_id: r.appointment_id,
          author_id: r.author_id,
          content: r.content,
          created_at: r.created_at,
          author: enrichUser(r.author_id),
        })),
      };
    },

    async getAppointments(clinicId, filters, options) {
      const page = options?.page || 0;
      const pageSize = options?.pageSize || 20;
      const sortField = options?.sortField || "appointment_date";
      const sortOrder = options?.sortOrder || "desc";
      let query = supabase
        .from("appointments")
        .select("*", { count: "exact" })
        .eq("clinic_id", clinicId);
      if (filters?.search) {
        const q = filters.search;
        query = query.or(`patient_name.ilike.%${q}%,patient_phone.ilike.%${q}%`);
      }
      if (filters?.doctor_id) {
        query = query.eq("doctor_id", filters.doctor_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.date_from) {
        query = query.gte("appointment_date", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("appointment_date", filters.date_to);
      }
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query
        .order(sortField, { ascending: sortOrder === "asc" })
        .range(from, to);
      if (error) throw error;

      const ids = new Set();
      (data || []).forEach((r) => {
        if (r.doctor_id) ids.add(r.doctor_id);
        if (r.created_by) ids.add(r.created_by);
      });
      await fetchUsersBatch(clinicId, [...ids]);

      return {
        data: (data || []).map((row) => ({
          ...mapAppointment(row),
          doctor: enrichUser(row.doctor_id),
          creator: enrichUser(row.created_by),
          doctor_name: enrichUser(row.doctor_id)?.full_name || "",
          status_history: [],
          appointmentNotes: [],
        })),
        total: count || 0,
      };
    },

    async getTodayAppointments(clinicId) {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true });
      if (error) throw error;

      const ids = new Set();
      (data || []).forEach((r) => {
        if (r.doctor_id) ids.add(r.doctor_id);
        if (r.created_by) ids.add(r.created_by);
      });
      await fetchUsersBatch(clinicId, [...ids]);

      return (data || []).map((row) => ({
        ...mapAppointment(row),
        doctor: enrichUser(row.doctor_id),
        creator: enrichUser(row.created_by),
        doctor_name: enrichUser(row.doctor_id)?.full_name || "",
        status_history: [],
        appointmentNotes: [],
      }));
    },

    async getCalendarAppointments(clinicId, dateFrom, dateTo) {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("appointment_date", dateFrom)
        .lte("appointment_date", dateTo)
        .not("status", "in", `("cancelled","no_show")`)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;

      const ids = new Set();
      (data || []).forEach((r) => {
        if (r.doctor_id) ids.add(r.doctor_id);
        if (r.created_by) ids.add(r.created_by);
      });
      await fetchUsersBatch(clinicId, [...ids]);

      return (data || []).map((row) => ({
        ...mapAppointment(row),
        doctor: enrichUser(row.doctor_id),
        creator: enrichUser(row.created_by),
        doctor_name: enrichUser(row.doctor_id)?.full_name || "",
        status_history: [],
        appointmentNotes: [],
      }));
    },

    async addNote(clinicId, appointmentId, content, userId) {
      const { data, error } = await supabase
        .from("appointment_notes")
        .insert({
          appointment_id: appointmentId,
          author_id: userId,
          content,
        })
        .select()
        .single();
      if (error) throw error;

      await fetchUsersBatch(clinicId, [userId]);

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "note added",
        entity_type: "appointments",
        entity_id: appointmentId,
        new_value: { note_id: data.id },
      }).catch(() => {});
      return { ...data, author: enrichUser(userId) };
    },

    async getStatusHistory(appointmentId) {
      const { data, error } = await supabase
        .from("appointment_status_history")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = (data || []).map((r) => r.changed_by).filter(Boolean);
      if (ids.length > 0) {
        const clinicId = data[0]?.appointment_id ? null : null;
        const { data: appt } = await supabase
          .from("appointments")
          .select("clinic_id")
          .eq("id", appointmentId)
          .single();
        if (appt) await fetchUsersBatch(appt.clinic_id, ids);
      }

      return (data || []).map((row) => ({
        id: row.id,
        appointment_id: row.appointment_id,
        old_status: row.old_status,
        new_status: row.new_status,
        changed_by: row.changed_by,
        created_at: row.created_at,
        changed_by_name: enrichUser(row.changed_by)?.full_name || "Unknown",
      }));
    },

    async getDoctors(clinicId) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "Doctor")
        .maybeSingle();
      if (!roleData) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("users(id, full_name)")
        .eq("role_id", roleData.id)
        .in("users.status", ["active"]);
      return (data || []).map((r) => {
        const user = r.users;
        return { id: user.id, full_name: user.full_name };
      });
    },
  };
}
