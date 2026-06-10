export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  clinicId: string
}

export interface AuthClinic {
  id: string
  name: string
  slug: string
}

export interface AuthRole {
  id: string
  name: string
}

export interface AuthState {
  user: AuthUser | null
  clinic: AuthClinic | null
  roles: AuthRole[]
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  password: string
  confirmPassword: string
}
