"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Search, Loader2, UserPlus } from "lucide-react"
import { getPatientService } from "../services/patient.service"
import type { PatientSearchResult } from "../types"

interface PatientSearchBarProps {
  clinicId: string
  onSelectPatient?: (patient: PatientSearchResult) => void
  autoFocus?: boolean
  placeholder?: string
  showCreateButton?: boolean
}

export function PatientSearchBar({
  clinicId,
  onSelectPatient,
  autoFocus = false,
  placeholder = "Search patients by name or phone...",
  showCreateButton = true,
}: PatientSearchBarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const service = getPatientService()

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await service.searchPatients(clinicId, query)
        setResults(data)
        setOpen(data.length > 0 || query.trim().length >= 2)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, clinicId, service])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (patient: PatientSearchResult) => {
    setOpen(false)
    setQuery("")
    if (onSelectPatient) {
      onSelectPatient(patient)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-card shadow-lg">
          {results.length === 0 && query.trim().length >= 2 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No patients found</p>
              {showCreateButton && (
                <Link
                  href={`/patients/new?name=${encodeURIComponent(query)}&phone=${encodeURIComponent(query)}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  onClick={() => setOpen(false)}
                >
                  <UserPlus className="size-4" />
                  Create new patient
                </Link>
              )}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(patient)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {patient.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{patient.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                    {patient.gender && (
                      <span className="hidden text-xs capitalize text-muted-foreground sm:inline">{patient.gender}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
