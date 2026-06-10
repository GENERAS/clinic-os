"use client"

interface AppointmentFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  doctorId: string
  onDoctorChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  doctors: { id: string; full_name: string }[]
}

export function AppointmentFilters({
  search,
  onSearchChange,
  doctorId,
  onDoctorChange,
  status,
  onStatusChange,
  doctors,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search by patient name or phone..."
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value)
          }}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
      </div>
      <select
        value={doctorId}
        onChange={(e) => onDoctorChange(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-auto"
      >
        <option value="">All Doctors</option>
        {doctors.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.full_name}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-auto"
      >
        <option value="">All Status</option>
        <option value="scheduled">Scheduled</option>
        <option value="confirmed">Confirmed</option>
        <option value="arrived">Arrived</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="no_show">No Show</option>
      </select>
    </div>
  )
}
