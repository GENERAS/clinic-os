"use client";
import { PageHeader } from "@/components/shared/page-header";
import {
 useState, useEffect 
} from "react";
import {
 Link 
} from "react-router-dom";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 Users as UsersIcon, Loader2, Search, Shield, Clock, Mail 
} from "lucide-react";
import {
  toast
} from "sonner";
import { handleApiError } from "@/lib/errors";
import {
 DataTable, StatusBadge, SearchInput, InlineSelect 
} from "@/components/admin";
function cn(
...classes
) {
 return classes.filter(
Boolean
).join(
" "
);
 
}export default function SuperAdminUsers(

) {
  const [users, setUsers] = useState(
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
  const [filterClinic, setFilterClinic] = useState(
""
);
  const supabase = createClient(

);
  useEffect(
(
) => {
    async function fetch(

) {
      try {
        const [usersRes, clinicsRes] = await Promise.all(
[          supabase.from(
"users"
)            .select(
"id, full_name, email, phone, status, is_super_admin, clinic_id, last_login_at, created_at"
)            .order(
"created_at", {
 ascending: false 
}
),          supabase.from(
"clinics"
).select(
"id, name"
),        ]
);
        setUsers(
usersRes.data ?? []
);
        setClinics(
clinicsRes.data ?? []
);
      
} catch (err) {
        toast.error(handleApiError(err, "Failed to load users"));
} finally {
        setLoading(false);
}    
}    fetch(

);
  
}, []
);
  const clinicMap = Object.fromEntries(
clinics.map(
(
c) => [c.id, c.name]
)
);
  const filtered = users.filter(
(
u) => {
    const q = search.toLowerCase(

);
    const matchesSearch = !q || u.full_name?.toLowerCase(

).includes(
q
) || u.email?.toLowerCase(

).includes(
q
);
    const matchesClinic = !filterClinic || u.clinic_id === filterClinic;
    return matchesSearch && matchesClinic;
  
}
);
  async function bulkDisable(
ids
) {
    if (
ids.length === 0
) return;
    try {
      await supabase.from(
"users"
).update(
{
 status: "suspended" 
}
).in(
"id", ids
);
      setUsers(
(
prev) => prev.map(
(
u) => ids.includes(
u.id
) ? {
 ...u, status: "suspended" 
} : u
)
);
      toast.success(
 `${ids.length} user(s) disabled`
 );
     
 } catch (
 err
 ) {
      toast.error(
 handleApiError(err, "Failed to disable user(s)")
 );
     
 }
 }  async function bulkEnable(
ids
) {
    if (
ids.length === 0
) return;
    try {
      await supabase.from(
"users"
).update(
{
 status: "active" 
}
).in(
"id", ids
);
      setUsers(
(
prev) => prev.map(
(
u) => ids.includes(
u.id
) ? {
 ...u, status: "active" 
} : u
)
);
      toast.success(
 `${ids.length} user(s) enabled`
 );
     
 } catch (
 err
 ) {
      toast.error(
 handleApiError(err, "Failed to enable user(s)")
 );
     
 }
 }  async function toggleUserStatus(
userId
) {
    const user = users.find(
(
u) => u.id === userId
);
    const newStatus = user?.status === "suspended" ? "active" : "suspended";
    try {
      await supabase.from(
"users"
).update(
{
 status: newStatus 
}
).eq(
"id", userId
);
      setUsers(
(
prev) => prev.map(
(
u) => u.id === userId ? {
 ...u, status: newStatus 
} : u
)
);
      toast.success(
 newStatus === "suspended" ? "User disabled" : "User enabled"
 );
     
 } catch (
 err
 ) {
      toast.error(
 handleApiError(err, "Failed to update user status")
 );
     
 }
 }  async function resetPassword(
email
) {
    try {
      await supabase.auth.resetPasswordForEmail(
email, {
        redirectTo: `${window.location.origin}/reset-password`,      
}
);
      toast.success(
 `Password reset email sent to ${email}`
 );
     
 } catch (
 err
 ) {
      toast.error(
 handleApiError(err, "Failed to send reset email")
 );
     
 }
 }  async function changeRole(
userId, isSuperAdmin
) {
    try {
      await supabase.from(
"users"
).update(
{
 is_super_admin: isSuperAdmin 
}
).eq(
"id", userId
);
      setUsers(
(
prev) => prev.map(
(
u) => u.id === userId ? {
 ...u, is_super_admin: isSuperAdmin 
} : u
)
);
      toast.success(
 isSuperAdmin ? "User promoted to Super Admin" : "Super Admin role removed"
 );
     
 } catch (
 err
 ) {
      toast.error(
 handleApiError(err, "Failed to change role")
 );
    
}  
}  const columns = [    {
      key: "name", header: "Name",      render: (
u) => (
        <div className="flex items-center gap-2">          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">            <UsersIcon className="size-4 text-primary" />          </div>          <div>            <div className="flex items-center gap-1.5">              <p className="text-sm font-medium">{
u.full_name
}</p>              {
u.is_super_admin && <Shield className="size-3.5 text-muted-foreground" title="Super Admin" />
}            </div>          </div>        </div>      
),    
},    {
      key: "clinic", header: "Clinic",      render: (
u) => <span className="text-xs text-muted-foreground">{
clinicMap[u.clinic_id] || "—"
}</span>,    
},    {
      key: "role", header: "Role", sortable: false,      render: (
u) => (
        <InlineSelect          value={
u.is_super_admin ? "super_admin" : "user"
}          onChange={
(
val) => changeRole(
u.id, val === "super_admin"
)
}          options={
[            {
 value: "user", label: "User" 
},            {
 value: "super_admin", label: "Super Admin" 
},          ]
}        />      
),    
},    {
 key: "email", header: "Email", render: (
u) => <span className="text-xs text-muted-foreground">{
u.email
}</span> 
},    {
      key: "status", header: "Status",      render: (
u) => <StatusBadge status={
u.status
} />,    
},    {
      key: "lastLogin", header: "Last Login",      render: (
u) => (
        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">          <Clock className="size-3" />          {
u.last_login_at ? new Date(
u.last_login_at
).toLocaleDateString(

) : "Never"
}        </span>      
),    
},    {
      key: "actions", header: "", sortable: false,      render: (
u) => (
        <div className="flex gap-1">          <Link to={
`/admin/users/${u.id}`
}            className="rounded border bg-white px-2 py-1 text-xs font-medium hover:bg-accent">View</Link>          <Link to={
`/admin/activity?user=${u.id}`
}            className="rounded border bg-white px-2 py-1 text-xs font-medium hover:bg-accent">Activity</Link>          <button onClick={
(
) => toggleUserStatus(
u.id
)
}            className={
cn(
"rounded border px-2 py-1 text-xs font-medium transition-colors",              u.status === "suspended"                ? "border text-foreground hover:bg-accent"                : "border text-muted-foreground hover:bg-accent"            
)
}>            {
u.status === "suspended" ? "Enable" : "Disable"
}          </button>          <button onClick={
(
) => resetPassword(
u.email
)
}            className="rounded border bg-white px-2 py-1 text-xs font-medium hover:bg-accent">            <Mail className="size-3" />          </button>        </div>      
),    
},  ];
  if (
loading
) {
    return (
      <div className="flex items-center justify-center py-20">        <Loader2 className="size-6 animate-spin text-primary" />      </div>    
);
  
}  return (
    <div className="space-y-6">      <PageHeader title="Users" description={`${users.length} user(s) across all clinics.`} />      <div className="flex flex-wrap gap-3">        <SearchInput value={
search
} onChange={
setSearch
} placeholder="Search by name or email…" className="max-w-xs flex-1" />        <select value={
filterClinic
} onChange={
(
e) => setFilterClinic(
e.target.value
)
}          className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-primary">          <option value="">All clinics</option>          {
clinics.map(
(
c) => <option key={
c.id
} value={
c.id
}>{
c.name
}</option>
)
}        </select>      </div>      <DataTable        columns={
columns
}        data={
filtered
}        keyField="id"        selectable        emptyMessage="No users found."        bulkActions={
[          {
 label: "Disable", onClick: (
ids) => bulkDisable(
ids
), danger: true 
},          {
 label: "Enable", onClick: (
ids) => bulkEnable(
ids
) 
},        ]
}      />    </div>  
);

}
