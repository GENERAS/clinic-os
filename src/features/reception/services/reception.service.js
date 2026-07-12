import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export function getReceptionService() {
  if (cachedService) return cachedService;
  const supabase = createClient();

  const service = {
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
      return (data || []).map((r) => ({ id: r.users.id, full_name: r.users.full_name }));
    },

    async searchPatients(clinicId, query) {
      if (!query || query.trim().length < 2) return [];
      const q = query.trim();
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, phone, gender, date_of_birth, national_id")
        .eq("clinic_id", clinicId)
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,national_id.ilike.%${q}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },

    async getTodayVisits(clinicId) {
      const today = new Date().toISOString().split("T")[0];
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true });
      if (error) throw error;

      const doctorIds = new Set();
      (appointments || []).forEach((a) => {
        if (a.doctor_id) doctorIds.add(a.doctor_id);
      });
      if (doctorIds.size > 0) {
        const { data: doctors } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("clinic_id", clinicId)
          .in("id", [...doctorIds]);
        const doctorMap = new Map((doctors || []).map((d) => [d.id, d]));
        return (appointments || []).map((a) => ({
          ...a,
          doctor_name: doctorMap.get(a.doctor_id)?.full_name || "",
        }));
      }
      return (appointments || []).map((a) => ({ ...a, doctor_name: "" }));
    },

    async checkInPatient(clinicId, appointmentId, userId) {
      const { data: appointment, error: fetchErr } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (fetchErr || !appointment) throw new Error("Appointment not found");
      if (!["scheduled", "confirmed"].includes(appointment.status)) {
        throw new Error(`Cannot check in an appointment with status "${appointment.status}"`);
      }

      const today = new Date().toISOString().split("T")[0];
      const queueNumber = await service.getQueueNumber(clinicId);

      const { error: updateErr } = await supabase
        .from("appointments")
        .update({ status: "arrived", updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId);
      if (updateErr) throw updateErr;

      await supabase
        .from("appointment_status_history")
        .insert({
          appointment_id: appointmentId,
          old_status: appointment.status,
          new_status: "arrived",
          changed_by: userId,
        });

      const { data: queueEntry, error: queueErr } = await supabase
        .from("patient_queue")
        .insert({
          clinic_id: clinicId,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          queue_date: today,
          queue_number: queueNumber,
          status: "waiting",
          priority: "normal",
          sms_notified: false,
        })
        .select("id")
        .single();
      if (queueErr) throw queueErr;

      return { queue_number: queueNumber, queue_entry_id: queueEntry.id };
    },

    async registerWalkIn(clinicId, patientData, doctorId, userId, reason) {
      let patientId = patientData.id;

      if (!patientId) {
        const { data: existingByPhone } = await supabase
          .from("patients")
          .select("id, full_name")
          .eq("clinic_id", clinicId)
          .eq("phone", patientData.phone)
          .maybeSingle();
        if (existingByPhone) {
          throw new Error(`PATIENT_EXISTS:${existingByPhone.id}:${existingByPhone.full_name}`);
        }

        const { data: patient, error: patientErr } = await supabase
          .from("patients")
          .insert({
            clinic_id: clinicId,
            full_name: patientData.full_name,
            phone: patientData.phone,
            gender: patientData.gender || null,
            date_of_birth: patientData.date_of_birth || null,
            email: patientData.email || null,
            address: patientData.address || null,
            created_by: userId,
          })
          .select("id")
          .single();
        if (patientErr) throw patientErr;
        patientId = patient.id;
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().substring(0, 5) + ":00";
      const endTime = new Date(now.getTime() + 30 * 60000).toTimeString().substring(0, 5) + ":00";

      const { data: appointment, error: apptErr } = await supabase
        .from("appointments")
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          patient_name: patientData.full_name,
          patient_phone: patientData.phone,
          doctor_id: doctorId,
          appointment_date: today,
          start_time: timeStr,
          end_time: endTime,
          reason: reason || "Walk-in",
          status: "arrived",
          created_by: userId,
        })
        .select("id")
        .single();
      if (apptErr) throw apptErr;

      await supabase
        .from("appointment_status_history")
        .insert({
          appointment_id: appointment.id,
          old_status: null,
          new_status: "arrived",
          changed_by: userId,
        });

      const queueNumber = await service.getQueueNumber(clinicId);
      const { data: queueEntry, error: queueErr } = await supabase
        .from("patient_queue")
        .insert({
          clinic_id: clinicId,
          patient_id: patientId,
          doctor_id: doctorId,
          queue_date: today,
          queue_number: queueNumber,
          status: "waiting",
          priority: "normal",
          sms_notified: false,
        })
        .select("id")
        .single();
      if (queueErr) throw queueErr;

      return {
        patient_id: patientId,
        appointment_id: appointment.id,
        queue_number: queueNumber,
        queue_entry_id: queueEntry.id,
      };
    },

    async getQueueStatus(clinicId) {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("patient_queue")
        .select(`
          *,
          patients(id, full_name, phone, gender),
          users!patient_queue_doctor_id_fkey(id, full_name)
        `)
        .eq("clinic_id", clinicId)
        .eq("queue_date", today)
        .order("queue_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async getQueueNumber(clinicId) {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("patient_queue")
        .select("queue_number")
        .eq("clinic_id", clinicId)
        .eq("queue_date", today)
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.queue_number || 0) + 1;
    },

    async updateQueueStatus(clinicId, queueId, status) {
      const updates = { status };
      if (status === "in_consultation") {
        updates.started_at = new Date().toISOString();
      } else if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("patient_queue")
        .update(updates)
        .eq("id", queueId)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },

    async markNoShow(clinicId, appointmentId, userId) {
      const { data: current } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (!current) throw new Error("Appointment not found");
      if (!["scheduled", "confirmed"].includes(current.status)) {
        throw new Error(`Cannot mark a "${current.status}" appointment as no-show`);
      }

      const { error } = await supabase
        .from("appointments")
        .update({ status: "no_show", updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId);
      if (error) throw error;

      await supabase
        .from("appointment_status_history")
        .insert({
          appointment_id: appointmentId,
          old_status: current.status,
          new_status: "no_show",
          changed_by: userId,
        });
    },

    async advanceAppointment(clinicId, appointmentId, newStatus, userId) {
      const { data: current } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId)
        .single();
      if (!current) throw new Error("Appointment not found");

      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId);
      if (error) throw error;

      await supabase
        .from("appointment_status_history")
        .insert({
          appointment_id: appointmentId,
          old_status: current.status,
          new_status: newStatus,
          changed_by: userId,
        });
    },
  };

  cachedService = service;
  return service;
}
