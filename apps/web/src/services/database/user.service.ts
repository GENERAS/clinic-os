import { createClient } from "@/lib/supabase/client"
import type { User, UserInsert, UserUpdate } from "@/types/database"

export function getUserService() {
  const supabase = createClient()

  return {
    async findById(id: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as User
    },

    async findByClinic(clinicId: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("clinic_id", clinicId)
      if (error) throw error
      return data as User[]
    },

    async findByEmail(email: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle()
      if (error) throw error
      return data as User | null
    },

    async create(values: UserInsert) {
      const { data, error } = await supabase
        .from("users")
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as User
    },

    async update(id: string, values: UserUpdate) {
      const { data, error } = await supabase
        .from("users")
        .update(values)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data as User
    },
  }
}
