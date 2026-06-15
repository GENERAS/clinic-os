"use client";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { RoleBadge } from "./role-badge";
export function StaffTable({ staff }) {
    if (staff.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">No staff members found</p>
      </div>);
    }
    return (<div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Role</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Contact</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Last Login</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {staff.map((member) => (<tr key={member.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link to={`/settings/staff/${member.id}`} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {member.avatar_url ? (<img src={member.avatar_url} alt="" className="size-8 rounded-full object-cover"/>) : (member.full_name.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {member.roles.map((role) => (<RoleBadge key={role.id} role={role.name}/>))}
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                {member.phone && (<div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3"/>
                    {member.phone}
                  </div>)}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <StatusBadge status={member.status}/>
              </td>
              <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                {member.last_login_at
                ? new Date(member.last_login_at).toLocaleDateString()
                : "Never"}
              </td>
              <td className="px-4 py-3 text-right">
                <Link to={`/settings/staff/${member.id}`} className="text-sm font-medium text-primary hover:underline">
                  View
                </Link>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
