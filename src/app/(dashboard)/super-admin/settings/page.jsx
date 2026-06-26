"use client";
import { PageHeader } from "@/components/shared/page-header";
import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 Settings, Save, Loader2, CreditCard, MessageCircle, Wifi, Shield 
} from "lucide-react";
import {
 toast 
} from "sonner";
import { handleApiError } from "@/lib/errors";
function cn(
...classes
) {
 return classes.filter(
Boolean
).join(
" "
);
 
}export default function AdminSettings(

) {
  const [plans, setPlans] = useState(
[]
);
  const [loading, setLoading] = useState(
true
);
  const [saving, setSaving] = useState(
false
);
  const [branding, setBranding] = useState(
{
 name: "ClinicOS", logo: "" 
}
);
  const [whatsappDefaults, setWhatsappDefaults] = useState(
{
    retry_count: 3,    retry_delay_minutes: 5,  
}
);
  const [featureFlags, setFeatureFlags] = useState(
{
    maintenance_mode: false,    allow_registration: true,  
}
);
  const supabase = createClient(

);
  useEffect(
(
) => {
    async function fetch(

) {
      try {
        const [plansRes, settingsRes] = await Promise.all(
[          supabase.from(
"plans"
).select(
"*"
).order(
"sort_order"
),          supabase.from(
"platform_settings"
).select(
"key, value"
),        ]
);
        setPlans(
plansRes.data ?? []
);
        const settings = settingsRes.data ?? [];
        const getSetting = (
key) => {
          const found = settings.find(
(
s) => s.key === key
);
          return found ? found.value : null;
        
};
        const b = getSetting(
"branding"
);
        if (
b
) setBranding(
b
);
        const w = getSetting(
"whatsapp_defaults"
);
        if (
w
) setWhatsappDefaults(
w
);
        const f = getSetting(
"feature_flags"
);
        if (
f
) setFeatureFlags(
f
);
      
} catch (err) {
        toast.error(handleApiError(err, "Failed to load settings"));
} finally {
        setLoading(false);
}    
}    fetch(

);
  
}, []
);
  async function saveSetting(
key, value
) {
    try {
      await supabase.from(
"platform_settings"
).upsert(
        {
 key, value, updated_at: new Date(

).toISOString(

) 
},        {
 onConflict: "key" 
}      
);
    
} catch (err) {
      toast.error(handleApiError(err, "Failed to save setting"));
}  
}  async function handleBrandingSave(

) {
    setSaving(
true
);
    await saveSetting(
"branding", branding
);
    toast.success(
"Branding saved"
);
    setSaving(
false
);
  
}  async function handleWhatsappSave(

) {
    setSaving(
true
);
    await saveSetting(
"whatsapp_defaults", whatsappDefaults
);
    toast.success(
"WhatsApp defaults saved"
);
    setSaving(
false
);
  
}  async function handleFeatureSave(

) {
    setSaving(
true
);
    await saveSetting(
"feature_flags", featureFlags
);
    toast.success(
"System configuration saved"
);
    setSaving(
false
);
  
}  async function savePlan(
planId, field, value
) {
    setSaving(
true
);
    try {
      await supabase.from(
"plans"
).update(
{
 [field]: value 
}
).eq(
"id", planId
);
      setPlans(
(
prev) => prev.map(
(
p) => p.id === planId ? {
 ...p, [field]: value 
} : p
)
);
      toast.success(
"Plan updated"
);
    
} catch (
err
) {
      toast.error(
handleApiError(err, "Failed to update plan")
);
    
} finally {
      setSaving(
false
);
    
}  
}  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  return (
    <div className="space-y-6 max-w-3xl">      <PageHeader title="Settings" description="Platform-wide configuration." />      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center justify-between mb-4">          <div className="flex items-center gap-2">            <Shield className="size-4 text-slate-500" />            <h2 className="text-sm font-semibold text-slate-900">Branding</h2>          </div>          <button onClick={
handleBrandingSave
} disabled={
saving
}            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">            {
saving ? "Saving..." : "Save"
}          </button>        </div>        <div className="space-y-3">          <div>            <label className="text-xs font-medium text-slate-500">Platform Name</label>            <input value={
branding.name
} onChange={
(
e) => setBranding(
(
b) => (
{
 ...b, name: e.target.value 
}
)
)
}              className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />          </div>        </div>      </div>      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center gap-2 mb-4">                    <CreditCard className="size-4 text-slate-500" />          <h2 className="text-sm font-semibold text-slate-900">Subscription Plans</h2>        </div>        <div className="space-y-4">          {
plans.map(
(
plan) => (
            <div key={
plan.id
} className="rounded-lg border p-4">              <div className="flex items-start justify-between">                <div>                  <h3 className="font-semibold text-slate-900">{
plan.name
}</h3>                  <p className="text-xs   text-slate-500">{
plan.description
}</p>                </div>                <div className="flex items-center gap-2">                  <label className="text-xs   text-slate-500">Price</label>                  <input type="number" defaultValue={
plan.price_monthly
}                    onBlur={
(
e) => savePlan(
plan.id, "price_monthly", Number(
e.target.value
)
)
}                    className="w-20 rounded border bg-white px-2 py-1 text-sm outline-none focus:border-primary" />                  <span className="text-xs   text-slate-500">/mo</span>                </div>              </div>              <div className="mt-3 flex items-center gap-4 text-xs   text-slate-500">                <label className="flex items-center gap-1">                  <input type="checkbox" defaultChecked={
plan.whatsapp_enabled
}                    onChange={
(
e) => savePlan(
plan.id, "whatsapp_enabled", e.target.checked
)
}                    className="size-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />                  WhatsApp                </label>                <label>                  Max staff:                  <input type="number" defaultValue={
plan.max_staff
}                    onBlur={
(
e) => savePlan(
plan.id, "max_staff", Number(
e.target.value
)
)
}                    className="ml-1 w-16 rounded border bg-white px-2 py-0.5 text-xs outline-none focus:border-primary" />                </label>              </div>            </div>          
)
)
}        </div>      </div>      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center justify-between mb-4">          <div className="flex items-center gap-2">                      <MessageCircle className="size-4 text-slate-500" />          <h2 className="text-sm font-semibold text-slate-900">WhatsApp Defaults</h2>          </div>          <button onClick={
handleWhatsappSave
} disabled={
saving
}            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">            {
saving ? "Saving..." : "Save"
}          </button>        </div>        <div className="grid gap-3 sm:grid-cols-2">          <div>            <label className="text-xs font-medium   text-slate-500">Retry Count</label>            <input type="number" value={
whatsappDefaults.retry_count
}              onChange={
(
e) => setWhatsappDefaults(
(
w) => (
{
 ...w, retry_count: Number(
e.target.value
) 
}
)
)
}              className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />          </div>          <div>            <label className="text-xs font-medium   text-slate-500">Retry Delay (
minutes
)</label>            <input type="number" value={
whatsappDefaults.retry_delay_minutes
}              onChange={
(
e) => setWhatsappDefaults(
(
w) => (
{
 ...w, retry_delay_minutes: Number(
e.target.value
) 
}
)
)
}              className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />          </div>        </div>      </div>      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center justify-between mb-4">          <div className="flex items-center gap-2">                      <Wifi className="size-4 text-slate-500" />          <h2 className="text-sm font-semibold text-slate-900">System Configuration</h2>          </div>          <button onClick={
handleFeatureSave
} disabled={
saving
}            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50">            {
saving ? "Saving..." : "Save"
}          </button>        </div>        <div className="space-y-3">          <label className="flex items-center gap-3 cursor-pointer">            <input type="checkbox" checked={
featureFlags.maintenance_mode
}              onChange={
(
e) => setFeatureFlags(
(
f) => (
{
 ...f, maintenance_mode: e.target.checked 
}
)
)
}              className="size-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />            <div>              <p className="text-sm font-medium text-slate-900">Maintenance Mode</p>              <p className="text-xs   text-slate-500">Block new logins and show maintenance page.</p>            </div>          </label>          <label className="flex items-center gap-3 cursor-pointer">            <input type="checkbox" checked={
featureFlags.allow_registration
}              onChange={
(
e) => setFeatureFlags(
(
f) => (
{
 ...f, allow_registration: e.target.checked 
}
)
)
}              className="size-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />            <div>              <p className="text-sm font-medium text-slate-900">Allow Registration</p>              <p className="text-xs   text-slate-500">New clinics can sign up.</p>            </div>          </label>        </div>      </div>    </div>  
);

}