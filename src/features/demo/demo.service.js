import { createClient } from "@/lib/supabase/client";

const DEMO_CLINIC_NAME = "Demo Clinic";
const DEMO_PHONE = "+250 788 123 456";
const DEMO_PATIENTS = [
  { name: "John Mugisha", phone: "+250 788 111 222" },
  { name: "Alice Uwimana", phone: "+250 788 333 444" },
  { name: "David Habimana", phone: "+250 788 555 666" },
  { name: "Grace Nyiraneza", phone: "+250 788 777 888" },
  { name: "Patrick Niyonzima", phone: "+250 788 999 000" },
];

export function getDemoService() {
  const supabase = createClient();

  return {
    async createDemoClinic(userId) {
      const { data: clinicId, error: clinicError } = await supabase.rpc("create_clinic_onboarding", {
        p_name: DEMO_CLINIC_NAME,
        p_slug: "demo-clinic-" + Date.now(),
        p_phone: DEMO_PHONE,
        p_timezone: "Africa/Kigali",
      });
      if (clinicError || !clinicId) throw clinicError || new Error("Failed to create clinic");

      await supabase.from("clinics").update({ metadata: { is_demo: true, created_by: userId } }).eq("id", clinicId);

      const patientIds = [];
      for (const p of DEMO_PATIENTS) {
        const { data: newId, error } = await supabase.rpc("create_patient", {
          p_clinic_id: clinicId, p_full_name: p.name, p_phone: p.phone,
          p_created_by: userId,
        });
        if (!error && newId) patientIds.push(newId);
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];
      const times = ["09:00", "10:00", "11:00", "14:00", "15:00"];

      for (let i = 0; i < Math.min(patientIds.length, times.length); i++) {
        await supabase.rpc("create_appointment", {
          p_clinic_id: clinicId, p_patient_id: patientIds[i],
          p_patient_name: DEMO_PATIENTS[i].name,
          p_patient_phone: DEMO_PATIENTS[i].phone,
          p_doctor_id: userId, p_created_by: userId,
          p_appointment_date: dateStr, p_start_time: times[i],
          p_end_time: times[i].replace(/^\d+/, (h) => String(Number(h) + 1).padStart(2, "0")),
          p_reason: "General checkup",
        });
      }

      return clinicId;
    },

    isDemoClinic(clinic) {
      return clinic?.metadata?.is_demo === true;
    },

    async convertDemoToReal(clinicId, { name, phone }) {
      await supabase.from("clinics").update({
        name,
        phone,
        metadata: { is_demo: false },
      }).eq("id", clinicId);
    },

    getEstimatedLostRevenue() {
      const missedPerMonth = 12;
      const avgRevenuePerVisit = 20000;
      return {
        missedPerMonth,
        avgRevenuePerVisit,
        monthlyLoss: missedPerMonth * avgRevenuePerVisit,
        yearlyLoss: missedPerMonth * avgRevenuePerVisit * 12,
      };
    },

    getDemoMessagePreviews() {
      return [
        { name: "John Mugisha", time: "Tomorrow 09:00", template: "reminder" },
        { name: "Alice Uwimana", time: "Tomorrow 10:00", template: "confirmation" },
        { name: "David Habimana", time: "Tomorrow 11:00", template: "follow_up" },
      ];
    },
  };
}
