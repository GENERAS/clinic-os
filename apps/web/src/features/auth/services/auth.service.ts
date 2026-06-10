import { createClient } from "@/lib/supabase/client"
import type { LoginCredentials, ForgotPasswordInput, ResetPasswordInput } from "../types"

export const authService = {
  async login({ email, password }: LoginCredentials) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async forgotPassword({ email }: ForgotPasswordInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  async resetPassword({ password }: ResetPasswordInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  async getCurrentUser() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  },

  async getSession() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },
}
