import { createClient } from "@/lib/supabase/client"
import type { Role, RoleInsert } from "@/types/database"

export function getRoleService() {
  const supabase = createClient()

  return {
    async findAll() {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name")
      if (error) throw error
      return data as Role[]
    },

    async findById(id: string) {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as Role
    },

    async findByName(name: string) {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("name", name)
        .single()
      if (error) throw error
      return data as Role
    },

    async findWithPermissions(roleId: string) {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permissions(*)")
        .eq("role_id", roleId)
      if (error) throw error
      return data
    },

    async assignToUser(userId: string, roleId: string) {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role_id: roleId })
        .select()
        .single()
      if (error) throw error
      return data
    },

    async removeFromUser(userId: string, roleId: string) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId)
      if (error) throw error
    },

    async getUserRoles(userId: string) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("roles(*)")
        .eq("user_id", userId)
      if (error) throw error
      return data
    },
  }
}
