"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Globe } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { clinicLocationSchema } from "../schemas/clinic-profile.schema";
export function ClinicLocationForm({ clinic, isOwner, onSave }) {
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const { register, handleSubmit, reset, formState: { errors, isDirty }, } = useForm({
        resolver: zodResolver(clinicLocationSchema),
        defaultValues: {
            country: clinic.country ?? "",
            city: clinic.city ?? "",
            address: clinic.address ?? "",
        },
    });
    useEffect(() => {
        reset({
            country: clinic.country ?? "",
            city: clinic.city ?? "",
            address: clinic.address ?? "",
        });
    }, [clinic, reset]);
    const onSubmit = async (values) => {
        setSaving(true);
        setSuccess(false);
        try {
            await onSave(values);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        finally {
            setSaving(false);
        }
    };
    return (<SectionCard title="Clinic Location" description="Physical location information. Multi-branch support coming in a future update." actions={!isOwner && (<span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="size-3"/> View only
          </span>)}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
              Country
            </label>
            <input id="country" {...register("country")} disabled={!isOwner} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>}
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              City
            </label>
            <input id="city" {...register("city")} disabled={!isOwner} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
              Address
            </label>
            <textarea id="address" rows={2} {...register("address")} disabled={!isOwner} className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"/>
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
          </div>
        </div>

        {isOwner && (<div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={saving || !isDirty} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="size-4 animate-spin"/>}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {success && <span className="text-sm text-green-600">Saved successfully</span>}
          </div>)}
      </form>
    </SectionCard>);
}
