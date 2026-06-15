"use client";
import { useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { DAY_LABELS } from "../types";
function getEmptyHours() {
    return Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        is_open: true,
        open_time: "08:00",
        close_time: "17:00",
    }));
}
function mergeHours(existing) {
    const map = new Map();
    for (const h of existing) {
        map.set(h.day_of_week, {
            day_of_week: h.day_of_week,
            is_open: h.is_open,
            open_time: h.open_time.slice(0, 5),
            close_time: h.close_time.slice(0, 5),
        });
    }
    return Array.from({ length: 7 }, (_, i) => {
        const existing_entry = map.get(i);
        return existing_entry ?? {
            day_of_week: i,
            is_open: false,
            open_time: "08:00",
            close_time: "17:00",
        };
    });
}
export function ClinicHoursEditor({ hours, isOwner, onSave }) {
    const [entries, setEntries] = useState(() => mergeHours(hours));
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const hasChanges = JSON.stringify(entries) !== JSON.stringify(mergeHours(hours));
    const updateEntry = (index, partial) => {
        setEntries((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...partial };
            return next;
        });
    };
    const handleSave = async () => {
        setError(null);
        for (const entry of entries) {
            if (entry.is_open && entry.close_time <= entry.open_time) {
                setError(`Closing time must be after opening time for ${DAY_LABELS[entry.day_of_week]}`);
                return;
            }
        }
        setSaving(true);
        setSuccess(false);
        try {
            await onSave(entries);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        catch {
            setError("Failed to save operating hours");
        }
        finally {
            setSaving(false);
        }
    };
    return (<SectionCard title="Operating Hours" description="Set your clinic's weekly operating schedule" actions={!isOwner && (<span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3"/> View only
          </span>)}>
      {entries.length === 0 ? (<div className="flex flex-col items-center gap-2 py-8 text-center">
          <Clock className="size-8 text-muted-foreground"/>
          <p className="text-sm text-muted-foreground">No operating hours set</p>
        </div>) : (<div className="divide-y">
          {entries.map((entry, index) => (<div key={entry.day_of_week} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {isOwner && (<label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={entry.is_open} onChange={(e) => updateEntry(index, { is_open: e.target.checked })} disabled={!isOwner} className="peer sr-only"/>
                    <div className="h-5 w-9 rounded-full bg-muted after:absolute after:start-[2px] after:top-[2px] after:size-4 after:rounded-full after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"/>
                  </label>)}
                <span className={`min-w-[100px] text-sm font-medium ${!entry.is_open ? "text-muted-foreground line-through" : ""}`}>
                  {DAY_LABELS[entry.day_of_week]}
                </span>
              </div>

              {entry.is_open ? (<div className="flex items-center gap-2">
                  <input type="time" value={entry.open_time} onChange={(e) => updateEntry(index, { open_time: e.target.value })} disabled={!isOwner} className="rounded-lg border bg-background px-3 py-1.5 text-sm disabled:opacity-60"/>
                  <span className="text-sm text-muted-foreground">to</span>
                  <input type="time" value={entry.close_time} onChange={(e) => updateEntry(index, { close_time: e.target.value })} disabled={!isOwner} className="rounded-lg border bg-background px-3 py-1.5 text-sm disabled:opacity-60"/>
                </div>) : (<span className="text-sm text-muted-foreground">Closed</span>)}
            </div>))}
        </div>)}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {isOwner && (entries.length > 0) && (<div className="mt-6 flex items-center gap-3 border-t pt-4">
          <button type="button" onClick={handleSave} disabled={saving || !hasChanges} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="size-4 animate-spin"/>}
            {saving ? "Saving..." : "Save Hours"}
          </button>
          {success && <span className="text-sm text-green-600">Hours saved successfully</span>}
        </div>)}
    </SectionCard>);
}
