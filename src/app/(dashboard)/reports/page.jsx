"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { DollarSign, Users, Stethoscope, Pill, ChevronDown, Loader2, Download, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
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
    { value: "revenue", label: "Revenue", icon: DollarSign },
    { value: "patients", label: "Patients", icon: Users },
    { value: "clinical", label: "Clinical", icon: Stethoscope },
    { value: "pharmacy", label: "Pharmacy", icon: Pill },
    { value: "providers", label: "Providers", icon: Users },
    { value: "insurance", label: "Insurance", icon: DollarSign },
];

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function MetricCard({ label, value, prefix, suffix, trend, icon: Icon, color }) {
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold tracking-tight">{prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}</p>
                </div>
                {Icon && <div className={`rounded-lg p-2 ${color || "bg-primary/10"}`}><Icon className={`size-4 ${color ? "text-white" : "text-primary"}`} /></div>}
            </div>
            {trend !== undefined && (
                <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(trend).toFixed(1)}% vs last period
                </div>
            )}
        </div>
    );
}

export default function ReportsPage() {
    const { clinic: authClinic } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getReportService(), []);
    const [period, setPeriod] = useState("today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [tab, setTab] = useState("revenue");
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
                case "revenue": result = await service.getRevenueReport(clinicId, periodParam); break;
                case "patients": result = await service.getPatientReport(clinicId, periodParam); break;
                case "clinical": result = await service.getClinicalReport(clinicId, periodParam); break;
                case "pharmacy": result = await service.getPharmacyReport(clinicId, periodParam); break;
                case "providers": result = await service.getProviderReport(clinicId, periodParam); break;
                case "insurance": result = await service.getInsuranceReport(clinicId, periodParam); break;
            }
            setData(result);
        } catch (err) { toast.error(handleApiError(err, "Failed to load report")); }
        finally { setLoading(false); }
    }, [clinicId, service, tab, period, customStart, customEnd]);

    useEffect(() => { load(); }, [load]);

    const activePeriod = PERIODS.find(p => p.value === period);

    function renderContent() {
        if (loading) return <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground"/></div>;
        if (!data) return <div className="py-16 text-center text-sm text-muted-foreground">No data available</div>;

        switch (tab) {
            case "revenue": return <RevenueReport data={data} />;
            case "patients": return <PatientReport data={data} />;
            case "clinical": return <ClinicalReport data={data} />;
            case "pharmacy": return <PharmacyReport data={data} />;
            case "providers": return <ProviderReport data={data} />;
            case "insurance": return <InsuranceReport data={data} />;
            default: return null;
        }
    }

    function handleExport() {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${tab}-report-${period}.json`;
        a.click(); URL.revokeObjectURL(url);
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
                                            className="w-full rounded-lg border border-border/80 bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full rounded-lg border border-border/80 bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <button onClick={handleExport} disabled={!data}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-50">
                    <Download className="size-4" /> Export
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

function RevenueReport({ data }) {
    const methodData = Object.entries(data.method_breakdown || {}).map(([name, value]) => ({ name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), value }));
    const statusData = Object.entries(data.claims_by_status || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total Billed" value={data.total_billed} prefix="RWF " icon={DollarSign} color="bg-blue-50" />
            <MetricCard label="Total Collected" value={data.total_collected} prefix="RWF " icon={TrendingUp} color="bg-emerald-50" />
            <MetricCard label="Outstanding" value={data.outstanding} prefix="RWF " icon={TrendingDown} color="bg-red-50" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
            {methodData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Payment Methods</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart><Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
            </div>}
            {statusData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Insurance Claims</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
            </div>}
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Invoices:</span> <span className="font-semibold">{data.invoice_count}</span></div>
                <div><span className="text-muted-foreground">Payments:</span> <span className="font-semibold">{data.payment_count}</span></div>
            </div>
        </div>
    </div>);
}

function PatientReport({ data }) {
    const genderData = Object.entries(data.gender_breakdown || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total Patients" value={data.total_patients} icon={Users} color="bg-primary/10" />
            <MetricCard label="New Patients" value={data.new_patients} icon={TrendingUp} color="bg-emerald-50" />
            <MetricCard label="Total Visits" value={data.total_visits} icon={Stethoscope} color="bg-blue-50" />
        </div>
        {genderData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">By Gender</h3>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
        </div>}
    </div>);
}

function ClinicalReport({ data }) {
    const diagData = (data.top_diagnoses || []).slice(0, 8);
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard label="Consultations" value={data.total_consultations} icon={Stethoscope} color="bg-primary/10" />
            <MetricCard label="Completed" value={data.completed} icon={TrendingUp} color="bg-emerald-50" />
            <MetricCard label="Prescriptions" value={data.total_prescriptions} icon={Pill} color="bg-blue-50" />
            <MetricCard label="Lab Orders" value={`${data.pending_labs || 0}/${data.total_lab_orders}`} icon={Stethoscope} color="bg-amber-50" />
        </div>
        {diagData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Top Diagnoses</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, diagData.length * 35)}>
                <BarChart data={diagData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={180} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>}
    </div>);
}

function PharmacyReport({ data }) {
    const topData = (data.top_dispensed || []).slice(0, 8);
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard label="Items Dispensed" value={data.total_dispensed} icon={Pill} color="bg-primary/10" />
            <MetricCard label="Dispensation Count" value={data.dispensed_count} icon={TrendingUp} color="bg-emerald-50" />
            <MetricCard label="Low Stock Items" value={data.low_stock_count} icon={TrendingDown} color="bg-red-50" />
            <MetricCard label="Near Expiry" value={data.near_expiry_count} icon={TrendingDown} color="bg-amber-50" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
            {topData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Top Dispensed Medicines</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, topData.length * 35)}>
                    <BarChart data={topData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">Inventory Value</h3>
                <p className="text-2xl font-bold">RWF {data.inventory_value?.toLocaleString()}</p>
                {data.low_stock_items?.length > 0 && <div className="mt-4">
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
        </div>
    </div>);
}

function ProviderReport({ data }) {
    const provData = (data.providers || []).map(p => ({ name: p.doctor_name, Consultations: p.total, Completed: p.completed }));
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Total Providers" value={provData.length} icon={Users} color="bg-primary/10" />
            <MetricCard label="Total Consultations" value={provData.reduce((s, p) => s + p.Consultations, 0)} icon={Stethoscope} color="bg-blue-50" />
        </div>
        {provData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Provider Performance</h3>
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
        </div>}
        {provData.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No provider data for this period</div>}
    </div>);
}

function InsuranceReport({ data }) {
    const statusData = Object.entries(data.by_status || {}).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    const byProvider = (data.by_provider || []).filter(p => p.provider !== "undefined");
    return (<div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard label="Total Claims" value={data.total_claims} icon={DollarSign} color="bg-primary/10" />
            <MetricCard label="Total Amount" value={data.total_amount} prefix="RWF " icon={TrendingUp} color="bg-blue-50" />
            <MetricCard label="Paid" value={data.paid_amount} prefix="RWF " icon={TrendingUp} color="bg-emerald-50" />
            <MetricCard label="Pending" value={data.pending_amount} prefix="RWF " icon={TrendingDown} color="bg-amber-50" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
            {statusData.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">Claims by Status</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
            </div>}
            {byProvider.length > 0 && <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-3">By Provider</h3>
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
            </div>}
        </div>
    </div>);
}
