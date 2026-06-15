"use client";
import { PageHeader } from "@/components/shared/page-header";
import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 CreditCard, Loader2, Building2, TrendingUp, Clock, AlertTriangle 
} from "lucide-react";
import {
 toast 
} from "sonner";
import {
 MetricCard, StatusBadge, DataTable, SearchInput 
} from "@/components/admin";
function cn(
...classes
) {
 return classes.filter(
Boolean
).join(
" "
);
 
}export default function SuperAdminSubscriptions(

) {
  const [subscriptions, setSubscriptions] = useState(
[]
);
  const [plans, setPlans] = useState(
[]
);
  const [clinics, setClinics] = useState(
[]
);
  const [loading, setLoading] = useState(
true
);
  const [search, setSearch] = useState(
""
);
  const supabase = createClient(

);
  async function fetchData(

) {
    try {
      const [subsRes, plansRes, clinicsRes] = await Promise.all(
[        supabase.from(
"subscriptions"
).select(
"*"
).order(
"created_at", {
 ascending: false 
}
),        supabase.from(
"plans"
).select(
"*"
).order(
"sort_order"
),        supabase.from(
"clinics"
).select(
"id, name, status"
),      ]
);
      setSubscriptions(
subsRes.data ?? []
);
      setPlans(
plansRes.data ?? []
);
      setClinics(
clinicsRes.data ?? []
);
    
} catch {
      // silent    
} finally {
      setLoading(
false
);
    
}  
}  useEffect(
(
) => {
 fetchData(

);
 
}, []
);
  const planMap = Object.fromEntries(
plans.map(
(
p) => [p.id, p]
)
);
  const clinicMap = Object.fromEntries(
clinics.map(
(
c) => [c.id, c]
)
);
  const filtered = search    ? subscriptions.filter(
(
s) => {
        const clinic = clinicMap[s.clinic_id];
        return clinic?.name?.toLowerCase(

).includes(
search.toLowerCase(

)
);
      
}
)    : subscriptions;
  const activeSubs = subscriptions.filter(
(
s) => s.status === "active"
);
  const trialSubs = subscriptions.filter(
(
s) => s.status === "trialing"
);
  const failedSubs = subscriptions.filter(
(
s) => s.status === "past_due"
);
  const expiredSubs = subscriptions.filter(
(
s) => s.status === "expired" || s.status === "canceled"
);
  const mrr = activeSubs.reduce(
(
sum, s) => {
    const plan = planMap[s.plan_id];
    return sum + (
plan ? Number(
plan.price_monthly
) : 0
);
  
}, 0
);
  const arr = mrr * 12;
  async function changePlan(
subId, newPlanId
) {
    try {
      const plan = planMap[newPlanId];
      await supabase.from(
"subscriptions"
).update(
{
        plan_id: newPlanId,        status: Number(
plan?.price_monthly || 0
) > 0 ? "active" : "trialing",      
}
).eq(
"id", subId
);
      toast.success(
"Plan updated"
);
      fetchData(

);
    
} catch (
err
) {
      toast.error(
err.message || "Failed to update plan"
);
    
}  
}  async function updateStatus(
subId, status
) {
    try {
      await supabase.from(
"subscriptions"
).update(
{
 status 
}
).eq(
"id", subId
);
      toast.success(
`Subscription ${status}`
);
      fetchData(

);
    
} catch (
err
) {
      toast.error(
err.message || "Failed to update"
);
    
}  
}  const columns = [    {
      key: "clinic", header: "Clinic",      render: (
sub) => {
        const clinic = clinicMap[sub.clinic_id];
        return (
          <div className="flex items-center gap-2">            <Building2 className="size-4 text-muted-foreground shrink-0" />            <span className="font-medium">{
clinic?.name || "Unknown"
}</span>          </div>        
);
      
},    
},    {
      key: "planName", header: "Plan",      render: (
sub) => {
        const plan = planMap[sub.plan_id];
        return <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{
plan?.name || "—"
}</span>;
      
},      sortable: false,    
},    {
      key: "amount", header: "Amount",      render: (
sub) => {
        const plan = planMap[sub.plan_id];
        return <span className="text-xs font-medium">{
          Number(
            plan?.price_monthly || 0
          ).toLocaleString(
            "en-RW"
          )
        } RWF/mo</span>;
      
},    
},    {
      key: "status", header: "Status",      render: (
sub) => <StatusBadge status={
sub.status
} />,    
},    {
      key: "daysLeft", header: "Days Left",      render: (
sub) => {
        const daysLeft = sub.current_period_end          ? Math.ceil(
(
new Date(
sub.current_period_end
) - new Date(

)
) / (
1000 * 60 * 60 * 24
)
)          : null;
        const color = daysLeft == null ? "text-muted-foreground"          : daysLeft <= 0 ? "text-muted-foreground font-bold"          : daysLeft <= 7 ? "text-muted-foreground font-medium"          : daysLeft <= 14 ? "text-muted-foreground"          : "text-muted-foreground";
        return <span className={
cn(
"text-xs font-medium", color
)
}>{
daysLeft != null ? `${daysLeft}d` : "—"
}</span>;
      
},    
},    {
      key: "payment", header: "Payment",      render: (
sub) => {
        const statusMap = {
 active: "paid", past_due: "overdue", trialing: "trial" 
};
        const pmtStatus = statusMap[sub.status] || sub.status;
        return <StatusBadge status={
pmtStatus
} label={
pmtStatus === "paid" ? "Paid" : pmtStatus === "overdue" ? "Overdue" : pmtStatus === "trial" ? "Trial" : sub.status
} />;
      
},    
},    {
      key: "actions", header: "Actions", sortable: false,      render: (
sub) => (
        <div className="flex items-center gap-1.5 flex-wrap">          <select value={
sub.plan_id
} onChange={
(
e) => changePlan(
sub.id, e.target.value
)
}            className="rounded border bg-white px-2 py-1 text-xs outline-none hover:bg-accent focus:border-primary">            {
plans.map(
(
p) => (
              <option key={
p.id
} value={
p.id
}>{
p.name
} (
${
p.price_monthly
} RWF/mo
)</option>            
)
)
}          </select>          {
sub.status !== "canceled" && sub.status !== "expired" && (
            <button onClick={
(
) => updateStatus(
sub.id, sub.status === "active" ? "canceled" : "active"
)
}              className={
cn(
"rounded px-2 py-1 text-xs font-medium border transition-colors",                sub.status === "active"                  ? "border text-muted-foreground hover:bg-accent"                  : "border text-foreground hover:bg-accent"              
)
}>              {
sub.status === "active" ? "Cancel" : "Reactivate"
}            </button>          
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
    <div className="space-y-6">      <PageHeader title="Subscriptions" description={`${subscriptions.length} subscription(s).`} />      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">        <MetricCard icon={
TrendingUp
} label="MRR" value={
`${mrr.toLocaleString("en-RW")} RWF`
          } sub={
            `${arr.toLocaleString("en-RW")} RWF ARR`
}  />        <MetricCard icon={
CreditCard
} label="ARR" value={
`${arr.toLocaleString("en-RW")} RWF`
} sub="Annualized"  />        <MetricCard icon={
AlertTriangle
} label="Failed Payments" value={
failedSubs.length
} sub="past due"  />        <MetricCard icon={
Clock
} label="Trials" value={
trialSubs.length
} sub="in trial period"  />        <MetricCard icon={
Clock
} label="Expired / Canceled" value={
expiredSubs.length
} sub="churned"  />      </div>      {
/* PLAN DISTRIBUTION */
}      <div className="rounded-xl border bg-white p-5 shadow-sm">        <h2 className="text-sm font-semibold mb-3">Plan Distribution</h2>        <div className="flex gap-4 flex-wrap">          {
plans.map(
(
plan) => {
            const count = subscriptions.filter(
(
s) => s.plan_id === plan.id && (
s.status === "active" || s.status === "trialing"
)
).length;
            const total = activeSubs.length + trialSubs.length;
            const pct = total > 0 ? Math.round(
(
count / total
) * 100
) : 0;
            return (
              <div key={
plan.id
} className="rounded-lg border px-4 py-3 min-w-[120px]">                <p className="text-xs text-muted-foreground">{
plan.name
}</p>                <p className="text-xl font-bold">{
count
}</p>                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">                  <div className="h-full rounded-full bg-primary" style={
{
 width: `${pct}%` 
}
} />                </div>                <p className="text-[10px] text-muted-foreground mt-0.5">{
pct
}% of active</p>              </div>            
);
          
}
)
}        </div>      </div>      <SearchInput value={
search
} onChange={
setSearch
} placeholder="Search by clinic name..." className="max-w-xs" />      <DataTable        columns={
columns
}        data={
filtered
}        keyField="id"        emptyMessage="No subscriptions found."        sortable      />    </div>  
);

}
