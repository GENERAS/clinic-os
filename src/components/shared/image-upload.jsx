"use client";
import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/utils/cn";
export function ImageUpload({ currentUrl, onUpload, onDelete, isUploading: externalUploading, className }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [internalUploading, setInternalUploading] = useState(false);
    const isUploading = externalUploading ?? internalUploading;
    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setInternalUploading(true);
        try {
            await onUpload(file);
        }
        finally {
            setInternalUploading(false);
            URL.revokeObjectURL(objectUrl);
            setPreview(null);
        }
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }, [onUpload]);
    const handleDelete = useCallback(async () => {
        setPreview(null);
        await onDelete();
    }, [onDelete]);
    const displayUrl = preview ?? currentUrl;
    return (<div className={cn("flex flex-col items-center gap-4", className)}>
      {displayUrl ? (<div className="relative">
          <img src={displayUrl} alt="Clinic logo" className="size-32 rounded-xl border object-cover"/>
          <button type="button" onClick={handleDelete} disabled={isUploading} className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            <X className="size-3"/>
          </button>
        </div>) : (<div className="flex size-32 items-center justify-center rounded-xl border-2 border-dashed bg-muted/30">
          <Upload className="size-8 text-muted-foreground"/>
        </div>)}

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading} className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
          {isUploading ? "Uploading..." : currentUrl ? "Replace Logo" : "Upload Logo"}
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect}/>
    </div>);
}
