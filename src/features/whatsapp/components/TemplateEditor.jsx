"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateSchema } from "../schemas";
export function TemplateEditor({ template, templateVariables, onSave, onCancel }) {
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, watch, formState: { errors }, } = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: template
            ? {
                name: template.name,
                template_type: template.template_type,
                content: template.content,
                is_active: template.is_active,
            }
            : {
                name: "",
                template_type: "appointment_reminder",
                content: "",
                is_active: true,
            },
    });
    const content = watch("content");
    const previewContent = content.replace(/\{\{(\w+)\}\}/g, (match) => `[${match}]`);
    const onSubmit = async (values) => {
        setSaving(true);
        try {
            await onSave(values);
        }
        finally {
            setSaving(false);
        }
    };
    return (<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-white">Template Name</label>
          <input {...register("name")} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="e.g., Standard Reminder"/>
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-900 dark:text-white">Type</label>
          <select {...register("template_type")} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" disabled={!!template}>
            <option value="appointment_reminder">Appointment Reminder</option>
            <option value="appointment_confirmation">Appointment Confirmation</option>
            <option value="system_notification">System Notification</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-white">Message Template</label>
        <textarea {...register("content")} rows={6} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Write your template with variables like {{patient_name}}, {{clinic_name}}, etc."/>
        {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>}
      </div>

      {/* Preview */}
      {content && (<div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Preview</label>
          <div className="mt-1 rounded-lg bg-gray-50 p-4 text-sm text-gray-900 dark:bg-gray-800 dark:text-white">
            {previewContent}
          </div>
        </div>)}

      {/* Available Variables */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Available Variables</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {Object.entries(templateVariables).map(([variable, description]) => (<button key={variable} type="button" title={description} onClick={() => {
                const textarea = document.querySelector("textarea");
                if (textarea) {
                    const start = textarea.selectionStart ?? content.length;
                    const newContent = content.slice(0, start) + variable + content.slice(textarea.selectionEnd ?? content.length);
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                    nativeInputValueSetter?.call(textarea, newContent);
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
              {variable}
            </button>))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("is_active")} className="rounded border-gray-300 dark:border-gray-600"/>
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving..." : template ? "Update Template" : "Create Template"}
        </button>
        {onCancel && (<button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
            Cancel
          </button>)}
      </div>
    </form>);
}
