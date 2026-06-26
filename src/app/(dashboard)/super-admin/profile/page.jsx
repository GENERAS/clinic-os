"use client";
import { PageHeader } from "@/components/shared/page-header";

import {
 useState, useEffect 
} from "react";
import {
 createClient 
} from "@/lib/supabase/client";
import {
 useAuth 
} from "@/features/auth/hooks/use-auth";
import {
 User, Mail, Phone, Shield, Calendar, Clock, Save, Loader2, ArrowLeft, Key, LogOut, Smartphone, Monitor, CheckCircle2 
} from "lucide-react";
import {
 Link 
} from "react-router-dom";
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
 
}export default function AdminProfile(

) {
  const {
 user: authUser 
} = useAuth(

);
  const [profile, setProfile] = useState(
null
);
  const [loading, setLoading] = useState(
true
);
  const [saving, setSaving] = useState(
false
);
  const [form, setForm] = useState(
{
 full_name: "", phone: "" 
}
);
  const [twoFA, setTwoFA] = useState(
false
);
  useEffect(
(
) => {
    if (
!authUser?.id
) return;
    const supabase = createClient(

);
    async function fetch(

) {
      try {
        const {
 data 
} = await supabase.from(
"users"
).select(
"*"
).eq(
"id", authUser.id
).single(

);
        if (
data
) {
          setProfile(
data
);
          setForm(
{
 full_name: data.full_name || "", phone: data.phone || "" 
}
);
        
}      
} catch (err) {
        toast.error(handleApiError(err, "Failed to load profile"));
} finally {
        setLoading(false);
}    
}    fetch(

);
  
}, [authUser?.id]
);
  async function handleSave(

) {
    setSaving(
true
);
    try {
      const supabase = createClient(

);
      const {
 error 
} = await supabase.from(
"users"
)        .update(
{
 full_name: form.full_name, phone: form.phone || null 
}
)        .eq(
"id", authUser.id
);
      if (
error
) throw error;
      setProfile(
(
prev) => (
{
 ...prev, full_name: form.full_name, phone: form.phone 
}
)
);
      toast.success(
"Profile updated"
);
    
} catch (
err
) {
      toast.error(
handleApiError(err, "Failed to update profile")
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
    <div className="space-y-6 max-w-2xl">      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">        <ArrowLeft className="size-4" /> Back to Dashboard      </Link>      <div className="flex items-start justify-between">        <div className="flex items-center gap-4">          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">            <User className="size-7 text-primary" />          </div>          <PageHeader title={profile?.full_name || "Admin"} description={profile?.email} />        </div>      </div>      <div className="grid gap-6 sm:grid-cols-2">        {
/* PROFILE DETAILS */
}        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">          <h2 className="text-sm font-semibold text-slate-900">Profile Details</h2>          <div className="space-y-3">            <div>              <label className="text-xs font-medium text-slate-500">Full Name</label>              <input value={
form.full_name
} onChange={
(
e) => setForm(
(
f) => (
{
 ...f, full_name: e.target.value 
}
)
)
}                className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary" />            </div>            <div>              <label className="text-xs font-medium text-slate-500">Email</label>              <p className="mt-0.5 text-sm flex items-center gap-1.5">                <Mail className="size-3.5 text-slate-500" /> {
profile?.email
}              </p>            </div>            <div>              <label className="text-xs font-medium text-slate-500">Phone</label>              <input value={
form.phone
} onChange={
(
e) => setForm(
(
f) => (
{
 ...f, phone: e.target.value 
}
)
)
}                className="mt-1 w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary"                placeholder="+250..." />            </div>          </div>          <button onClick={
handleSave
} disabled={
saving
}            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">            {
saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />
}            Save Changes          </button>        </div>        {
/* ACCOUNT INFO */
}        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">          <h2 className="text-sm font-semibold text-slate-900">Account Info</h2>          <div className="space-y-3">            <div className="flex items-center gap-2 text-sm text-slate-500">              <Shield className="size-4 text-slate-500" /> Super Admin            </div>            <div className="flex items-center gap-2 text-sm text-slate-500">              <Calendar className="size-4" /> Created: {
profile?.created_at ? new Date(
profile.created_at
).toLocaleDateString(

) : "—"
}            </div>            <div className="flex items-center gap-2 text-sm text-slate-500">              <Clock className="size-4" /> Last login: {
profile?.last_login_at ? new Date(
profile.last_login_at
).toLocaleString(

) : "Never"
}            </div>          </div>        </div>      </div>      {
/* SECURITY */
}      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center gap-2 mb-4">          <Key className="size-4 text-slate-500" />          <h2 className="text-sm font-semibold text-slate-900">Security</h2>        </div>        <div className="space-y-4">          <div className="flex items-center justify-between">            <div>              <p className="text-sm font-medium">Password</p>              <p className="text-xs text-slate-500">Last changed recently</p>            </div>            <button onClick={
(
) => toast.success(
"Password reset email sent (simulated)"
)
}              className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 transition-colors">              Change Password            </button>          </div>          <div className="flex items-center justify-between">            <div>              <p className="text-sm font-medium">Two-Factor Authentication</p>              <p className="text-xs text-slate-500">{
twoFA ? "Enabled" : "Add extra security to your account"
}</p>            </div>            <button onClick={
(
) => {
 setTwoFA(
!twoFA
);
 toast.success(
twoFA ? "2FA disabled (simulated)" : "2FA enabled (simulated)"
);
 
}
}              className={
cn(
"rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",                twoFA ? "border text-slate-900 hover:bg-slate-100" : "border bg-white hover:bg-slate-100"              
)
}>              {
twoFA ? "Disable" : "Enable"
}            </button>          </div>          <div className="flex items-center justify-between">            <div>              <p className="text-sm font-medium">Active Sessions</p>              <p className="text-xs text-slate-500">1 session · Current browser</p>            </div>            <button onClick={
(
) => toast.success(
"All other sessions logged out (simulated)"
)
}              className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 transition-colors flex items-center gap-1">              <LogOut className="size-3" /> Logout All            </button>          </div>        </div>      </div>      {
/* RECENT SESSIONS */
}      <div className="rounded-xl border bg-white p-5 shadow-sm">        <div className="flex items-center gap-2 mb-4">          <Monitor className="size-4 text-slate-500" />          <h2 className="text-sm font-semibold text-slate-900">Login History</h2>        </div>        <div className="space-y-3">          {
[            {
 device: "Chrome on Windows", ip: "196.0.0.1", time: "2 hours ago", current: true 
},          ].map(
(
s, i) => (
            <div key={
i
} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5">              <div className="flex items-center gap-3">                <Monitor className="size-4 text-slate-500" />                <div>                  <p className="text-sm font-medium">{
s.device
}</p>                  <p className="text-xs text-slate-500">{
s.ip
} · {
s.time
}</p>                </div>              </div>              {
s.current && <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium">Current</span>
}            </div>          
)
)
}          <p className="text-xs text-slate-500 text-center pt-1">            <Link to="/admin/activity" className="text-primary hover:underline">View full login history</Link>          </p>        </div>      </div>    </div>  
);

}
