"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Calendar, Clock, Users, DollarSign, Plus, ChevronRight,
  UserCheck, AlertCircle, Trash2, ArrowRightLeft, Edit2, X
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getSchedulingService } from "@/features/scheduling/services/scheduling.service";
import { getStaffService } from "@/features/staff/services/staff-service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const TABS = [
  { id: "schedules", label: "Doctor Schedules", icon: Calendar },
  { id: "queue", label: "Queue", icon: Users },
  { id: "shifts", label: "Shifts", icon: Clock },
  { id: "splits", label: "Provider Splits", icon: DollarSign },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const QUEUE_STATUS_STYLES = {
  waiting: "text-amber-600 bg-amber-50",
  in_consultation: "text-blue-600 bg-blue-50",
  completed: "text-emerald-600 bg-emerald-50",
  cancelled: "text-gray-600 bg-gray-50",
};

const FORMAT_CURRENCY = (amount) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount || 0);

export default function SchedulingPage() {
  const { clinic: authClinic, user } = useAuth();
  const clinicId = authClinic?.id;
  const service = useMemo(() => getSchedulingService(), []);
  const staffService = useMemo(() => getStaffService(), []);

  const [activeTab, setActiveTab] = useState("schedules");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);

  const [schedules, setSchedules] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedForm, setSchedForm] = useState({ doctor_id: "", day_of_week: "1", start_time: "08:00", end_time: "17:00", slot_duration: "30", max_patients: "20" });
  const [schedSaving, setSchedSaving] = useState(false);

  const [queueEntries, setQueueEntries] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueDate, setQueueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showQueueForm, setShowQueueForm] = useState(false);
  const [queueForm, setQueueForm] = useState({ patient_name: "", doctor_id: "", priority: "normal" });
  const [queueSaving, setQueueSaving] = useState(false);

  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: "", start_time: "08:00", end_time: "17:00", shift_type: "" });
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftDateRange, setShiftDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
  });

  const [splits, setSplits] = useState([]);
  const [showSplitForm, setShowSplitForm] = useState(false);
  const [splitForm, setSplitForm] = useState({ provider_id: "", service_type: "consultation", split_percentage: "50", effective_from: "" });
  const [splitSaving, setSplitSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const s = await staffService.getStaff(clinicId);
      setStaff(s);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load staff"));
    } finally {
      setLoading(false);
    }
  }, [clinicId, staffService]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSchedules = useCallback(async () => {
    if (!clinicId || !selectedDoctor) { setSchedules([]); return; }
    try {
      const data = await service.getDoctorSchedules(clinicId, selectedDoctor);
      setSchedules(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load schedules"));
    }
  }, [clinicId, service, selectedDoctor]);

  useEffect(() => { if (activeTab === "schedules") loadSchedules(); }, [activeTab, loadSchedules, selectedDoctor]);

  const loadQueue = useCallback(async () => {
    if (!clinicId) return;
    setQueueLoading(true);
    try {
      const data = await service.getQueueStatus(clinicId, queueDate);
      setQueueEntries(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load queue"));
    } finally {
      setQueueLoading(false);
    }
  }, [clinicId, service, queueDate]);

  useEffect(() => { if (activeTab === "queue") loadQueue(); }, [activeTab, loadQueue, queueDate]);

  const loadShifts = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [s, a] = await Promise.all([
        service.getShifts(clinicId),
        service.getStaffShiftAssignments(clinicId, shiftDateRange.from, shiftDateRange.to),
      ]);
      setShifts(s);
      setShiftAssignments(a);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load shifts"));
    }
  }, [clinicId, service, shiftDateRange]);

  useEffect(() => { if (activeTab === "shifts") loadShifts(); }, [activeTab, loadShifts]);

  const loadSplits = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await service.getProviderRevenueSplits(clinicId);
      setSplits(data);
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load revenue splits"));
    }
  }, [clinicId, service]);

  useEffect(() => { if (activeTab === "splits") loadSplits(); }, [activeTab, loadSplits]);

  const handleSaveSchedule = useCallback(async () => {
    if (!clinicId || !schedForm.doctor_id) {
      toast.error("Please select a doctor");
      return;
    }
    setSchedSaving(true);
    try {
      await service.createDoctorSchedule(clinicId, {
        doctor_id: schedForm.doctor_id,
        day_of_week: parseInt(schedForm.day_of_week),
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
        slot_duration: parseInt(schedForm.slot_duration) || 30,
        max_patients: parseInt(schedForm.max_patients) || 20,
      });
      toast.success("Schedule created");
      setShowScheduleForm(false);
      setSchedForm({ doctor_id: selectedDoctor || "", day_of_week: "1", start_time: "08:00", end_time: "17:00", slot_duration: "30", max_patients: "20" });
      loadSchedules();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save schedule"));
    } finally {
      setSchedSaving(false);
    }
  }, [clinicId, schedForm, selectedDoctor, service, loadSchedules]);

  const handleAddToQueue = useCallback(async () => {
    if (!clinicId) return;
    setQueueSaving(true);
    try {
      await service.addToQueue(clinicId, {
        patient_id: queueForm.patient_name,
        doctor_id: queueForm.doctor_id || null,
        queue_date: queueDate,
        priority: queueForm.priority,
      });
      toast.success("Patient added to queue");
      setShowQueueForm(false);
      setQueueForm({ patient_name: "", doctor_id: "", priority: "normal" });
      loadQueue();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to add to queue"));
    } finally {
      setQueueSaving(false);
    }
  }, [clinicId, queueForm, queueDate, service, loadQueue]);

  const handleUpdateQueueStatus = useCallback(async (queueId, status) => {
    if (!clinicId) return;
    try {
      await service.updateQueuePosition(clinicId, queueId, status);
      toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
      loadQueue();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to update status"));
    }
  }, [clinicId, service, loadQueue]);

  const handleSaveShift = useCallback(async () => {
    if (!clinicId || !shiftForm.name) {
      toast.error("Shift name is required");
      return;
    }
    setShiftSaving(true);
    try {
      await service.createShift(clinicId, {
        name: shiftForm.name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        shift_type: shiftForm.shift_type || null,
      });
      toast.success("Shift created");
      setShowShiftForm(false);
      setShiftForm({ name: "", start_time: "08:00", end_time: "17:00", shift_type: "" });
      loadShifts();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to create shift"));
    } finally {
      setShiftSaving(false);
    }
  }, [clinicId, shiftForm, service, loadShifts]);

  const handleSaveSplit = useCallback(async () => {
    if (!clinicId || !splitForm.provider_id) {
      toast.error("Provider is required");
      return;
    }
    setSplitSaving(true);
    try {
      await service.createProviderRevenueSplit(clinicId, {
        provider_id: splitForm.provider_id,
        service_type: splitForm.service_type,
        split_percentage: parseFloat(splitForm.split_percentage) || 50,
        effective_from: splitForm.effective_from || new Date().toISOString().split("T")[0],
      });
      toast.success("Revenue split saved");
      setShowSplitForm(false);
      setSplitForm({ provider_id: "", service_type: "consultation", split_percentage: "50", effective_from: "" });
      loadSplits();
    } catch (err) {
      toast.error(handleApiError(err, "Failed to save split"));
    } finally {
      setSplitSaving(false);
    }
  }, [clinicId, splitForm, service, loadSplits]);

  const queueGrouped = useMemo(() => {
    const groups = { waiting: [], in_consultation: [], completed: [] };
    queueEntries.forEach(e => {
      const key = e.status === "cancelled" ? "completed" : (groups[e.status] ? e.status : "waiting");
      groups[key].push(e);
    });
    return groups;
  }, [queueEntries]);

  const shiftWeekDays = useMemo(() => {
    const start = new Date(shiftDateRange.from + "T00:00:00");
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, [shiftDateRange]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Scheduling & Queue" description="Manage doctor schedules, patient queue, and staff shifts" />

      <div className="flex items-center gap-1 rounded-xl border bg-white p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}>
              <Icon className="size-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={selectedDoctor} onChange={e => { setSelectedDoctor(e.target.value); setSchedForm(prev => ({ ...prev, doctor_id: e.target.value })); }}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select doctor</option>
              {staff.filter(s => s.roles?.some(r => r.name === "Doctor" || r.name === "Nurse")).map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            <button onClick={() => { setShowScheduleForm(!showScheduleForm); setSchedForm(prev => ({ ...prev, doctor_id: selectedDoctor })); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Schedule
            </button>
          </div>

          {showScheduleForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New Schedule Slot</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Doctor</label>
                  <select value={schedForm.doctor_id} onChange={e => setSchedForm(prev => ({ ...prev, doctor_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Day of Week</label>
                  <select value={schedForm.day_of_week} onChange={e => setSchedForm(prev => ({ ...prev, day_of_week: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    {DAYS_OF_WEEK.map((day, i) => <option key={i} value={i}>{day}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Start</label>
                    <input type="time" value={schedForm.start_time} onChange={e => setSchedForm(prev => ({ ...prev, start_time: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase">End</label>
                    <input type="time" value={schedForm.end_time} onChange={e => setSchedForm(prev => ({ ...prev, end_time: e.target.value }))}
                      className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Slot (min)</label>
                  <input type="number" min="5" value={schedForm.slot_duration} onChange={e => setSchedForm(prev => ({ ...prev, slot_duration: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Max Patients</label>
                  <input type="number" min="1" value={schedForm.max_patients} onChange={e => setSchedForm(prev => ({ ...prev, max_patients: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSaveSchedule} disabled={schedSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {schedSaving && <Loader2 className="size-3 animate-spin" />} Save Schedule
                </button>
                <button onClick={() => setShowScheduleForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!selectedDoctor ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Calendar className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a doctor to view schedules</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Clock className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No schedules configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map(sched => (
                <div key={sched.id} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{DAYS_OF_WEEK[sched.day_of_week]}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {sched.start_time?.substring(0, 5)} — {sched.end_time?.substring(0, 5)}
                      · {sched.slot_duration}min slots · Max {sched.max_patients}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    sched.is_active ? "text-emerald-600 bg-emerald-50" : "text-gray-600 bg-gray-50"
                  }`}>
                    {sched.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="date" value={queueDate} onChange={e => setQueueDate(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={() => setShowQueueForm(!showQueueForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Patient
            </button>
          </div>

          {showQueueForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">Add to Queue</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Patient ID *</label>
                  <input value={queueForm.patient_name} onChange={e => setQueueForm(prev => ({ ...prev, patient_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Patient ID" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Doctor</label>
                  <select value={queueForm.doctor_id} onChange={e => setQueueForm(prev => ({ ...prev, doctor_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Unassigned</option>
                    {staff.filter(s => s.roles?.some(r => r.name === "Doctor")).map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Priority</label>
                  <select value={queueForm.priority} onChange={e => setQueueForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleAddToQueue} disabled={queueSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {queueSaving && <Loader2 className="size-3 animate-spin" />} Add to Queue
                </button>
                <button onClick={() => setShowQueueForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {queueLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : queueEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <Users className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Queue is empty for this date</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { key: "waiting", label: "Waiting", entries: queueGrouped.waiting },
                { key: "in_consultation", label: "In Consultation", entries: queueGrouped.in_consultation },
                { key: "completed", label: "Completed", entries: queueGrouped.completed },
              ].map(col => (
                <div key={col.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">{col.label}</h4>
                    <span className="text-[10px] text-muted-foreground">{col.entries.length}</span>
                  </div>
                  {col.entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-white p-4 text-center">
                      <p className="text-[10px] text-muted-foreground">No patients</p>
                    </div>
                  ) : col.entries.map(entry => (
                    <div key={entry.id} className="rounded-xl border bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">#{entry.queue_number} {entry.patients?.full_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.users?.full_name || "Unassigned"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${entry.priority === "urgent" ? "text-amber-600 bg-amber-50" : entry.priority === "emergency" ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50"}`}>
                          {entry.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.status === "waiting" && (
                          <button onClick={() => handleUpdateQueueStatus(entry.id, "in_consultation")}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors">
                            <ChevronRight className="size-3" /> Start
                          </button>
                        )}
                        {entry.status === "in_consultation" && (
                          <button onClick={() => handleUpdateQueueStatus(entry.id, "completed")}
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors">
                            <UserCheck className="size-3" /> Complete
                          </button>
                        )}
                        {entry.status === "completed" && (
                          <span className="text-[10px] text-emerald-600">Done</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "shifts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input type="date" value={shiftDateRange.from} onChange={e => setShiftDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="rounded-lg border bg-white px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
              <span className="text-xs text-muted-foreground">—</span>
              <input type="date" value={shiftDateRange.to} onChange={e => setShiftDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="rounded-lg border bg-white px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button onClick={() => setShowShiftForm(!showShiftForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> New Shift
            </button>
          </div>

          {showShiftForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">Create Shift</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Shift Name *</label>
                  <input value={shiftForm.name} onChange={e => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Morning Shift" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Start Time</label>
                  <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">End Time</label>
                  <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSaveShift} disabled={shiftSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {shiftSaving && <Loader2 className="size-3 animate-spin" />} Create Shift
                </button>
                <button onClick={() => setShowShiftForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {shifts.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h4 className="text-xs font-semibold mb-3">Available Shifts</h4>
              <div className="flex flex-wrap gap-2">
                {shifts.map(shift => (
                  <span key={shift.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium">
                    {shift.name} · {shift.start_time?.substring(0, 5)}—{shift.end_time?.substring(0, 5)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase sticky left-0 bg-white">Staff</th>
                    {shiftWeekDays.map(d => (
                      <th key={d} className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase text-center min-w-[100px]">
                        {new Date(d + "T00:00:00").toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.slice(0, 10).map(s => (
                    <tr key={s.id} className="hover:bg-muted/10">
                      <td className="px-3 py-2 text-xs font-medium sticky left-0 bg-white">{s.full_name}</td>
                      {shiftWeekDays.map(d => {
                        const assignment = shiftAssignments.find(a => a.staff_id === s.id && a.date === d);
                        return (
                          <td key={d} className="px-3 py-2 text-center">
                            {assignment ? (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {assignment.shifts?.name || "Assigned"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "splits" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Provider Revenue Splits</h3>
            <button onClick={() => setShowSplitForm(!showSplitForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="size-3.5" /> Add Split
            </button>
          </div>

          {showSplitForm && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold">New Revenue Split</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Provider *</label>
                  <select value={splitForm.provider_id} onChange={e => setSplitForm(prev => ({ ...prev, provider_id: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select provider</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Service Type</label>
                  <select value={splitForm.service_type} onChange={e => setSplitForm(prev => ({ ...prev, service_type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="consultation">Consultation</option>
                    <option value="procedure">Procedure</option>
                    <option value="surgery">Surgery</option>
                    <option value="all">All Services</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Split %</label>
                  <input type="number" min="0" max="100" value={splitForm.split_percentage} onChange={e => setSplitForm(prev => ({ ...prev, split_percentage: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Effective From</label>
                  <input type="date" value={splitForm.effective_from} onChange={e => setSplitForm(prev => ({ ...prev, effective_from: e.target.value }))}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSaveSplit} disabled={splitSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {splitSaving && <Loader2 className="size-3 animate-spin" />} Save Split
                </button>
                <button onClick={() => setShowSplitForm(false)}
                  className="rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {splits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border bg-white">
              <DollarSign className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No revenue splits configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {splits.map(split => (
                <div key={split.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{split.provider_id?.substring(0, 8)}...</p>
                      <p className="text-[10px] text-muted-foreground">
                        {split.service_type} · {split.split_percentage}%
                        {split.effective_from ? ` · From: ${new Date(split.effective_from).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary">{split.split_percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
