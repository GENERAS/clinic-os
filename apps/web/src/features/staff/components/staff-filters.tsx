"use client"

import { Search } from "lucide-react"

interface StaffFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  roleFilter: string
  onRoleFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  roles: { id: string; name: string }[]
}

export function StaffFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  roles,
}: StaffFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value)}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Roles</option>
        {roles.map((role) => (
          <option key={role.id} value={role.name}>
            {role.name}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="rounded-lg border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
  )
}
