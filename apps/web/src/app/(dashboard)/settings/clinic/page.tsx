"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { hasRole } from "@/features/auth/utils/permissions"
import { getClinicService } from "@/features/clinics/services/clinic-service"
import { SettingsTabs } from "@/features/clinics/components/settings-tabs"
import { ClinicProfileForm } from "@/features/clinics/components/clinic-profile-form"
import { ClinicLocationForm } from "@/features/clinics/components/clinic-location-form"
import { ClinicBrandingForm } from "@/features/clinics/components/clinic-branding-form"
import { ClinicHoursEditor } from "@/features/clinics/components/clinic-hours-editor"
import { ClinicPreferencesForm } from "@/features/clinics/components/clinic-preferences-form"
import { ClinicNotificationForm } from "@/features/clinics/components/clinic-notification-form"
import { ClinicOverviewCard } from "@/features/clinics/components/clinic-overview-card"
import type { ClinicSettingsTab } from "@/features/clinics/types"
import type { Clinic, ClinicOperatingHour, ClinicPreference, ClinicNotificationSetting } from "@/types/database"
import type { ClinicProfileFormValues } from "@/features/clinics/schemas/clinic-profile.schema"
import type { ClinicLocationFormValues } from "@/features/clinics/schemas/clinic-profile.schema"
import type { PreferencesFormValues } from "@/features/clinics/schemas/preferences.schema"
import type { NotificationSettingsFormValues } from "@/features/clinics/schemas/notification-settings.schema"

export default function ClinicSettingsPage() {
  const { user, clinic: authClinic, roles, isLoading: authLoading } = useAuth()
  const isOwner = hasRole(roles, "Owner")

  const [activeTab, setActiveTab] = useState<ClinicSettingsTab>("profile")
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [hours, setHours] = useState<ClinicOperatingHour[]>([])
  const [preferences, setPreferences] = useState<ClinicPreference | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<ClinicNotificationSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoUploading, setLogoUploading] = useState(false)

  const clinicService = getClinicService()

  const loadData = useCallback(async () => {
    if (!authClinic?.id) return
    setLoading(true)
    try {
      const [clinicData, hoursData, preferencesData, notificationData] = await Promise.all([
        clinicService.getClinic(authClinic.id),
        clinicService.getOperatingHours(authClinic.id),
        clinicService.getPreferences(authClinic.id),
        clinicService.getNotificationSettings(authClinic.id),
      ])
      setClinic(clinicData)
      setHours(hoursData)
      setPreferences(preferencesData)
      setNotificationSettings(notificationData)
    } catch {
      console.error("Failed to load clinic data")
    } finally {
      setLoading(false)
    }
  }, [authClinic?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleProfileSave = async (values: ClinicProfileFormValues) => {
    if (!clinic || !user) return
    const updated = await clinicService.updateClinic(clinic.id, values, user.id)
    setClinic(updated)
  }

  const handleLocationSave = async (values: ClinicLocationFormValues) => {
    if (!clinic || !user) return
    const updated = await clinicService.updateClinic(clinic.id, values, user.id)
    setClinic(updated)
  }

  const handleLogoUpload = async (file: File) => {
    if (!clinic || !user) return
    setLogoUploading(true)
    try {
      const url = await clinicService.uploadLogo(clinic.id, file, user.id)
      setClinic((prev) => prev ? { ...prev, logo_url: url } : null)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!clinic || !user) return
    await clinicService.deleteLogo(clinic.id, user.id)
    setClinic((prev) => prev ? { ...prev, logo_url: null } : null)
  }

  const handleHoursSave = async (hoursData: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[]) => {
    if (!clinic || !user) return
    const updated = await clinicService.updateOperatingHours(
      clinic.id,
      hoursData.map((h) => ({
        clinic_id: clinic.id,
        day_of_week: h.day_of_week,
        is_open: h.is_open,
        open_time: h.open_time,
        close_time: h.close_time,
      })),
      user.id
    )
    setHours(updated)
  }

  const handlePreferencesSave = async (values: PreferencesFormValues) => {
    if (!clinic || !user) return
    const updated = await clinicService.updatePreferences(clinic.id, values, user.id)
    setPreferences(updated)
  }

  const handleNotificationSave = async (values: NotificationSettingsFormValues) => {
    if (!clinic || !user) return
    const updated = await clinicService.updateNotificationSettings(clinic.id, values, user.id)
    setNotificationSettings(updated)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Failed to load clinic data</p>
        <button
          type="button"
          onClick={loadData}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinic Settings"
        description={isOwner ? "Manage your clinic profile, branding, and preferences" : "View clinic information and settings"}
      />

      <ClinicOverviewCard
        name={clinic.name}
        logoUrl={clinic.logo_url}
        status={clinic.status}
        city={clinic.city}
      />

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} isOwner={isOwner} />

      {activeTab === "profile" && (
        <ClinicProfileForm
          clinic={clinic}
          isLoading={loading}
          onSave={handleProfileSave}
        />
      )}

      {activeTab === "location" && (
        <ClinicLocationForm
          clinic={clinic}
          isOwner={isOwner}
          onSave={handleLocationSave}
        />
      )}

      {activeTab === "branding" && (
        <ClinicBrandingForm
          logoUrl={clinic.logo_url}
          isOwner={isOwner}
          onUpload={handleLogoUpload}
          onDelete={handleLogoDelete}
          isUploading={logoUploading}
        />
      )}

      {activeTab === "hours" && (
        <ClinicHoursEditor
          hours={hours}
          isOwner={isOwner}
          onSave={handleHoursSave}
        />
      )}

      {activeTab === "preferences" && (
        <ClinicPreferencesForm
          preferences={preferences}
          isOwner={isOwner}
          onSave={handlePreferencesSave}
        />
      )}

      {activeTab === "notifications" && (
        <ClinicNotificationForm
          settings={notificationSettings}
          isOwner={isOwner}
          onSave={handleNotificationSave}
        />
      )}
    </div>
  )
}
