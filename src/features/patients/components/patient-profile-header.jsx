"use client";
import { Link } from "react-router-dom";
import { Phone, Mail, Calendar, MapPin, PhoneCall, Clock, User } from "lucide-react";
export function PatientProfileHeader({ patient }) {
    return (<div className="rounded-xl border">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-xl font-semibold">
            {patient.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{patient.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {patient.gender && (<span className="inline-flex items-center gap-1 capitalize">
                  <User className="size-3.5"/>
                  {patient.gender}
                </span>)}
              {patient.age !== null && (<span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5"/>
                  {patient.age} years
                </span>)}
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5"/>
                {new Date(patient.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
            <PhoneCall className="size-4"/>
            Call
          </a>
          <Link to={`/appointments/new?patient_id=${patient.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Calendar className="size-4"/>
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 border-t">
        <div className="border-r px-6 py-3 text-center">
          <p className="text-2xl font-semibold">{patient.total_appointments}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </div>
        <div className="border-r px-6 py-3 text-center">
          <p className="text-sm font-medium">
            {patient.last_appointment
            ? new Date(patient.last_appointment.appointment_date + "T00:00:00").toLocaleDateString()
            : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Last Visit</p>
        </div>
        <div className="px-6 py-3 text-center">
          <p className="text-sm font-medium">
            {patient.upcoming_appointment
            ? new Date(patient.upcoming_appointment.appointment_date + "T00:00:00").toLocaleDateString()
            : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </div>
      </div>

      {/* Contact details */}
      <div className="grid gap-3 border-t px-6 py-4 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-muted-foreground"/>
          <span>{patient.phone}</span>
        </div>
        {patient.email && (<div className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground"/>
            <span>{patient.email}</span>
          </div>)}
        {patient.address && (<div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground"/>
            <span>{patient.address}</span>
          </div>)}
      </div>
    </div>);
}
