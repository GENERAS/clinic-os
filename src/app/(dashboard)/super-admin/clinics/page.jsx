"use client";
import { PageHeader } from "@/components/shared/page-header";

import {
 useState, useEffect, useCallback 
} from "react";
import {
 Link, useSearchParams 
} from "react-router-dom";
import {
 createClient 
} from "@/lib/supabase/client";
import {
  Building2, ChevronDown, Loader2, Search, Ban, CheckCircle,  AlertTriangle, Users, MoreHorizontal, Mail, Send
} from "lucide-react";
import {
 toast 
} from "sonner";
import {
 DataTable, StatusBadge, SearchInput 
} from "@/components/admin";
function cn(
...classes
) {
 return classes.filter(
Boolean
).join(
" "
);
 
}const FILTERS = ["all", "active", "trial", "suspended", "expired"];
export default function SuperAdminClinics(

) {
  const [searchParams, setSearchParams] = useSearchParams(

);
  const [clinics, setClinics] = useState(
[]
);
  const [plans, setPlans] = useState(
[]
);
  const [loading, setLoading] = useState(
true
);
  const [search, setSearch] = useState(
""
);
  const [statusFilter, setStatusFilter] = useState(
searchParams.get(
"status"
) || "all"
);
  const [selected, setSelected] = useState(
[]
);
  const [openDropdown, setOpenDropdown] = useState(
null
);
  const supabase = createClient(

);
  const fetch = useCallback(
async (
) => {
    try {
      const [clinicsRes, plansRes] = await Promise.all(
[        supabase.from(
"clinics"
).select(
"id, name, slug, status, plan_id, created_at, onboarding_completed, updated_at"
)          .order(
"created_at", {
 ascending: false 
}
),        supabase.from(
"plans"
).select(
"id, name, price_monthly"
),      ]
);
      const clinicsData = clinicsRes.data ?? [];
      const plansData = plansRes.data ?? [];
      setPlans(
plansData
);
      const usersRes = await supabase.from(
"users"
).select(
"clinic_id, id, full_name, last_login_at, is_super_admin"
);
      const users = usersRes.data ?? [];
      const clinicLastLogins = {

};
      users.forEach(
(
u) => {
        if (
u.last_login_at && u.clinic_id
) {
          const existing = clinicLastLogins[u.clinic_id];
          if (
!existing || new Date(
u.last_login_at
) > new Date(
existing
)
) {
            clinicLastLogins[u.clinic_id] = u.last_login_at;
          
}        
}      
}
);
      const enriched = await Promise.all(
clinicsData.map(
async (
c) => {
        const clinicUsers = users.filter(
(
u) => u.clinic_id === c.id
);
        const owner = clinicUsers.find(
(
u) => u.is_super_admin === false
) || clinicUsers[0] || null;
        const [patientsRes, apptsRes] = await Promise.all(
[          supabase.from(
"patients"
).select(
"id", {
 count: "exact", head: true 
}
).eq(
"clinic_id", c.id
),          supabase.from(
"appointments"
).select(
"id", {
 count: "exact", head: true 
}
).eq(
"clinic_id", c.id
),        ]
);
        return {
          ...c,          owner: owner ? {
 name: owner.full_name, id: owner.id 
} : null,          userCount: clinicUsers.length,          patientCount: patientsRes.count ?? 0,          appointmentCount: apptsRes.count ?? 0,          lastLogin: clinicLastLogins[c.id] || null,        
};
      
}
)
);
      setClinics(
enriched
);
    
} catch {
      // silent    
} finally {
      setLoading(
false
);
    
}  
}, [supabase]
);
  useEffect(
(
) => {
 fetch(

);
 
}, []
);
  const planMap = Object.fromEntries(
plans.map(
(
p) => [p.id, p]
)
);
  const filtered = clinics.filter(
(
c) => {
    if (
statusFilter !== "all" && c.status !== statusFilter
) return false;
    if (
!search
) return true;
    const q = search.toLowerCase(

);
    return (
      c.name?.toLowerCase(

).includes(
q
) ||      c.slug?.toLowerCase(

).includes(
q
) ||      c.owner?.name?.toLowerCase(

).includes(
q
)    
);
  
}
);
  async function bulkAction(
action, ids
) {
    if (
!ids || ids.length === 0
) return;
    try {
      if (
action === "suspend"
) {
        await supabase.from(
"clinics"
).update(
{
 status: "suspended" 
}
).in(
"id", ids
);
        toast.success(
`${ids.length} clinic(s) suspended`
);
      
} else if (
action === "activate"
) {
        await supabase.from(
"clinics"
).update(
{
 status: "active" 
}
).in(
"id", ids
);
        toast.success(
`${ids.length} clinic(s) activated`
);
      
} else if (
action === "notify"
) {
        toast.success(
`Notification sent to ${ids.length} clinic(s) (simulated)`
);
      
}      setSelected(
[]
);
      fetch(

);
    
} catch (
err
) {
      toast.error(
err.message || "Bulk action failed"
);
    
}  
}  async function toggleClinicStatus(
clinicId, currentStatus
) {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      await supabase.from(
"clinics"
).update(
{
 status: newStatus 
}
).eq(
"id", clinicId
);
      toast.success(
newStatus === "suspended" ? "Clinic suspended" : "Clinic reactivated"
);
      fetch(

);
    
} catch (
err
) {
      toast.error(
err.message || "Failed to update clinic status"
);
    
}  
}  async function changePlan(
clinicId, newPlanId
) {
    try {
      const {
 data: existingSub 
} = await supabase.from(
"subscriptions"
).select(
"id"
).eq(
"clinic_id", clinicId
).maybeSingle(

);
      if (
existingSub
) {
        await supabase.from(
"subscriptions"
).update(
{
 plan_id: newPlanId 
}
).eq(
"id", existingSub.id
);
      
} else {
        await supabase.from(
"subscriptions"
).insert(
{
          clinic_id: clinicId, plan_id: newPlanId, status: "active",          billing_cycle: "monthly",          current_period_start: new Date(

).toISOString(

),          current_period_end: new Date(
Date.now(

) + 30 * 24 * 60 * 60 * 1000
).toISOString(

),        
}
);
      
}      await supabase.from(
"clinics"
).update(
{
 plan_id: newPlanId 
}
).eq(
"id", clinicId
);
      toast.success(
"Plan updated"
);
      fetch(

);
    
} catch (
err
) {
      toast.error(
err.message || "Failed to change plan"
);
    
}  
}  const columns = [    {
      key: "name", header: "Clinic",      render: (
c) => (
        <Link to={
`/admin/clinics/${c.id}`
} className="flex items-center gap-2 font-medium hover:text-primary transition-colors">          <Building2 className="size-4 text-muted-foreground shrink-0" />          <div>            <p>{
c.name
}</p>            <p className="text-xs text-muted-foreground">{
c.slug
}</p>          </div>        </Link>      
),    
},    {
      key: "owner", header: "Owner",      render: (
c) => c.owner ? <span className="text-xs font-medium">{
c.owner.name
}</span> : <span className="text-xs text-muted-foreground">—</span>,    
},    {
      key: "plan_id", header: "Plan",      render: (
c) => {
        const plan = planMap[c.plan_id];
        return <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{
plan?.name || "Free"
}</span>;
      
},      sortable: false,    
},    {
 key: "userCount", header: "Users", cellClassName: "text-xs text-muted-foreground" 
},    {
 key: "patientCount", header: "Patients", cellClassName: "text-xs text-muted-foreground" 
},    {
      key: "lastLogin", header: "Last Login",      render: (
c) => <span className="text-xs text-muted-foreground whitespace-nowrap">{
c.lastLogin ? new Date(
c.lastLogin
).toLocaleDateString(

) : "—"
}</span>,    
},    {
      key: "revenue", header: "Revenue",      render: (
c) => {
        const plan = planMap[c.plan_id];
        return <span className="text-xs font-medium">${
plan ? Number(
plan.price_monthly
).toFixed(
0
) : "0"
}/mo</span>;
      
},      sortable: false,    
},    {
      key: "status", header: "Status",      render: (
c) => <StatusBadge status={
c.status
} />,    
},    {
      key: "actions", header: "", sortable: false,      render: (
c) => (
        <div className="relative">          <button onClick={
(
) => setOpenDropdown(
openDropdown === c.id ? null : c.id
)
}            className="rounded-lg p-1.5 hover:bg-accent transition-colors">            <MoreHorizontal className="size-4 text-muted-foreground" />          </button>          {
openDropdown === c.id && (
            <>              <div className="fixed inset-0 z-10" onClick={
(
) => setOpenDropdown(
null
)
} />              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border bg-white shadow-lg py-1">                <Link to={
`/admin/clinics/${c.id}`
}                  className="block w-full px-4 py-2 text-left text-xs hover:bg-accent">View</Link>                <button onClick={
(
) => {
 changePlan(
c.id, c.plan_id
);
 setOpenDropdown(
null
);
 
}
}                  className="block w-full px-4 py-2 text-left text-xs hover:bg-accent">Change Plan</button>                <button onClick={
(
) => {
 toggleClinicStatus(
c.id, c.status
);
 setOpenDropdown(
null
);
 
}
}                  className="block w-full px-4 py-2 text-left text-xs hover:bg-accent">                  {
c.status === "suspended" ? "Activate" : "Suspend"
}                </button>                <button onClick={
(
) => {
 toast.success(
"Notification sent (simulated)"
);
 setOpenDropdown(
null
);
 
}
}                  className="block w-full px-4 py-2 text-left text-xs hover:bg-accent">Send Notification</button>              </div>            </>          
)
}        </div>      
),    
},  ];
  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  return (
    <div className="space-y-6">      <PageHeader title="Clinics" description={`${clinics.length} clinic(s) registered.`}>        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">          + Create Clinic        </button>      </PageHeader>      <div className="flex flex-wrap items-center gap-3">        <SearchInput value={
search
} onChange={
setSearch
}          placeholder="Search by clinic name, owner, email..."          className="flex-1 max-w-sm" />        <div className="flex gap-1 rounded-lg border bg-white p-0.5">          {
FILTERS.map(
(
f) => (
            <button key={
f
} onClick={
(
) => {
 setStatusFilter(
f
);
 setSearchParams(
f === "all" ? {

} : {
 status: f 
}
);
 
}
}              className={
cn(
"rounded-md px-3 py-1.5 text-xs font-medium transition-colors",                statusFilter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"              
)
}>              {
f === "all" ? "All" : f.charAt(
0
).toUpperCase(

) + f.slice(
1
)
}            </button>          
)
)
}        </div>      </div>      <DataTable        columns={
columns
}        data={
filtered
}        keyField="id"        selectable        onSelectionChange={
setSelected
}        emptyMessage="No clinics found."        bulkActions={
[          {
 label: "Send Notification", onClick: (
ids) => bulkAction(
"notify", ids
) 
},          {
 label: "Suspend", onClick: (
ids) => bulkAction(
"suspend", ids
), danger: true 
},          {
 label: "Activate", onClick: (
ids) => bulkAction(
"activate", ids
) 
},        ]
}      />    </div>  
);

}