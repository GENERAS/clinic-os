import { createClient } from "@/lib/supabase/client";

export function getOnboardingService() {
  const supabase = createClient();

  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return {
    async signUp({ email, password, fullName, clinicName }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, clinic_name: clinicName },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Sign-up failed. Please try again.");
      return data.user;
    },

    async completeSetup({ clinicName, clinicPhone, clinicAddress, timezone, operatingHours }) {
      const slug = slugify(clinicName);

      const { data, error } = await supabase.rpc("complete_onboarding", {
        p_clinic_name: clinicName,
        p_clinic_slug: slug,
        p_clinic_phone: clinicPhone || "",
        p_clinic_address: clinicAddress || "",
        p_clinic_timezone: timezone || "UTC",
        p_operating_hours: operatingHours,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
  };
}
