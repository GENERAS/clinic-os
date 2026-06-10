import { createClient } from "@/lib/supabase/client"
import type { Clinic, ClinicInsert, ClinicUpdate } from "@/types/database"

export function getClinicService() {
  const supabase = createClient()

  return {
    async findById(id: string) {
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as Clinic
    },

    async findBySlug(slug: string) {
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("slug", slug)
        .single()
      if (error) throw error
      return data as Clinic
    },

    async update(id: string, values: ClinicUpdate) {
      const { data, error } = await supabase
        .from("clinics")
        .update(values)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as Clinic
    },
  }
}
