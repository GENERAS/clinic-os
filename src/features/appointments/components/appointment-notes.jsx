"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquare } from "lucide-react";
import { appointmentNoteSchema } from "../schemas";
export function AppointmentNotes({ notes, onAddNote }) {
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset, formState: { errors }, } = useForm({
        resolver: zodResolver(appointmentNoteSchema),
    });
    const onSubmit = async (values) => {
        setSaving(true);
        try {
            await onAddNote(values.content);
            reset();
        }
        catch {
            // error handled by parent
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <div className="flex-1">
          <input type="text" placeholder="Add a note..." {...register("content")} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
          {errors.content && (<p className="mt-1 text-xs text-destructive">{errors.content.message}</p>)}
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="size-4 animate-spin"/>}
          Add
        </button>
      </form>

      {notes.length === 0 && (<p className="py-4 text-center text-sm text-muted-foreground">No notes yet</p>)}

      <div className="space-y-3">
        {notes.map((note) => (<div key={note.id} className="flex gap-3 rounded-lg border p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="size-4 text-muted-foreground"/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{note.author?.full_name || "Unknown"}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{note.content}</p>
            </div>
          </div>))}
      </div>
    </div>);
}
