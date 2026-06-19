"use client";
import { MessageCircle, Smartphone, Check } from "lucide-react";

export function WhatsAppValuePreview({ previews }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-900">Your clinic would automatically send</h3>
      </div>
      <ul className="space-y-1.5">
        {[
          "Appointment reminders 24h before visit",
          "Confirmation messages when booked",
          "Follow-up messages after visit",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="size-3.5 text-teal-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Preview messages your patients will receive:</p>
        {(previews || []).map((msg, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-50">
                <MessageCircle className="size-4 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-medium text-slate-900">{msg.name}</p>
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 italic">
                  {msg.template === "reminder"
                    ? `Hello ${msg.name.split(" ")[0]}, this is a reminder about your appointment tomorrow at ${msg.time.split(" ")[1]}. Please arrive 10 minutes early.`
                    : msg.template === "confirmation"
                    ? `Your appointment has been confirmed for ${msg.time}. Reply STOP to opt out.`
                    : `Thank you for visiting us, ${msg.name.split(" ")[0]}. We hope you feel better. Reply with any questions.`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
