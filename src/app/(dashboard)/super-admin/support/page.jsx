"use client";
import { PageHeader } from "@/components/shared/page-header";
import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 LifeBuoy, MessageCircle, AlertCircle, CheckCircle2, Clock, Search, Loader2, ArrowUp, MessageSquare 
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
 
}const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 font-medium",  medium: "bg-slate-100 text-slate-600",  low: "bg-slate-50 text-slate-500",
};
const STATUS_STYLES = {
  open: "bg-amber-50 text-amber-700 font-medium",  in_progress: "bg-blue-50 text-blue-700",  resolved: "bg-emerald-50 text-emerald-700",  closed: "bg-slate-50 text-slate-500",
};
export default function SupportPage(

) {
  const [tickets, setTickets] = useState(
[]
);
  const [clinicsMap, setClinicsMap] = useState(
{

}
);
  const [loading, setLoading] = useState(
true
);
  const [search, setSearch] = useState(
""
);
  const [filterStatus, setFilterStatus] = useState(
"all"
);
  const supabase = createClient(

);
  useEffect(
(
) => {
    if (
!supabase
) return;
    async function fetchData(

) {
      try {
        const [ticketsRes, clinicsRes] = await Promise.all(
[          supabase.from(
"support_tickets"
).select(
"*"
).order(
"created_at", {
 ascending: false 
}
),          supabase.from(
"clinics"
).select(
"id, name"
),        ]
);
        setTickets(
ticketsRes.data ?? []
);
        const map = {

};
        (
clinicsRes.data ?? []
).forEach(
(
c) => {
 map[c.id] = c.name;
 
}
);
        setClinicsMap(
map
);
      
} catch {
        // silent      
} finally {
        setLoading(
false
);
      
}    
}    fetchData(

);
  
}, []
);
  async function updateTicket(
id, updates
) {
    try {
      await supabase.from(
"support_tickets"
).update(
updates
).eq(
"id", id
);
      setTickets(
(
prev) => prev.map(
(
t) => t.id === id ? {
 ...t, ...updates 
} : t
)
);
      toast.success(
"Ticket updated"
);
    
} catch (
err
) {
      toast.error(
err.message || "Failed to update ticket"
);
    
}  
}  const filtered = tickets.filter(
(
t) => {
    if (
filterStatus !== "all" && t.status !== filterStatus
) return false;
    const clinicName = clinicsMap[t.clinic_id] || "";
    if (
search && !t.subject.toLowerCase(

).includes(
search.toLowerCase(

)
) && !clinicName.toLowerCase(

).includes(
search.toLowerCase(

)
)
) return false;
    return true;
  
}
);
  const highPriority = tickets.filter(
(
t) => t.priority === "high" && t.status !== "closed" && t.status !== "resolved"
).length;
  const inProgress = tickets.filter(
(
t) => t.status === "in_progress"
).length;
  const openCount = tickets.filter(
(
t) => t.status === "open"
).length;
  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  return (
    <div className="space-y-6">      <PageHeader title="Support" description={`${tickets.length} ticket(s). Manage clinic support requests.`} />      <div className="grid gap-4 sm:grid-cols-3">        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">              <AlertCircle className="size-5 text-slate-500" />            </div>            <div>              <p className="text-2xl font-bold text-slate-900">{
highPriority
}</p>              <p className="text-xs text-slate-500">High Priority</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">              <Clock className="size-5 text-slate-500" />            </div>            <div>              <p className="text-2xl font-bold text-slate-900">{
inProgress
}</p>              <p className="text-xs text-slate-500">In Progress</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">              <CheckCircle2 className="size-5 text-slate-500" />            </div>            <div>              <p className="text-2xl font-bold text-slate-900">{
openCount
}</p>              <p className="text-xs text-slate-500">Open</p>            </div>          </div>        </div>      </div>      <div className="flex flex-wrap gap-3">        <div className="relative max-w-xs flex-1">          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />          <input value={
search
} onChange={
(
e) => setSearch(
e.target.value
)
}            placeholder="Search tickets..."            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />        </div>        <div className="flex gap-1 rounded-lg border bg-white p-0.5">          {
["all", "open", "in_progress", "resolved", "closed"].map(
(
s) => (
            <button key={
s
} onClick={
(
) => setFilterStatus(
s
)
}              className={
cn(
"rounded-md px-3 py-1.5 text-xs font-medium transition-colors",                filterStatus === s ? "bg-primary text-white" : "text-slate-500 hover:text-slate-900"              
)
}>{
s === "in_progress" ? "In Progress" : s.charAt(
0
).toUpperCase(

) + s.slice(
1
)
}</button>          
)
)
}        </div>      </div>      <div className="rounded-xl border bg-white shadow-sm">        {
filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No tickets found.</p>        
) : (
          <div className="divide-y">            {
filtered.map(
(
ticket) => (
              <div key={
ticket.id
} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">                  <LifeBuoy className="size-4 text-slate-500" />                </div>                <div className="flex-1 min-w-0">                  <div className="flex items-center gap-2">                    <p className="text-sm font-medium text-slate-900">{
ticket.subject
}</p>                    <select value={
ticket.priority
} onChange={
(
e) => updateTicket(
ticket.id, {
 priority: e.target.value 
}
)
}                      className={
cn(
"rounded px-1.5 py-0.5 text-[10px] font-medium border-0 outline-none cursor-pointer",                        PRIORITY_STYLES[ticket.priority]
)
}>                      <option value="low">low</option>                      <option value="medium">medium</option>                      <option value="high">high</option>                    </select>                  </div>                  <p className="text-xs text-slate-500">{
clinicsMap[ticket.clinic_id] || "—"
} · {
ticket.id.slice(
0, 8
)
}</p>                </div>                <select value={
ticket.status
} onChange={
(
e) => updateTicket(
ticket.id, {
 status: e.target.value 
}
)
}                  className={
cn(
"rounded-full px-2.5 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer",                    STATUS_STYLES[ticket.status]
)
}>                  <option value="open">open</option>                  <option value="in_progress">in progress</option>                  <option value="resolved">resolved</option>                  <option value="closed">closed</option>                </select>                <span className="text-xs text-slate-500 whitespace-nowrap">{
new Date(
ticket.created_at
).toLocaleDateString(

)
}</span>                <div className="flex gap-1">                  <button onClick={
(
) => toast.success(
"Respond dialog opened (simulated)"
)
}                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1">                    <MessageSquare className="size-3" /> Respond                  </button>                  {
ticket.priority !== "high" && (
                    <button onClick={
(
) => updateTicket(
ticket.id, {
 priority: "high" 
}
)
}                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1">                      <ArrowUp className="size-3" /> Escalate                    </button>                  
)
}                </div>              </div>            
)
)
}          </div>        
)
}      </div>    </div>  
);

}
