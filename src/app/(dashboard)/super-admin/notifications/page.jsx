"use client";
import { PageHeader } from "@/components/shared/page-header";

import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 Bell, Send, Mail, MessageCircle, Loader2, XCircle, Search 
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
 
}const TYPE_LABELS = {
  subscription_reminder: "Subscription Reminder",  payment_reminder: "Payment Reminder",  system_update: "System Update",  maintenance_notice: "Maintenance Notice",  announcement: "Announcement",
};
const CHANNEL_ICONS = {
  email: Mail,  whatsapp: MessageCircle,  sms: MessageCircle,
};
const STATUS_STYLES = {
  sent: "bg-muted text-foreground",  pending: "bg-muted text-muted-foreground",  failed: "bg-muted text-muted-foreground",
};
export default function NotificationCenter(

) {
  const [notifications, setNotifications] = useState(
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
  const [filterType, setFilterType] = useState(
""
);
  useEffect(
(
) => {
    const supabase = createClient(

);
    if (
!supabase
) return;
    async function fetchData(

) {
      try {
        const [notifRes, clinicsRes] = await Promise.all(
[          supabase.from(
"notification_logs"
).select(
"*"
).order(
"created_at", {
 ascending: false 
}
).limit(
50
),          supabase.from(
"clinics"
).select(
"id, name"
),        ]
);
        setNotifications(
notifRes.data ?? []
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
  const filtered = notifications.filter(
(
n) => {
    if (
filterType && n.type !== filterType
) return false;
    const recipient = n.recipient || "";
    const clinicName = clinicsMap[n.clinic_id] || "";
    if (
search && !recipient.toLowerCase(

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
  const sent = notifications.filter(
(
n) => n.status === "sent"
).length;
  const pending = notifications.filter(
(
n) => n.status === "pending"
).length;
  const failed = notifications.filter(
(
n) => n.status === "failed"
).length;
  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  return (
    <div className="space-y-6">      <PageHeader title="Notification Center" description={`${notifications.length} notification(s) sent.`}>        <button onClick={
(
) => toast.success(
"Sending announcement (simulated)"
)
}          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">          + New Announcement        </button>      </PageHeader>      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <Send className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
sent
}</p>              <p className="text-xs text-muted-foreground">Sent</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <Send className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
pending
}</p>              <p className="text-xs text-muted-foreground">Pending</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <XCircle className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
failed
}</p>              <p className="text-xs text-muted-foreground">Failed</p>            </div>          </div>        </div>        <div className="rounded-xl border bg-white p-5 shadow-sm">          <div className="flex items-center gap-3">            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">              <Bell className="size-5 text-muted-foreground" />            </div>            <div>              <p className="text-2xl font-bold">{
notifications.length
}</p>              <p className="text-xs text-muted-foreground">Total</p>            </div>          </div>        </div>      </div>      <div className="flex flex-wrap gap-3">        <div className="relative max-w-xs flex-1">          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />          <input value={
search
} onChange={
(
e) => setSearch(
e.target.value
)
}            placeholder="Search notifications..."            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />        </div>        <select value={
filterType
} onChange={
(
e) => setFilterType(
e.target.value
)
}          className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">          <option value="">All types</option>          {
Object.entries(
TYPE_LABELS
).map(
(
[k, v]) => <option key={
k
} value={
k
}>{
v
}</option>
)
}        </select>      </div>      <div className="rounded-xl border bg-white shadow-sm">        {
filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No notifications found.</p>        
) : (
          <table className="w-full text-sm">            <thead>              <tr className="border-b-2 border-border text-left text-xs font-semibold text-foreground">                <th className="px-5 py-3">Recipient</th>                <th className="px-5 py-3">Clinic</th>                <th className="px-5 py-3">Type</th>                <th className="px-5 py-3">Channel</th>                <th className="px-5 py-3">Status</th>                <th className="px-5 py-3">Sent At</th>                <th className="px-5 py-3"></th>              </tr>            </thead>            <tbody className="divide-y">              {
filtered.map(
(
n) => {
                const ChannelIcon = CHANNEL_ICONS[n.channel] || Mail;
                return (
                  <tr key={
n.id
} className="hover:bg-accent">                    <td className="px-5 py-3 font-medium">{
n.recipient || "—"
}</td>                    <td className="px-5 py-3 text-xs text-muted-foreground">{
clinicsMap[n.clinic_id] || "—"
}</td>                    <td className="px-5 py-3">                      <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium">{
TYPE_LABELS[n.type] || n.type
}</span>                    </td>                    <td className="px-5 py-3">                      <span className="flex items-center gap-1 text-xs">                        <ChannelIcon className="size-3" />                        {
n.channel
}                      </span>                    </td>                    <td className="px-5 py-3">                      <span className={
cn(
"rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[n.status]
)
}>{
n.status
}</span>                    </td>                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">                      {
n.sent_at ? new Date(
n.sent_at
).toLocaleString(

) : "—"
}                    </td>                    <td className="px-5 py-3">                      <button onClick={
(
) => toast.success(
"Resending (simulated)"
)
}                        className="rounded border bg-white px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors">                        Send Again                      </button>                    </td>                  </tr>                
);
              
}
)
}            </tbody>          </table>        
)
}      </div>    </div>  
);

}