"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { hasRole } from "@/features/auth/utils/permissions"
import { getStaffService } from "@/features/staff/services/staff-service"
import { StaffTable } from "@/features/staff/components/staff-table"
import { StaffCard } from "@/features/staff/components/staff-card"
import { StaffFilters } from "@/features/staff/components/staff-filters"
import { InviteStaffDialog } from "@/features/staff/components/invite-staff-dialog"
import type { StaffMember } from "@/features/staff/types"

const ITEMS_PER_PAGE = 20

export default function StaffPage() {
  const { user, clinic: authClinic, roles, permissions } = useAuth()
  const isOwner = hasRole(roles, "Owner")
  const clinicId = authClinic?.id

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [page, setPage] = useState(0)
  const [rolesList, setRolesList] = useState<{ id: string; name: string }[]>([])

  const staffService = useMemo(() => getStaffService(), [])

  const loadStaff = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await staffService.getStaff(clinicId)
      setStaff(data)

      const allRoles = new Map<string, { id: string; name: string }>()
      data.forEach((m) => m.roles.forEach((r) => allRoles.set(r.id, r)))
      setRolesList(Array.from(allRoles.values()))
    } catch {
      console.error("Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [clinicId, staffService])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const filtered = useMemo(() => {
    let result = staff
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.phone && m.phone.includes(q))
      )
    }
    if (roleFilter) {
      result = result.filter((m) => m.roles.some((r) => r.name === roleFilter))
    }
    if (statusFilter) {
      result = result.filter((m) => m.status === statusFilter)
    }
    return result
  }, [staff, search, roleFilter, statusFilter])

  const paginated = useMemo(() => {
    const start = page * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)

  const handleInvite = async (values: { email: string; role_id: string }) => {
    if (!clinicId || !user) return
    await staffService.inviteStaff(clinicId, values.email, values.role_id, user.id)
    await loadStaff()
  }

  const availableRoles = useMemo(() => {
    return rolesList.filter((r) => r.name !== "Owner")
  }, [rolesList])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage clinic staff members and their roles"
      >
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="size-4" />
            Invite Staff
          </button>
        )}
      </PageHeader>

      <StaffFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(0) }}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => { setRoleFilter(v); setPage(0) }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(0) }}
        roles={rolesList}
      />

      <div className="hidden md:block">
        <StaffTable staff={paginated} />
      </div>

      <div className="space-y-3 md:hidden">
        {paginated.map((member) => (
          <StaffCard key={member.id} member={member} />
        ))}
        {paginated.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No staff members found</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <InviteStaffDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleInvite}
        roles={availableRoles}
      />
    </div>
  )
}
