import { createClient } from "@/lib/supabase/client";
import { getWhatsAppService } from "./whatsapp.service";
import { fetchUsers, enrichUser } from "@/lib/supabase/users";

export function getAppointmentReminderService() {
    const supabase = createClient();
    const whatsapp = getWhatsAppService();
    const getClinicName = async (clinicId) => {
        const { data } = await supabase
            .from("clinics")
            .select("name")
            .eq("id", clinicId)
            .single();
        return data?.name || "Clinic";
    };
    return {
        async processReminders(clinicId) {
            const settings = await whatsapp.getReminderSettings(clinicId);
            if (!settings || !settings.whatsapp_reminders_enabled)
                return 0;
            const hoursBefore = settings.reminder_hours_before || 24;
            const now = new Date();
            const targetStart = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
            const targetEnd = new Date(targetStart.getTime() + 60 * 60 * 1000);
            const targetDate = targetStart.toISOString().split("T")[0] || "";
            const targetTime = `${targetStart.getHours().toString().padStart(2, "0")}:${targetStart.getMinutes().toString().padStart(2, "0")}`;
            const nextHourTime = `${targetEnd.getHours().toString().padStart(2, "0")}:${targetEnd.getMinutes().toString().padStart(2, "0")}`;
            const { data: appointments } = await supabase
                .from("appointments")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("appointment_date", targetDate)
                .gte("start_time", targetTime)
                .lte("start_time", nextHourTime)
                .not("status", "in", `("cancelled","no_show","completed")`);
            if (!appointments || appointments.length === 0)
                return 0;

            const doctorIds = [...new Set(appointments.map(a => a.doctor_id).filter(Boolean))];
            if (doctorIds.length > 0) {
                await fetchUsers(clinicId, doctorIds);
            }

            const clinicName = await getClinicName(clinicId);
            let sentCount = 0;
            for (const apt of appointments) {
                const row = apt;
                const doctor = row.doctor_id ? enrichUser(row.doctor_id) : null;
                const doctorName = doctor?.full_name || "Doctor";
                const patientName = row.patient_name;
                const patientPhone = row.patient_phone;
                const patientId = row.patient_id;
                if (!patientPhone)
                    continue;
                const formattedPhone = patientPhone.startsWith("+") ? patientPhone : `+${patientPhone}`;
                try {
                    const result = await whatsapp.sendAppointmentReminder(clinicId, row.id, patientId, formattedPhone, patientName, row.appointment_date, row.start_time, doctorName, clinicName);
                    if (result)
                        sentCount++;
                }
                catch {
                    // Skip failed sends
                }
            }
            return sentCount;
        },
    };
}
