"use client";
import { Link } from "react-router-dom";
import { Mail, Phone, Calendar, Clock } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { RoleBadge } from "./role-badge";
export function StaffCard({ member }) {
    return (<Link to={`/settings/staff/${member.id}`} className="block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {member.avatar_url ? (<img src={member.avatar_url} alt="" className="size-10 rounded-full object-cover"/>) : (member.full_name.charAt(0).toUpperCase())}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{member.full_name}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {member.roles.map((role) => (<RoleBadge key={role.id} role={role.name}/>))}
              </div>
            </div>
            <StatusBadge status={member.status}/>
          </div>

          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Mail className="size-3"/>
              {member.email}
            </div>
            {member.phone && (<div className="flex items-center gap-1.5">
                <Phone className="size-3"/>
                {member.phone}
              </div>)}
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3"/>
              Joined {new Date(member.created_at).toLocaleDateString()}
            </div>
            {member.last_login_at && (<div className="flex items-center gap-1.5">
                <Clock className="size-3"/>
                Last login {new Date(member.last_login_at).toLocaleDateString()}
              </div>)}
          </div>
        </div>
      </div>
    </Link>);
}
