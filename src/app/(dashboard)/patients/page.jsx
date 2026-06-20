"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getPatientService } from "@/features/patients/services/patient.service";
import { PatientTable } from "@/features/patients/components/patient-table";
import { PatientCard } from "@/features/patients/components/patient-card";
import { toast } from "sonner";
const ITEMS_PER_PAGE = 20;
export default function PatientsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const [patients, setPatients] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const service = useMemo(() => getPatientService(), []);
    const loadPatients = useCallback(async () => {
        if (!clinicId)
            return;
        setLoading(true);
        try {
            const result = await service.getPatients(clinicId, search, {
                page,
                pageSize: ITEMS_PER_PAGE,
            });
            setPatients(result.data);
            setTotal(result.total);
        }
        catch {
            toast.error("Failed to load patients");
        }
        finally {
            setLoading(false);
        }
    }, [clinicId, service, search, page]);
    useEffect(() => {
        loadPatients();
    }, [loadPatients]);
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    return (<div className="space-y-6">
      <PageHeader title="Patients" description={`${total} total patient${total !== 1 ? "s" : ""}`}>
        <Link to="/patients/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4"/>
          New Patient
        </Link>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by name or phone..." className="w-full rounded-lg border bg-background px-3 py-2.5 pl-10 text-sm"/>
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <Search className="size-4 text-muted-foreground" />
        </div>
      </div>

      {loading ? (<div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground"/>
        </div>) : patients.length === 0 ? (<div className="flex flex-col items-center gap-3 py-16">
          <Users className="size-12 text-muted-foreground/40"/>
          <h3 className="text-lg font-medium">No patients yet</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {search ? "No patients match your search." : "Add your first patient to get started."}
          </p>
          {!search && (<Link to="/patients/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4"/>
              Add Patient
            </Link>)}
        </div>) : (<>
          {/* Desktop table */}
          <div className="hidden md:block">
            <PatientTable patients={patients}/>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {patients.map((patient) => (<PatientCard key={patient.id} patient={patient}/>))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
                Next
              </button>
            </div>)}
        </>)}
    </div>);
}
