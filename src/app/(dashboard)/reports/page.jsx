"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { DollarSign, Users, Stethoscope, Pill, ChevronDown, Loader2, Download, TrendingUp, TrendingDown, CalendarDays, Activity, BedDouble, Camera, Receipt, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getReportService } from "@/features/reports/services/report.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const PERIODS = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
    { value: "7", label: "Last 7 Days" },
    { value: "30", label: "Last 30 Days" },
    { value: "90", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" },
];

const REPORT_TABS = [
    { value: "overview", label: "Overview", icon: Activity },
    { value: "revenue", label: "Revenue", icon: DollarSign },
    { value: "patients", label: "Patients", icon: Users },
    { value: "appointments", label: "Appointments", icon: CalendarDays },
    { value: "clinical", label: "Clinical", icon: Stethoscope },
    { value: "pharmacy", label: "Pharmacy", icon: Pill },
    { value: "radiology", label: "Radiology", icon: Camera },
    { value: "providers", label: "Providers", icon: Users },
    { value: "insurance", label: "Insurance", icon: FileText },
    { value: "expenses", label: "Expenses", icon: Receipt },
];

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

function MetricCard({ label, value, prefix, suffix, trend, icon: Icon, color, subtitle }) {
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold tracking-tight">{prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}</p>
                    {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
                </div>
                {Icon && <div className={`rounded-lg p-2 ${color || "bg-primary/10"}`}><Icon className={`size-4 ${color ? "text-white" : "text-primary"}`} /></div>}
            </div>
            {trend !== undefined && trend !== null && (
                <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(trend).toFixed(1)}% vs prev period
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, children, className = "" }) {
    return (
        <div className={`rounded-xl border bg-white p-5 shadow-sm ${className}`}>
            <h3 className="text-sm font-semibold mb-3">{title}</h3>
            {children}
        </div>
    );
}

export default function ReportsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getReportService(), []);
    const [period, setPeriod] = useState("month");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [tab, setTab] = useState("overview");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodOpen, setPeriodOpen] = useState(false);

    const load = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        try {
            const periodParam = period === "custom" && customStart && customEnd
                ? { start: customStart, end: customEnd }
                : period;
            let result;
            switch (tab) {
                case "overview": result = await service.getOverviewReport(clinicId, periodParam); break;
                case "revenue": result = await service.getRevenueReport(clinicId, periodParam); break;
                case "patients": result = await service.getPatientReport(clinicId, periodParam); break;
                case "appointments": result = await service.getAppointmentsReport(clinicId, periodParam); break;
                case "clinical": result = await service.getClinicalReport(clinicId, periodParam); break;
                case "pharmacy": result = await service.getPharmacyReport(clinicId, periodParam); break;
                case "radiology": result = await service.getRadiologyReport(clinicId, periodParam); break;
                case "providers": result = await service.getProviderReport(clinicId, periodParam); break;
                case "insurance": result = await service.getInsuranceReport(clinicId, periodParam); break;
                case "expenses": result = await service.getExpenseReport(clinicId, periodParam); break;
            }
            setData(result);
        } catch (err) { toast.error(handleApiError(err, "Failed to load report")); }
        finally { setLoading(false); }
    }, [clinicId, service, tab, period, customStart, customEnd]);

    useEffect(() => { load(); }, [load]);

    const activePeriod = PERIODS.find(p => p.value === period);

    function handleExport() {
        if (!data) return;
        let rows = [];
        let filename = `${tab}-report`;
        if (tab === "overview") {
            rows = [{ metric: "Total Patients", value: data.total_patients }, { metric: "New Patients", value: data.new_patients }, { metric: "Revenue", value: data.total_revenue }, { metric: "Expenses", value: data.total_expenses }, { metric: "Net Income", value: data.net_income }, { metric: "Appointments", value: data.appointments_total }, { metric: "Consultations", value: data.consultation_count }];
        } else if (tab === "revenue") {
            rows = [{ metric: "Total Billed", value: data.total_billed }, { metric: "Total Collected", value: data.total_collected }, { metric: "Outstanding", value: data.outstanding }, { metric: "Invoices", value: data.invoice_count }];
        } else if (tab === "patients") {
            rows = [{ metric: "Total Patients", value: data.total_patients }, { metric: "New Patients", value: data.new_patients }, { metric: "Visits", value: data.total_visits }];
        } else if (tab === "appointments") {
            rows = data.by_status || [];
        } else if (tab === "clinical") {
            rows = data.top_diagnoses || [];
        } else if (tab === "pharmacy") {
            rows = data.top_dispensed || [];
        } else if (tab === "radiology") {
            rows = data.by_modality || [];
        } else if (tab === "providers") {
            rows = data.providers || [];
        } else if (tab === "insurance") {
            rows = data.by_provider || [];
        } else if (tab === "expenses") {
            rows = data.by_category || [];
        }
        service.exportToCSV(rows, `${filename}-${period}`);
        toast.success("Exported to CSV");
    }

    function renderContent() {
        if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
        if (!data) return <div className="py-16 text-center text-sm text-muted-foreground">No data available</div>;

        switch (tab) {
            case "overview": return <OverviewReport data={data} />;
            case "revenue": return <RevenueReport data={data} />;
            case "patients": return <PatientReport data={data} />;
            case "appointments": return <AppointmentsReport data={data} />;
            case "clinical": return <ClinicalReport data={data} />;
            case "pharmacy": return <PharmacyReport data={data} />;
            case "radiology": return <RadiologyReport data={data} />;
            case "providers": return <ProviderReport data={data} />;
            case "insurance": return <InsuranceReport data={data} />;
            case "expenses": return <ExpenseReport data={data} />;
            default: return null;
        }
    }

    return (
        <div className="space-y-5">
            <PageHeader title="Reports & Analytics" description="Clinic performance at a glance">
                <div className="relative">
                    <button onClick={() => setPeriodOpen(!periodOpen)}
                        className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {activePeriod?.label || period}
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                    {periodOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setPeriodOpen(false)} />
                            <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border bg-white p-1 shadow-lg">
                                {PERIODS.map(p => (
                                    <button key={p.value} onClick={() => { setPeriod(p.value); if (p.value !== "custom") setPeriodOpen(false); }}
                                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${period === p.value ? "bg-primary/10 text-primary" : "hover:bg-muted/30"}`}>
                                        {p.label}
                                    </button>
                                ))}
                                {period === "custom" && (
                                    <div className="space-y-2 border-t px-2 py-2">
                                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full rounded-lg border px-2 py-1.5 text-xs" />
                                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full rounded-lg border px-2 py-1.5 text-xs" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <button onClick={handleExport} disabled={!data}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-50">
                    <Download className="size-4" /> Export CSV
                </button>
            </PageHeader>

            <div className="flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm overflow-x-auto">
                {REPORT_TABS.map(t => (
                    <button key={t.value} onClick={() => setTab(t.value)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${tab === t.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                        <t.icon className="size-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    );
}

function OverviewReport({ data }) {
    const apptRate = data.appointments_total > 0 ? ((data.appointments_completed / data.appointments_total) * 100).toFixed(0) : 0;
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Patients" value={data.total_patients} icon={Users} color="bg-blue-500" subtitle={`${data.new_patients} new`} />
                <MetricCard label="Revenue" value={data.total_revenue} prefix="RWF " icon={DollarSign} color="bg-emerald-500" subtitle={`Net: RWF ${data.net_income?.toLocaleString()}`} />
                <MetricCard label="Consultations" value={data.consultation_count} icon={Stethoscope} color="bg-purple-500" subtitle={`${data.consultation_completed} completed`} />
                <MetricCard label="Appointments" value={data.appointments_total} icon={CalendarDays} color="bg-sky-500" subtitle={`${apptRate}% completion`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Expenses" value={data.total_expenses} prefix="RWF " icon={Receipt} color="bg-red-500" />
                <MetricCard label="No-Shows" value={data.appointments_no_show} icon={TrendingDown} color="bg-amber-500" />
                <MetricCard label="Radiology Pending" value={data.radiology_ordered} icon={Camera} color="bg-indigo-500" subtitle={`${data.radiology_completed} completed`} />
                <MetricCard label="Low Stock Items" value={data.low_stock_items} icon={Pill} color="bg-orange-500" />
            </div>
            {data.expense_categories?.length > 0 && (
                <div className="grid gap-5 lg:grid-cols-2">
                    <ChartCard title="Expense Breakdown">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={data.expense_categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {data.expense_categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => `RWF ${Number(v).toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Quick Stats">
                        <div className="space-y-3">
                            {[
                                { label: "Appointments Completed", value: data.appointments_completed, total: data.appointments_total, color: "bg-emerald-500" },
                                { label: "Consultations Done", value: data.consultation_completed, total: data.consultation_count, color: "bg-blue-500" },
                                { label: "Radiology Done", value: data.radiology_completed, total: data.radiology_ordered + data.radiology_completed, color: "bg-purple-500" },
                            ].map(s => (
                                <div key={s.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className="font-medium">{s.value}/{s.total}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted/30">
                                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.total > 0 ? (s.value / s.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
}

function RevenueReport({ data }) {
    const methodData = Object.entries(data.method_breakdown || {}).map(([name, value]) => ({ name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), value }));
    const statusData = Object.entries(data.claims_by_status || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Total Billed" value={data.total_billed} prefix="RWF " icon={DollarSign} color="bg-blue-500" trend={data.trend} />
                <MetricCard label="Total Collected" value={data.total_collected} prefix="RWF " icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Outstanding" value={data.outstanding} prefix="RWF " icon={TrendingDown} color="bg-red-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {methodData.length > 0 && <ChartCard title="Payment Methods">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip formatter={(v) => `RWF ${Number(v).toLocaleString()}`} /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {statusData.length > 0 && <ChartCard title="Insurance Claims">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border bg-white p-4"><span className="text-muted-foreground text-xs">Invoices</span><p className="text-xl font-bold">{data.invoice_count}</p></div>
                <div className="rounded-xl border bg-white p-4"><span className="text-muted-foreground text-xs">Payments</span><p className="text-xl font-bold">{data.payment_count}</p></div>
            </div>
        </div>
    );
}

function PatientReport({ data }) {
    const genderData = Object.entries(data.gender_breakdown || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Total Patients" value={data.total_patients} icon={Users} color="bg-blue-500" />
                <MetricCard label="New Patients" value={data.new_patients} icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Total Visits" value={data.total_visits} icon={Stethoscope} color="bg-purple-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {genderData.length > 0 && <ChartCard title="By Gender">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.age_distribution?.length > 0 && <ChartCard title="Age Distribution">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.age_distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="group" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
            </div>
        </div>
    );
}

function AppointmentsReport({ data }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Appointments" value={data.total} icon={CalendarDays} color="bg-blue-500" />
                <MetricCard label="Completed" value={data.completed} icon={TrendingUp} color="bg-emerald-500" subtitle={`${data.completion_rate}%`} />
                <MetricCard label="No-Shows" value={data.no_shows} icon={TrendingDown} color="bg-red-500" subtitle={`${data.no_show_rate}% rate`} />
                <MetricCard label="Cancelled" value={data.cancelled} icon={TrendingDown} color="bg-amber-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {data.by_day?.length > 0 && <ChartCard title="By Day of Week">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.by_day}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.by_hour?.length > 0 && <ChartCard title="By Hour of Day">
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.by_hour}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b98133" /></AreaChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.by_type?.length > 0 && <ChartCard title="By Type">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={data.by_type} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {data.by_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.by_status?.length > 0 && <ChartCard title="By Status">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.by_status}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
            </div>
        </div>
    );
}

function ClinicalReport({ data }) {
    const diagData = (data.top_diagnoses || []).slice(0, 8);
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Consultations" value={data.total_consultations} icon={Stethoscope} color="bg-blue-500" />
                <MetricCard label="Completed" value={data.completed} icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Prescriptions" value={data.total_prescriptions} icon={Pill} color="bg-purple-500" />
                <MetricCard label="Lab Orders" value={`${data.pending_labs || 0}/${data.total_lab_orders}`} icon={Activity} color="bg-amber-500" subtitle="pending/total" />
            </div>
            {diagData.length > 0 && <ChartCard title="Top Diagnoses">
                <ResponsiveContainer width="100%" height={Math.max(200, diagData.length * 35)}>
                    <BarChart data={diagData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={200} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>}
        </div>
    );
}

function PharmacyReport({ data }) {
    const topData = (data.top_dispensed || []).slice(0, 8);
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Items Dispensed" value={data.total_dispensed} icon={Pill} color="bg-blue-500" />
                <MetricCard label="Dispensations" value={data.dispensed_count} icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Low Stock" value={data.low_stock_count} icon={TrendingDown} color="bg-red-500" />
                <MetricCard label="Near Expiry" value={data.near_expiry_count} icon={TrendingDown} color="bg-amber-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {topData.length > 0 && <ChartCard title="Top Dispensed Medicines">
                    <ResponsiveContainer width="100%" height={Math.max(200, topData.length * 35)}>
                        <BarChart data={topData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                            <Tooltip />
                            <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
                <ChartCard title="Inventory Value">
                    <div className="space-y-4">
                        <div><p className="text-2xl font-bold">RWF {data.inventory_value?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Selling value</p></div>
                        <div><p className="text-lg font-semibold">RWF {data.inventory_cost?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Cost value</p></div>
                        {data.low_stock_items?.length > 0 && <div>
                            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Low Stock Alerts</h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {data.low_stock_items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-red-500">{item.stock}/{item.min} {item.unit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}

function RadiologyReport({ data }) {
    const modalityData = (data.by_modality || []).map(m => ({ ...m, name: m.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }));
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Orders" value={data.total_orders} icon={Camera} color="bg-blue-500" />
                <MetricCard label="Completed" value={data.completed} icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Pending" value={data.pending} icon={Activity} color="bg-amber-500" />
                <MetricCard label="Urgent" value={data.urgent_count} icon={TrendingDown} color="bg-red-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {modalityData.length > 0 && <ChartCard title="By Modality">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={modalityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.by_status?.length > 0 && <ChartCard title="By Status">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={data.by_status} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {data.by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.by_body_part?.length > 0 && <ChartCard title="Top Body Parts" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={Math.max(200, data.by_body_part.length * 30)}>
                        <BarChart data={data.by_body_part} layout="vertical" margin={{ left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>}
            </div>
        </div>
    );
}

function ProviderReport({ data }) {
    const provData = (data.providers || []).map(p => ({ name: p.doctor_name, Consultations: p.total, Completed: p.completed }));
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Active Providers" value={provData.length} icon={Users} color="bg-blue-500" />
                <MetricCard label="Total Consultations" value={provData.reduce((s, p) => s + p.Consultations, 0)} icon={Stethoscope} color="bg-emerald-500" />
            </div>
            {provData.length > 0 && <ChartCard title="Provider Performance">
                <ResponsiveContainer width="100%" height={Math.max(200, provData.length * 50)}>
                    <BarChart data={provData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Consultations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>}
            {provData.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No provider data for this period</div>}
        </div>
    );
}

function InsuranceReport({ data }) {
    const statusData = Object.entries(data.by_status || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    const byProvider = (data.by_provider || []).filter(p => p.provider !== "undefined");
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Claims" value={data.total_claims} icon={FileText} color="bg-blue-500" />
                <MetricCard label="Total Amount" value={data.total_amount} prefix="RWF " icon={DollarSign} color="bg-purple-500" />
                <MetricCard label="Paid" value={data.paid_amount} prefix="RWF " icon={TrendingUp} color="bg-emerald-500" />
                <MetricCard label="Pending" value={data.pending_amount} prefix="RWF " icon={TrendingDown} color="bg-amber-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {statusData.length > 0 && <ChartCard title="Claims by Status">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {byProvider.length > 0 && <ChartCard title="By Provider">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {byProvider.map((p, i) => (
                            <div key={i} className="rounded-lg border bg-muted/5 px-3 py-2">
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span>{p.provider}</span>
                                    <span>RWF {p.total?.toLocaleString()}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                                    <span className="text-emerald-600">{p.paid} paid</span>
                                    <span className="text-amber-600">{p.pending} pending</span>
                                    <span className="text-red-500">{p.rejected} rejected</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>}
            </div>
        </div>
    );
}

function ExpenseReport({ data }) {
    return (
        <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Total Expenses" value={data.total_expenses} prefix="RWF " icon={Receipt} color="bg-red-500" />
                <MetricCard label="Expense Items" value={data.count} icon={TrendingDown} color="bg-amber-500" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                {data.by_category?.length > 0 && <ChartCard title="By Category">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={data.by_category} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie><Tooltip formatter={(v) => `RWF ${Number(v).toLocaleString()}`} /></PieChart>
                    </ResponsiveContainer>
                </ChartCard>}
                {data.top_expenses?.length > 0 && <ChartCard title="Top Expenses">
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {data.top_expenses.map((e, i) => (
                            <div key={i} className="flex items-center justify-between text-xs border-b pb-1.5">
                                <div>
                                    <p className="font-medium">{e.description || "Untitled"}</p>
                                    <p className="text-muted-foreground">{e.category || "Other"} · {e.date}</p>
                                </div>
                                <span className="font-semibold">RWF {Number(e.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </ChartCard>}
            </div>
            {data.by_category?.length > 0 && <ChartCard title="Category Comparison">
                <ResponsiveContainer width="100%" height={Math.max(200, data.by_category.length * 40)}>
                    <BarChart data={data.by_category} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip formatter={(v) => `RWF ${Number(v).toLocaleString()}`} />
                        <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>}
        </div>
    );
}
