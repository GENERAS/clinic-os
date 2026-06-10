export interface Clinic {
  id: string
  name: string
  logo?: string
  phone: string
  email: string
  address: string
  operatingHours: Record<string, { open: string; close: string }>
  createdAt: string
  updatedAt: string
}
