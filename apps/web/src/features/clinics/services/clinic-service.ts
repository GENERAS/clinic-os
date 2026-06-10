import { createClient } from "@/lib/supabase/client"
import { getAuditService } from "@/services/database/audit.service"
import type {
  Clinic,
  ClinicUpdate,
  ClinicOperatingHour,
  ClinicOperatingHourInsert,
  ClinicPreference,
  ClinicPreferenceUpdate,
  ClinicNotificationSetting,
  ClinicNotificationSettingUpdate,
} from "@/types/database"

const LOGO_BUCKET = "clinic-logos"

export function getClinicService() {
  const supabase = createClient()
  const audit = getAuditService()

  return {
    async getClinic(clinicId: string) {
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId)
        .single()
      if (error) throw error
      return data as Clinic
    },

    async updateClinic(clinicId: string, values: ClinicUpdate, userId: string) {
      const { data: oldData } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId)
        .single()

      const { data, error } = await supabase
        .from("clinics")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", clinicId)
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "clinic updated",
        entity_type: "clinics",
        entity_id: clinicId,
        old_value: oldData ? stripFields(oldData) : null,
        new_value: { ...stripFields(data) },
      }).catch(() => {})

      return data as Clinic
    },

    async uploadLogo(clinicId: string, file: File, userId: string) {
      const ext = file.name.split(".").pop()
      const filePath = `${clinicId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(filePath)

      const logoUrl = urlData.publicUrl

      await this.updateClinic(clinicId, { logo_url: logoUrl }, userId)

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "logo changed",
        entity_type: "clinics",
        entity_id: clinicId,
        new_value: { logo_url: logoUrl },
      }).catch(() => {})

      return logoUrl
    },

    async deleteLogo(clinicId: string, userId: string) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("logo_url")
        .eq("id", clinicId)
        .single()

      if (clinic?.logo_url) {
        const path = extractPathFromUrl(clinic.logo_url)
        if (path) {
          await supabase.storage.from(LOGO_BUCKET).remove([path])
        }
      }

      await this.updateClinic(clinicId, { logo_url: null }, userId)

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "logo deleted",
        entity_type: "clinics",
        entity_id: clinicId,
        old_value: { logo_url: clinic?.logo_url },
      }).catch(() => {})
    },

    async getOperatingHours(clinicId: string) {
      const { data, error } = await supabase
        .from("clinic_operating_hours")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("day_of_week", { ascending: true })
      if (error) throw error
      return data as ClinicOperatingHour[]
    },

    async updateOperatingHours(clinicId: string, hours: ClinicOperatingHourInsert[], userId: string) {
      const { data: oldData } = await supabase
        .from("clinic_operating_hours")
        .select("*")
        .eq("clinic_id", clinicId)

      const { error: deleteError } = await supabase
        .from("clinic_operating_hours")
        .delete()
        .eq("clinic_id", clinicId)
      if (deleteError) throw deleteError

      if (hours.length > 0) {
        const { error: insertError } = await supabase
          .from("clinic_operating_hours")
          .insert(hours)
        if (insertError) throw insertError
      }

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "hours changed",
        entity_type: "clinic_operating_hours",
        entity_id: clinicId,
        old_value: oldData ? { hours: (oldData as ClinicOperatingHour[]).map(stripFields) } : null,
        new_value: { hours: hours.map(stripFields) },
      }).catch(() => {})

      return this.getOperatingHours(clinicId)
    },

    async getPreferences(clinicId: string) {
      const { data, error } = await supabase
        .from("clinic_preferences")
        .select("*")
        .eq("clinic_id", clinicId)
        .single()
      if (error && error.code !== "PGRST116") throw error
      return data as ClinicPreference | null
    },

    async updatePreferences(clinicId: string, values: ClinicPreferenceUpdate, userId: string) {
      const { data: oldData } = await supabase
        .from("clinic_preferences")
        .select("*")
        .eq("clinic_id", clinicId)
        .single()

      const { data, error } = await supabase
        .from("clinic_preferences")
        .upsert({
          clinic_id: clinicId,
          ...values,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "preferences changed",
        entity_type: "clinic_preferences",
        entity_id: clinicId,
        old_value: oldData ? stripFields(oldData) : null,
        new_value: stripFields(data),
      }).catch(() => {})

      return data as ClinicPreference
    },

    async getNotificationSettings(clinicId: string) {
      const { data, error } = await supabase
        .from("clinic_notification_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .single()
      if (error && error.code !== "PGRST116") throw error
      return data as ClinicNotificationSetting | null
    },

    async updateNotificationSettings(clinicId: string, values: ClinicNotificationSettingUpdate, userId: string) {
      const { data: oldData } = await supabase
        .from("clinic_notification_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .single()

      const { data, error } = await supabase
        .from("clinic_notification_settings")
        .upsert({
          clinic_id: clinicId,
          ...values,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error

      audit.log({
        clinic_id: clinicId,
        user_id: userId,
        action: "notification settings changed",
        entity_type: "clinic_notification_settings",
        entity_id: clinicId,
        old_value: oldData ? stripFields(oldData) : null,
        new_value: stripFields(data),
      }).catch(() => {})

      return data as ClinicNotificationSetting
    },
  }
}

function stripFields(obj: unknown): Record<string, unknown> {
  const record = obj as Record<string, unknown>
  const { created_at, updated_at, id, clinic_id, ...rest } = record
  return rest
}

function extractPathFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const segments = u.pathname.split("/")
    const bucketIndex = segments.findIndex((s) => s === LOGO_BUCKET)
    if (bucketIndex === -1) return null
    return segments.slice(bucketIndex + 1).join("/")
  } catch {
    return null
  }
}
