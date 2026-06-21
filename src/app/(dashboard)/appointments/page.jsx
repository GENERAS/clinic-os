"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getAppointmentService } from "@/features/appointments/services/appointment.service";
import { AppointmentTable } from "@/features/appointments/components/appointment-table";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { AppointmentFilters } from "@/features/appointments/components/appointment-filters";
import { toast } from "sonner";
const ITEMS_PER_PAGE = 20;
export default function AppointmentsPage() {
    const { user, clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [appointments, setAppointments] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [doctorFilter, setDoctorFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(0);
    const [sortField, setSortField] = useState("appointment_date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [doctors, setDoctors] = useState([]);
    const service = useMemo(() => getAppointmentService(), []);
    const loadAppointments = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const filters = {};
            if (search)
                filters.search = search;
            if (doctorFilter)
                filters.doctor_id = doctorFilter;
            if (statusFilter)
                filters.status = statusFilter;
            const result = await service.getAppointments(clinicId, filters, {
                page,
                pageSize: ITEMS_PER_PAGE,
                sortField,
                sortOrder,
            });
            setAppointments(result.data);
            setTotal(result.total);
        }
        catch {
            toast.error("Failed to load appointments");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, service, search, doctorFilter, statusFilter, page, sortField, sortOrder]);
    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);
    useEffect(() => {
        if (!clinicId)
            return;
        service.getDoctors(clinicId).then(setDoctors).catch(() => { });
    }, [clinicId, service]);
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const handleStatusChange = async (appointmentId, newStatus) => {
        if (!clinicId || !user)
            return;
        try {
            await service.changeStatus(clinicId, appointmentId, newStatus, user.id);
            toast.success(`Appointment ${newStatus}`);
            await loadAppointments();
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update status");
        }
    };
    const toggleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
        }
        else {
            setSortField(field);
            setSortOrder("desc");
        }
    };
    return (<div className="space-y-6">
      <PageHeader title="Appointments" description="Manage patient appointments">
        <Link to="/appointments/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4"/>
          New Appointment
        </Link>
      </PageHeader>

      <AppointmentFilters search={search} onSearchChange={(v) => { setSearch(v); setPage(0); }} doctorId={doctorFilter} onDoctorChange={(v) => { setDoctorFilter(v); setPage(0); }} status={statusFilter} onStatusChange={(v) => { setStatusFilter(v); setPage(0); }} doctors={doctors}/>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Sort by:</span>
        <button onClick={() => toggleSort("appointment_date")} className={`rounded-lg px-2 py-1 font-medium hover:bg-muted ${sortField === "appointment_date" ? "text-primary" : ""}`}>
          Date {sortField === "appointment_date" ? (sortOrder === "desc" ? "↓" : "↑") : ""}
        </button>
      </div>

      {loading ? (<div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground"/>
        </div>) : (<>
          {/* Desktop table */}
          <div className="hidden md:block">
            <AppointmentTable appointments={appointments} clinicId={clinicId || ""} userId={user?.id || ""} onStatusChange={handleStatusChange}/>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {appointments.length === 0 ? (<div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-sm text-muted-foreground">No appointments found</p>
              </div>) : (appointments.map((apt) => (<AppointmentCard key={apt.id} appointment={apt}/>)))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex items-center justify-center gap-2 flex-wrap">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 min-h-[44px]">
                Previous
              </button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 min-h-[44px]">
                Next
              </button>
            </div>)}
        </>)}
    </div>);
}
