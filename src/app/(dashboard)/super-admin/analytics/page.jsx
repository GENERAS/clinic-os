"use client";
import { PageHeader } from "@/components/shared/page-header";

import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 BarChart3, Loader2, TrendingUp, Users, MessageCircle, CalendarDays, Download, Filter 
} from "lucide-react";
import {
 toast 
} from "sonner";
function cn(
...classes
) {
 return classes.filter(
Boolean
).join(
" "
);
 
}const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RANGES = [  {
 label: "3M", value: 3 
},  {
 label: "6M", value: 6 
},  {
 label: "12M", value: 12 
},  {
 label: "All", value: 999 
},];
function groupByMonth(
items, field, range
) {
  const buckets = {

};
  const cutoff = range === 999 ? new Date(
0
) : new Date(
Date.now(

) - range * 30 * 24 * 60 * 60 * 1000
);
  items.forEach(
(
item) => {
    const d = new Date(
item[field]
);
    if (
d < cutoff
) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
    buckets[key] = (
buckets[key] || 0
) + 1;
  
}
);
  return Object.entries(
buckets
)    .sort(
(
[a], [b]) => a.localeCompare(
b
)
)    .slice(
-range === 999 ? undefined : -range
)    .map(
(
[key, count]) => (
{
      label: MONTHS[parseInt(
key.split(
"-"
)[1], 10
)],      value: count,    
}
)
);

}function buildRevenueGrowth(
subs, plansMap, range
) {
  const buckets = {

};
  const cutoff = range === 999 ? new Date(
0
) : new Date(
Date.now(

) - range * 30 * 24 * 60 * 60 * 1000
);
  subs.forEach(
(
s) => {
    const plan = plansMap[s.plan_id];
    if (
!plan
) return;
    const d = new Date(
s.created_at
);
    if (
d < cutoff
) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
    if (
!buckets[key]
) buckets[key] = 0;
    buckets[key] += Number(
plan.price_monthly
) || 0;
  
}
);
  return Object.entries(
buckets
)    .sort(
(
[a], [b]) => a.localeCompare(
b
)
)    .slice(
-range === 999 ? undefined : -range
)    .map(
(
[key, val]) => (
{
      label: MONTHS[parseInt(
key.split(
"-"
)[1], 10
)],      value: val,    
}
)
);

}function GrowthChart(
{
 title, data, prefix 
}
) {
  const max = Math.max(
...data.map(
(
d) => d.value
), 1
);
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">      <h3 className="mb-4 text-sm font-semibold">{
title
}</h3>      <div className="flex items-end gap-1.5 h-32">        {
data.map(
(
d, i) => (
          <div key={
i
} className="flex flex-1 flex-col items-center gap-1">            <span className="text-[10px] text-muted-foreground">{
prefix
}{
d.value
}</span>            <div              className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"              style={
{
 height: `${(d.value / max) * 100}%` 
}
}            />            <span className="text-[10px] text-muted-foreground">{
d.label
}</span>          </div>        
)
)
}      </div>    </div>  
);

}export default function PlatformAnalytics(

) {
  const [loading, setLoading] = useState(
true
);
  const [data, setData] = useState(
null
);
  const [range, setRange] = useState(
6
);
  useEffect(
(
) => {
    const supabase = createClient(

);
    if (
!supabase
) return;
    async function fetchAll(

) {
      try {
        const [clinicsRes, usersRes, apptsRes, msgsRes, subsRes, plansRes] = await Promise.all(
[          supabase.from(
"clinics"
).select(
"id, created_at, status"
),          supabase.from(
"users"
).select(
"id"
),          supabase.from(
"appointments"
).select(
"id"
),          supabase.from(
"whatsapp_messages"
).select(
"id"
),          supabase.from(
"subscriptions"
).select(
"id, plan_id, created_at, status"
),          supabase.from(
"plans"
).select(
"id, price_monthly, name"
),        ]
);
        const clinics = clinicsRes.data ?? [];
        const subs = subsRes.data ?? [];
        const plansList = plansRes.data ?? [];
        const plansMap = {

};
        plansList.forEach(
(
p) => {
 plansMap[p.id] = p;
 
}
);
        const activeClinics = clinics.filter(
(
c) => c.status === "active"
).length;
        const churnedClinics = clinics.filter(
(
c) => c.status === "suspended" || c.status === "inactive"
).length;
        const churnRate = clinics.length > 0 ? (
(
churnedClinics / clinics.length
) * 100
).toFixed(
1
) : "0";
        const canceledSubs = subs.filter(
(
s) => s.status === "canceled" || s.status === "expired"
).length;
        const revenueChurn = subs.length > 0 ? (
(
canceledSubs / subs.length
) * 100
).toFixed(
1
) : "0";
        setData(
{
          totalClinics: clinics.length,          activeClinics,          churnRate,          revenueChurn,          totalUsers: usersRes.data?.length ?? 0,          totalAppts: apptsRes.data?.length ?? 0,          totalMsgs: msgsRes.data?.length ?? 0,          clinicGrowth: groupByMonth(
clinics, "created_at", range
),          revenueGrowth: buildRevenueGrowth(
subs, plansMap, range
),        
}
);
      
} catch {
        // silent      
} finally {
        setLoading(
false
);
      
}    
}    fetchAll(

);
  
}, [range]
);
  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  const clinicGrowth = data?.clinicGrowth?.length    ? data.clinicGrowth    : [{
 label: "No data", value: 0 
}];
  const revenueGrowth = data?.revenueGrowth?.length    ? data.revenueGrowth    : [{
 label: "No data", value: 0 
}];
  return (
    <div className="space-y-6">      <PageHeader title="Platform Analytics" description="SaaS intelligence for strategic decisions.">        <button onClick={
(
) => toast.success(
"Report exported as CSV (simulated)"
)
}          className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-medium hover:bg-accent transition-colors">          <Download className="size-3.5" /> Export Report        </button>      </PageHeader>      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <TrendingUp className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.totalClinics ?? "—"
}</p>              <p className="text-xs text-muted-foreground">Total Clinics</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <BarChart3 className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.activeClinics ?? "—"
}</p>              <p className="text-xs text-muted-foreground">Active Clinics</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <Users className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.churnRate ?? "0"
}%</p>              <p className="text-xs text-muted-foreground">Clinic Churn Rate</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <TrendingUp className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.revenueChurn ?? "0"
}%</p>              <p className="text-xs text-muted-foreground">Revenue Churn</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <Users className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.totalUsers ?? "—"
}</p>              <p className="text-xs text-muted-foreground">Users</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <MessageCircle className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
data?.totalMsgs?.toLocaleString(

) ?? "—"
}</p>              <p className="text-xs text-muted-foreground">WhatsApp Messages</p>            </div>          </div>        </div>      </div>      <div className="flex items-center gap-2">        <Filter className="size-4 text-muted-foreground" />        <span className="text-xs font-medium text-muted-foreground">Time Range:</span>        <div className="flex gap-1 rounded-lg border bg-white p-0.5">          {
RANGES.map(
(
r) => (
            <button key={
r.value
} onClick={
(
) => setRange(
r.value
)
}              className={
cn(
"rounded-md px-3 py-1 text-xs font-medium transition-colors",                range === r.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"              
)
}>{
r.label
}</button>          
)
)
}        </div>      </div>      <div className="grid gap-6 lg:grid-cols-2">        <GrowthChart title="Clinic Growth" data={
clinicGrowth
} />        <GrowthChart title="Revenue Growth ($)" data={
revenueGrowth
} prefix="$" />      </div>      <div className="grid gap-6 lg:grid-cols-3">        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-2 mb-4">            <CalendarDays className="size-4 text-muted-foreground" />            <h3 className="text-sm font-semibold">Appointments</h3>          </div>          <p className="text-3xl font-bold">{
data?.totalAppts?.toLocaleString(

) ?? "—"
}</p>          <p className="text-xs text-muted-foreground">platform-wide</p>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-2 mb-4">            <MessageCircle className="size-4 text-muted-foreground" />            <h3 className="text-sm font-semibold">WhatsApp Usage</h3>          </div>          <p className="text-3xl font-bold">{
data?.totalMsgs?.toLocaleString(

) ?? "—"
}</p>          <p className="text-xs text-muted-foreground">total messages</p>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-2 mb-4">            <Users className="size-4 text-muted-foreground" />            <h3 className="text-sm font-semibold">Active Users</h3>          </div>          <p className="text-3xl font-bold">{
data?.totalUsers?.toLocaleString(

) ?? "—"
}</p>          <p className="text-xs text-muted-foreground">platform-wide</p>        </div>      </div>    </div>  
);

}