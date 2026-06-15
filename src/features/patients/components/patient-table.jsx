"use client";
import { Link } from "react-router-dom";
import { Phone, Calendar } from "lucide-react";
export function PatientTable({ patients }) {
    if (patients.length === 0) {
        return (<div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">No patients found</p>
      </div>);
    }
    return (<div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Phone</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Gender</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Visits</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Last Visit</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {patients.map((patient) => (<tr key={patient.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link to={`/patients/${patient.id}`} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {patient.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{patient.phone}</p>
                  </div>
                </Link>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="size-3.5 text-muted-foreground"/>
                  {patient.phone}
                </div>
              </td>
              <td className="hidden px-4 py-3 capitalize md:table-cell">
                {patient.gender || "—"}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">{patient.total_visits}</td>
              <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                {patient.last_visit_date
                ? new Date(patient.last_visit_date + "T00:00:00").toLocaleDateString()
                : "Never"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link to={`/appointments/new?patient_id=${patient.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                    <Calendar className="size-3"/>
                    Book
                  </Link>
                  <Link to={`/patients/${patient.id}`} className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                    View
                  </Link>
                </div>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
