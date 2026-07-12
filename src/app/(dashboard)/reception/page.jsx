"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Loader2, Search, UserPlus, ClipboardCheck, Clock, Users, Stethoscope,
  CheckCircle2, AlertCircle, X, Timer, ArrowRight, UserX, Phone,
  ChevronDown, User, Calendar, Hash
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getReceptionService } from "@/features/reception/services/reception.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const APPT_STATUS_STYLES = {
  scheduled: "text-blue-600 bg-blue-50",
  confirmed: "text-emerald-600 bg-emerald-50",
  arrived: "text-amber-600 bg-amber-50",
  in_progress: "text-purple-600 bg-purple-50",
  completed: "text-gray-500 bg-gray-100",
  cancelled: "text-red-500 bg-red-50",
  no_show: "text-red-400 bg-red-50",
};

const QUEUE_SECTION_STYLES = {
  waiting: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  in_triage: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  in_consultation: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  completed: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
};

function formatTime(timeStr) {
  if (!timeStr) return "";
  return String(timeStr).substring(0, 5);
}

function timeSince(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatsCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CheckInDialog({ open, onClose, clinicId, doctors, onSubmit, searchPatients }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [source, setSource] = useState("walk_in");
  const [submitting, setSubmitting] = useState(false);
  const [isExisting, setIsExisting] = useState(true);
  const searchTimeout = useRef(null);

  const [newPatient, setNewPatient] = useState({
    full_name: "", phone: "", gender: "", date_of_birth: "",
  });

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPatient(null);
      setSelectedDoctor("");
      setSource("walk_in");
      setIsExisting(true);
      setNewPatient({ full_name: "", phone: "", gender: "", date_of_birth: "" });
    }
  }, [open]);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPatients(clinicId, q);
        setSearchResults(results);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
  }, [clinicId, searchPatients]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.full_name);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (isExisting && !selectedPatient) { toast.error("Select a patient"); return; }
    if (!isExisting && (!newPatient.full_name || !newPatient.phone)) { toast.error("Name and phone are required"); return; }
    if (!selectedDoctor) { toast.error("Select a doctor"); return; }
    setSubmitting(true);
    try {
      if (isExisting) {
        await onSubmit({
          type: "existing",
          patient: selectedPatient,
          doctorId: selectedDoctor,
          source,
        });
      } else {
        await onSubmit({
          type: "new",
          patient: { ...newPatient, id: null },
          doctorId: selectedDoctor,
          source,
        });
      }
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, "Check-in failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Check In Patient</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button onClick={() => setIsExisting(true)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isExisting ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              Existing Patient
            </button>
            <button onClick={() => setIsExisting(false)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!isExisting ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              New Patient
            </button>
          </div>

          {isExisting ? (
            <div className="relative">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Search by name, phone, or NID</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => handleSelectPatient(p)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="size-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{p.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.phone} {p.gender ? `· ${p.gender}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-semibold">{selectedPatient.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedPatient.phone} {selectedPatient.gender ? `· ${selectedPatient.gender}` : ""}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Full Name *</label>
                <input value={newPatient.full_name} onChange={(e) => setNewPatient(p => ({ ...p, full_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Patient full name" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Phone *</label>
                <input value={newPatient.phone} onChange={(e) => setNewPatient(p => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Phone number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Gender</label>
                  <select value={newPatient.gender} onChange={(e) => setNewPatient(p => ({ ...p, gender: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Date of Birth</label>
                  <input type="date" value={newPatient.date_of_birth} onChange={(e) => setNewPatient(p => ({ ...p, date_of_birth: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Doctor *</label>
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option value="walk_in">Walk-in</option>
              <option value="phone">Phone Call</option>
              <option value="referral">Referral</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting && <Loader2 className="size-3 animate-spin" />} Check In
          </button>
        </div>
      </div>
    </div>
  );
}

function WalkInDialog({ open, onClose, clinicId, doctors, onSubmit }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", gender: "", date_of_birth: "",
    email: "", address: "",
  });
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ full_name: "", phone: "", gender: "", date_of_birth: "", email: "", address: "" });
      setSelectedDoctor("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) { toast.error("Name and phone are required"); return; }
    if (!selectedDoctor) { toast.error("Select a doctor"); return; }
    setSubmitting(true);
    try {
      await onSubmit({ patient: { ...form, id: null }, doctorId: selectedDoctor, reason });
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Register Walk-In</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Full Name *</label>
            <input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Patient full name" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Phone *</label>
            <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Phone number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Gender</label>
              <select value={form.gender} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Email" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Address (optional)</label>
              <input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Address" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Doctor *</label>
            <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase">Reason for Visit</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Fever, Follow-up, Vaccination" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting && <Loader2 className="size-3 animate-spin" />} Register & Check In
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReceptionPage() {
  const { user, clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getReceptionService(), []);

  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showWalkIn, setShowWalkIn] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [appts, q, docs] = await Promise.all([
        service.getTodayVisits(clinicId),
        service.getQueueStatus(clinicId),
        service.getDoctors(clinicId),
      ]);
      setAppointments(appts);
      setQueue(q);
      setDoctors(docs);
    } catch {
      toast.error("Failed to load reception data");
    } finally {
      setLoading(false);
    }
  }, [clinicId, service]);

  useEffect(() => { loadData(); }, [loadData]);

  const queueGrouped = useMemo(() => {
    const groups = { waiting: [], in_triage: [], in_consultation: [], completed: [] };
    queue.forEach((entry) => {
      if (entry.status === "completed" || entry.status === "cancelled") {
        groups.completed.push(entry);
      } else if (groups[entry.status]) {
        groups[entry.status].push(entry);
      } else {
        groups.waiting.push(entry);
      }
    });
    return groups;
  }, [queue]);

  const filteredAppointments = useMemo(() => {
    let items = appointments;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) =>
          (a.patient_name || "").toLowerCase().includes(q) ||
          (a.doctor_name || "").toLowerCase().includes(q) ||
          (a.patient_phone || "").includes(q)
      );
    }
    if (doctorFilter) {
      items = items.filter((a) => a.doctor_id === doctorFilter);
    }
    return items;
  }, [appointments, search, doctorFilter]);

  const handleCheckIn = useCallback(async ({ type, patient, doctorId, source }) => {
    if (!clinicId || !user) return;
    if (type === "existing") {
      const result = await service.checkInPatient(clinicId, patient.id, user.id);
      toast.success(`Checked in — Queue #${result.queue_number}`);
    } else {
      const result = await service.registerWalkIn(clinicId, patient, doctorId, user.id, source);
      toast.success(`Walk-in registered — Queue #${result.queue_number}`);
    }
    loadData();
  }, [clinicId, user, service, loadData]);

  const handleWalkIn = useCallback(async ({ patient, doctorId, reason }) => {
    if (!clinicId || !user) return;
    const result = await service.registerWalkIn(clinicId, patient, doctorId, user.id, reason);
    toast.success(`Walk-in registered — Queue #${result.queue_number}`);
    loadData();
  }, [clinicId, user, service, loadData]);

  const handleNoShow = useCallback(async (appointmentId) => {
    if (!clinicId || !user) return;
    try {
      await service.markNoShow(clinicId, appointmentId, user.id);
      toast.success("Marked as no-show");
      loadData();
    } catch (err) {
      toast.error(handleApiError(err, "Failed"));
    }
  }, [clinicId, user, service, loadData]);

  const handleAdvanceQueue = useCallback(async (queueId, newStatus) => {
    if (!clinicId) return;
    try {
      await service.updateQueueStatus(clinicId, queueId, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      loadData();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update status"));
    }
  }, [clinicId, service, loadData]);

  const waitingCount = queueGrouped.waiting.length;
  const triageCount = queueGrouped.in_triage.length;
  const consultCount = queueGrouped.in_consultation.length;
  const doneCount = queueGrouped.completed.length;

  return (
    <div className="space-y-5">
      <PageHeader title="Reception & Check-In" description="Unified front desk — appointments, queue, and walk-ins">
        <button onClick={() => setShowCheckIn(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <ClipboardCheck className="size-4" /> Check In
        </button>
        <button onClick={() => setShowWalkIn(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
          <UserPlus className="size-4" /> Register Walk-In
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatsCard icon={Clock} label="Waiting" value={waitingCount} color="bg-amber-100 text-amber-600" />
        <StatsCard icon={Stethoscope} label="In Triage" value={triageCount} color="bg-blue-100 text-blue-600" />
        <StatsCard icon={Users} label="Consultation" value={consultCount} color="bg-purple-100 text-purple-600" />
        <StatsCard icon={CheckCircle2} label="Completed" value={doneCount} color="bg-emerald-100 text-emerald-600" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, doctor, phone..."
                  className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">All doctors</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>

            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Time</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Patient</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase hidden sm:table-cell">Doctor</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Calendar className="mx-auto size-8 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">No appointments for today</p>
                        </td>
                      </tr>
                    ) : filteredAppointments.map((apt) => {
                      const isCheckinable = ["scheduled", "confirmed"].includes(apt.status);
                      return (
                        <tr key={apt.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" />
                              {formatTime(apt.start_time)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold">{apt.patient_name}</p>
                            <p className="text-[10px] text-muted-foreground sm:hidden">{apt.doctor_name}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{apt.doctor_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${APPT_STATUS_STYLES[apt.status] || "text-gray-500 bg-gray-100"}`}>
                              {apt.status?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isCheckinable && (
                                <button onClick={() => handleCheckIn({ type: "existing", patient: apt, doctorId: apt.doctor_id })}
                                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors">
                                  <ClipboardCheck className="size-3" /> Check In
                                </button>
                              )}
                              {isCheckinable && (
                                <button onClick={() => handleNoShow(apt.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-medium text-red-500 border-red-200 hover:bg-red-50 transition-colors">
                                  <UserX className="size-3" /> No Show
                                </button>
                              )}
                              {apt.status === "arrived" && (
                                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                  <Timer className="size-3" /> Waiting
                                </span>
                              )}
                              {apt.status === "in_progress" && (
                                <span className="text-[10px] text-purple-600 font-medium">With Doctor</span>
                              )}
                              {apt.status === "completed" && (
                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="size-3" /> Done
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Hash className="size-4 text-primary" /> Live Queue
            </h3>

            {[
              { key: "waiting", label: "Waiting", entries: queueGrouped.waiting },
              { key: "in_triage", label: "In Triage", entries: queueGrouped.in_triage },
              { key: "in_consultation", label: "With Doctor", entries: queueGrouped.in_consultation },
              { key: "completed", label: "Completed", entries: queueGrouped.completed },
            ].map((section) => {
              const styles = QUEUE_SECTION_STYLES[section.key];
              return (
                <div key={section.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${styles.dot}`} />
                      {section.label}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">{section.entries.length}</span>
                  </div>
                  {section.entries.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-white p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Empty</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {section.entries.map((entry) => (
                        <div key={entry.id}
                          className={`flex items-center gap-3 rounded-lg border ${styles.border} bg-white p-3 shadow-sm`}>
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}>
                            <span className={`text-sm font-bold ${styles.text}`}>#{entry.queue_number}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{entry.patients?.full_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {entry.users?.full_name || "Unassigned"}
                              {entry.started_at && ` · ${timeSince(entry.started_at)}`}
                              {entry.created_at && !entry.started_at && ` · ${timeSince(entry.created_at)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {entry.status === "waiting" && (
                              <button onClick={() => handleAdvanceQueue(entry.id, "in_consultation")}
                                className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-100 transition-colors">
                                <ArrowRight className="size-3" /> Start
                              </button>
                            )}
                            {entry.status === "in_consultation" && (
                              <button onClick={() => handleAdvanceQueue(entry.id, "completed")}
                                className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-100 transition-colors">
                                <CheckCircle2 className="size-3" /> Done
                              </button>
                            )}
                            {entry.status === "completed" && (
                              <CheckCircle2 className="size-4 text-emerald-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CheckInDialog
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        clinicId={clinicId}
        doctors={doctors}
        onSubmit={handleCheckIn}
        searchPatients={service.searchPatients}
      />
      <WalkInDialog
        open={showWalkIn}
        onClose={() => setShowWalkIn(false)}
        clinicId={clinicId}
        doctors={doctors}
        onSubmit={handleWalkIn}
      />
    </div>
  );
}
