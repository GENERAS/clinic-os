"use client";
export function AppointmentFilters({ search, onSearchChange, doctorId, onDoctorChange, status, onStatusChange, doctors, }) {
    return (<div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex-1">
        <input type="text" placeholder="Search patient name or phone..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"/>
      </div>
      <select value={doctorId} onChange={(e) => onDoctorChange(e.target.value)} className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-36">
        <option value="">All Doctors</option>
        {doctors.map((doc) => (<option key={doc.id} value={doc.id}>{doc.full_name}</option>))}
      </select>
      <select value={status} onChange={(e) => onStatusChange(e.target.value)} className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-32">
        <option value="">All Status</option>
        {["scheduled","confirmed","arrived","in_progress","completed","cancelled","no_show"].map((s) => (
          <option key={s} value={s}>{s.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())}</option>
        ))}
      </select>
    </div>);
}
