"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Loader2, Database, Plus, Pencil, Trash2, Search, X, Check,
    Shield, Beaker, Pill, Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getMasterDataService } from "@/features/master-data/services/master-data.service";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

const TABS = [
    { id: "providers", label: "Insurance Providers", icon: Shield },
    { id: "services", label: "Services", icon: Stethoscope },
    { id: "lab_tests", label: "Lab Tests", icon: Beaker },
    { id: "medicines", label: "Medicines", icon: Pill },
];

const EMPTY_PROVIDER = { name: "", coverage_percent: "80", contact_name: "", contact_phone: "", contact_email: "", notes: "" };
const EMPTY_SERVICE = { name: "", category: "", price: "", tax_classification: "" };
const EMPTY_LAB_TEST = { name: "", category: "", sample_type: "", reference_range: "", price: "" };
const EMPTY_MEDICINE = { name: "", generic_name: "", strength: "", form: "", unit: "tablet", category: "" };

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">Cancel</button>
                    <button onClick={onConfirm} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    );
}

function InlineForm({ fields, values, onChange, onSave, onCancel, saving }) {
    return (
        <tr className="bg-blue-50/60">
            <td colSpan={fields.length + 1} className="p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                    {fields.map(f => (
                        <div key={f.key}>
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">{f.label}{f.required ? " *" : ""}</label>
                            {f.type === "select" ? (
                                <select value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}
                                    className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20">
                                    <option value="">{f.placeholder || "Select"}</option>
                                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : (
                                <input type={f.type || "text"} value={values[f.key] || ""} onChange={e => onChange(f.key, e.target.value)}
                                    placeholder={f.placeholder || ""}
                                    className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50">Cancel</button>
                    <button onClick={onSave} disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {saving && <Loader2 className="size-3 animate-spin" />}
                        Save
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function MasterDataPage() {
    const { clinic: authClinic, user } = useAuth();
    const clinicId = authClinic?.id;
    const service = useMemo(() => getMasterDataService(), []);

    const [activeTab, setActiveTab] = useState("providers");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [providers, setProviders] = useState([]);
    const [services, setServices] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [medicines, setMedicines] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [serviceCategories, setServiceCategories] = useState([]);

    const loadProviders = useCallback(async () => {
        if (!clinicId) return;
        try {
            const data = await service.getInsuranceProviders(clinicId);
            setProviders(data);
        } catch { toast.error("Failed to load insurance providers"); }
    }, [clinicId, service]);

    const loadServices = useCallback(async () => {
        if (!clinicId) return;
        try {
            const data = await service.getServices(clinicId);
            setServices(data);
            const cats = [...new Set(data.map(s => s.category).filter(Boolean))];
            setServiceCategories(cats.sort());
        } catch { toast.error("Failed to load services"); }
    }, [clinicId, service]);

    const loadLabTests = useCallback(async () => {
        if (!clinicId) return;
        try {
            const data = await service.getLabTests(clinicId);
            setLabTests(data);
        } catch { toast.error("Failed to load lab tests"); }
    }, [clinicId, service]);

    const loadMedicines = useCallback(async () => {
        if (!clinicId) return;
        try {
            const data = await service.getMedicines(clinicId);
            setMedicines(data);
        } catch { toast.error("Failed to load medicines"); }
    }, [clinicId, service]);

    const loadAll = useCallback(async () => {
        if (!clinicId) return;
        setLoading(true);
        await Promise.all([loadProviders(), loadServices(), loadLabTests(), loadMedicines()]);
        setLoading(false);
    }, [clinicId, loadProviders, loadServices, loadLabTests, loadMedicines]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleFormChange = (key, value) => setFormValues(prev => ({ ...prev, [key]: value }));

    const openAdd = () => {
        setEditingId(null);
        setShowForm(true);
        if (activeTab === "providers") setFormValues(EMPTY_PROVIDER);
        else if (activeTab === "services") setFormValues(EMPTY_SERVICE);
        else if (activeTab === "lab_tests") setFormValues(EMPTY_LAB_TEST);
        else if (activeTab === "medicines") setFormValues(EMPTY_MEDICINE);
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setShowForm(true);
        if (activeTab === "providers") {
            setFormValues({ name: item.name || "", coverage_percent: item.coverage_percent?.toString() || "80", contact_name: item.contact_name || "", contact_phone: item.contact_phone || "", contact_email: item.contact_email || "", notes: item.notes || "" });
        } else if (activeTab === "services") {
            setFormValues({ name: item.name || "", category: item.category || "", price: item.price?.toString() || "", tax_classification: item.tax_classification || "" });
        } else if (activeTab === "lab_tests") {
            setFormValues({ name: item.name || "", category: item.category || "", sample_type: item.sample_type || "", reference_range: item.reference_range || "", price: item.price?.toString() || "" });
        } else if (activeTab === "medicines") {
            setFormValues({ name: item.name || "", generic_name: item.generic_name || "", strength: item.strength || "", form: item.form || "", unit: item.unit || "tablet", category: item.category || "" });
        }
    };

    const handleSave = async () => {
        if (!clinicId) return;
        setSaving(true);
        try {
            if (activeTab === "providers") {
                if (!formValues.name) { toast.error("Name is required"); setSaving(false); return; }
                const payload = { ...formValues, coverage_percent: parseFloat(formValues.coverage_percent) || 80 };
                if (editingId) await service.updateInsuranceProvider(clinicId, editingId, payload);
                else await service.createInsuranceProvider(clinicId, payload);
                toast.success(editingId ? "Provider updated" : "Provider created");
                await loadProviders();
            } else if (activeTab === "services") {
                if (!formValues.name) { toast.error("Name is required"); setSaving(false); return; }
                const payload = { ...formValues, price: parseFloat(formValues.price) || 0 };
                if (editingId) await service.updateService(clinicId, editingId, payload);
                else await service.createService(clinicId, payload);
                toast.success(editingId ? "Service updated" : "Service created");
                await loadServices();
            } else if (activeTab === "lab_tests") {
                if (!formValues.name) { toast.error("Name is required"); setSaving(false); return; }
                const payload = { ...formValues, price: parseFloat(formValues.price) || 0 };
                if (editingId) await service.updateLabTest(clinicId, editingId, payload);
                else await service.createLabTest(clinicId, payload);
                toast.success(editingId ? "Lab test updated" : "Lab test created");
                await loadLabTests();
            } else if (activeTab === "medicines") {
                if (!formValues.name) { toast.error("Name is required"); setSaving(false); return; }
                if (editingId) await service.updateMedicine(clinicId, editingId, formValues);
                else await service.createMedicine(clinicId, formValues);
                toast.success(editingId ? "Medicine updated" : "Medicine created");
                await loadMedicines();
            }
            setShowForm(false);
            setEditingId(null);
        } catch (err) {
            toast.error(handleApiError(err, "Failed to save"));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!clinicId || !deleteTarget) return;
        try {
            if (activeTab === "providers") await service.deleteInsuranceProvider(clinicId, deleteTarget);
            else if (activeTab === "services") await service.deleteService(clinicId, deleteTarget);
            else if (activeTab === "lab_tests") await service.deleteLabTest(clinicId, deleteTarget);
            else if (activeTab === "medicines") await service.deleteMedicine(clinicId, deleteTarget);
            toast.success("Deleted successfully");
            setDeleteTarget(null);
            if (activeTab === "providers") await loadProviders();
            else if (activeTab === "services") await loadServices();
            else if (activeTab === "lab_tests") await loadLabTests();
            else if (activeTab === "medicines") await loadMedicines();
        } catch (err) {
            toast.error(handleApiError(err, "Failed to delete"));
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount || 0);

    const filterList = (list, keys) => {
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter(item => keys.some(k => (item[k] || "").toLowerCase().includes(q)));
    };

    const filteredProviders = filterList(providers, ["name", "contact_name", "contact_phone"]);
    const filteredServices = filterList(services, ["name", "category", "tax_classification"]);
    const filteredLabTests = filterList(labTests, ["name", "category", "sample_type"]);
    const filteredMedicines = filterList(medicines, ["name", "generic_name", "form", "category"]);

    const totalItems = providers.length + services.length + labTests.length + medicines.length;

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
    }

    const providerFields = [
        { key: "name", label: "Name", required: true },
        { key: "coverage_percent", label: "Coverage %", type: "number" },
        { key: "contact_name", label: "Contact Name" },
        { key: "contact_phone", label: "Contact Phone" },
        { key: "contact_email", label: "Contact Email" },
        { key: "notes", label: "Notes" },
    ];
    const serviceFields = [
        { key: "name", label: "Name", required: true },
        { key: "category", label: "Category", type: "select", options: ["consultation", "procedure", "lab", "imaging", "other"] },
        { key: "price", label: "Price (RWF)", type: "number" },
        { key: "tax_classification", label: "Tax Class", type: "select", options: ["exempt", "standard", "reduced"] },
    ];
    const labTestFields = [
        { key: "name", label: "Name", required: true },
        { key: "category", label: "Category", type: "select", options: ["hematology", "biochemistry", "microbiology", "urinalysis", "imaging", "general"] },
        { key: "sample_type", label: "Sample Type", type: "select", options: ["blood", "urine", "stool", "sputum", "swab", "other"] },
        { key: "reference_range", label: "Reference Range" },
        { key: "price", label: "Price (RWF)", type: "number" },
    ];
    const medicineFields = [
        { key: "name", label: "Name", required: true },
        { key: "generic_name", label: "Generic Name" },
        { key: "strength", label: "Strength" },
        { key: "form", label: "Form", type: "select", options: ["tablet", "capsule", "syrup", "injection", "cream", "ointment", "drops", "inhaler", "suppository", "other"] },
        { key: "unit", label: "Unit", type: "select", options: ["tablet", "capsule", "bottle", "vial", "tube", "strip", "box", "sachet"] },
        { key: "category", label: "Category", type: "select", options: ["antibiotic", "analgesic", "antimalarial", "cardiovascular", "diabetes", "gastrointestinal", "respiratory", "vitamin", "other"] },
    ];

    return (
        <div className="space-y-5">
            <PageHeader title="Master Data Management" description={`${totalItems} items across 4 catalogs`} />

            {/* Tab Bar */}
            <div className="flex items-center gap-1 rounded-xl border bg-white p-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowForm(false); setEditingId(null); setSearch(""); }}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                            }`}>
                            <Icon className="size-3.5" /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${activeTab.replace("_", " ")}...`}
                        className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
                <button onClick={openAdd}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0">
                    <Plus className="size-3.5" /> Add New
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            {activeTab === "providers" && (
                                <>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Coverage %</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Contact</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Phone</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Email</th>
                                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20">Actions</th>
                                </>
                            )}
                            {activeTab === "services" && (
                                <>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Price</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Tax Class</th>
                                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20">Actions</th>
                                </>
                            )}
                            {activeTab === "lab_tests" && (
                                <>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Sample Type</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Reference Range</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Price</th>
                                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20">Actions</th>
                                </>
                            )}
                            {activeTab === "medicines" && (
                                <>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Generic</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Strength</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Form</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Unit</th>
                                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-20">Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {showForm && (
                            <InlineForm
                                fields={activeTab === "providers" ? providerFields : activeTab === "services" ? serviceFields : activeTab === "lab_tests" ? labTestFields : medicineFields}
                                values={formValues}
                                onChange={handleFormChange}
                                onSave={handleSave}
                                onCancel={() => { setShowForm(false); setEditingId(null); }}
                                saving={saving}
                            />
                        )}

                        {activeTab === "providers" && filteredProviders.length === 0 && !showForm && (
                            <tr><td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">No insurance providers found</td></tr>
                        )}
                        {activeTab === "services" && filteredServices.length === 0 && !showForm && (
                            <tr><td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">No services found</td></tr>
                        )}
                        {activeTab === "lab_tests" && filteredLabTests.length === 0 && !showForm && (
                            <tr><td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">No lab tests found</td></tr>
                        )}
                        {activeTab === "medicines" && filteredMedicines.length === 0 && !showForm && (
                            <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">No medicines found</td></tr>
                        )}

                        {activeTab === "providers" && filteredProviders.map(item => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-medium">{item.name}</td>
                                <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                        {item.coverage_percent || 80}%
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.contact_name || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.contact_phone || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.contact_email || "—"}</td>
                                <td className="px-3 py-2.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                                        <button onClick={() => setDeleteTarget(item.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="size-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {activeTab === "services" && filteredServices.map(item => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-medium">{item.name}</td>
                                <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                        {item.category || "—"}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{formatCurrency(item.price)}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.tax_classification || "—"}</td>
                                <td className="px-3 py-2.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                                        <button onClick={() => setDeleteTarget(item.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="size-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {activeTab === "lab_tests" && filteredLabTests.map(item => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-medium">{item.name}</td>
                                <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                        {item.category || "—"}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.sample_type || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.reference_range || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{formatCurrency(item.price)}</td>
                                <td className="px-3 py-2.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                                        <button onClick={() => setDeleteTarget(item.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="size-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {activeTab === "medicines" && filteredMedicines.map(item => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                                <td className="px-3 py-2.5 font-medium">{item.name}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.generic_name || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.strength || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.form || "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.unit || "—"}</td>
                                <td className="px-3 py-2.5">
                                    {item.category && (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                            {item.category}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-3.5" /></button>
                                        <button onClick={() => setDeleteTarget(item.id)} className="rounded-lg p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="size-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Item"
                message="Are you sure you want to delete this item? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
