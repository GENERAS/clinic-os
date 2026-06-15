"use client";
import { SectionCard } from "@/components/shared/section-card";
import { ImageUpload } from "@/components/shared/image-upload";
import { Palette } from "lucide-react";
export function ClinicBrandingForm({ logoUrl, isOwner, onUpload, onDelete, isUploading }) {
    return (<SectionCard title="Clinic Branding" description="Upload your clinic logo for display across the system" actions={!isOwner && (<span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Palette className="size-3"/> View only
          </span>)}>
      {isOwner ? (<ImageUpload currentUrl={logoUrl} onUpload={onUpload} onDelete={onDelete} isUploading={isUploading}/>) : logoUrl ? (<div className="flex items-center gap-4">
          <img src={logoUrl} alt="Clinic logo" className="size-24 rounded-xl border object-cover"/>
          <div>
            <p className="font-medium">Current Logo</p>
            <p className="text-sm text-muted-foreground">Contact an owner to modify branding</p>
          </div>
        </div>) : (<div className="flex flex-col items-center gap-2 py-8 text-center">
          <Palette className="size-8 text-muted-foreground"/>
          <p className="text-sm text-muted-foreground">No logo uploaded yet</p>
        </div>)}
    </SectionCard>);
}
