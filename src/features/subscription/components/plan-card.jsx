"use client";
import { Check } from "lucide-react";

export function PlanCard({ plan, currentPlanId, isCurrent, onSelect, compact }) {
  const isFree = plan.slug === "free";
  const isPopular = plan.slug === "professional";

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${isCurrent ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
            <p className="text-xs text-slate-500">{plan.price_monthly > 0 ? `${Number(plan.price_monthly).toLocaleString("en-RW")} RWF/mo` : "Free"}</p>
          </div>
          {isCurrent && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">Current</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border-2 p-5 ${isCurrent ? "border-teal-500 bg-teal-50/30" : isPopular ? "border-teal-300" : "border-slate-200 bg-white"} shadow-sm`}>
      {isPopular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-3 py-0.5 text-[11px] font-semibold text-white">
          Recommended
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-2.5 right-4 rounded-full bg-teal-100 px-3 py-0.5 text-[11px] font-semibold text-teal-700">
          Current Plan
        </div>
      )}

      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{plan.description}</p>

      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">
          {isFree ? "Free" : `${Number(plan.price_monthly).toLocaleString("en-RW")} RWF`}
        </p>
        {!isFree && <p className="text-xs text-slate-500">per month</p>}
        {!isFree && plan.price_yearly > 0 && (
          <p className="text-xs text-slate-400 mt-0.5">{Number(plan.price_yearly).toLocaleString("en-RW")} RWF/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)</p>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {(plan.features || []).map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <Check className="mt-0.5 size-3.5 shrink-0 text-teal-600" />
            {feature}
          </li>
        ))}
        <li className="flex items-start gap-2 text-xs text-slate-600">
          <Check className="mt-0.5 size-3.5 shrink-0 text-teal-600" />
          Up to {plan.max_staff} staff
        </li>
        <li className="flex items-start gap-2 text-xs text-slate-600">
          <Check className="mt-0.5 size-3.5 shrink-0 text-teal-600" />
          Up to {plan.max_patients === 99999 ? "unlimited" : plan.max_patients} patients
        </li>
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent}
        className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          isCurrent
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : isPopular
              ? "bg-teal-600 text-white hover:bg-teal-500"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {isCurrent ? "Current Plan" : isFree ? "Start Free Trial" : "Select Plan"}
      </button>
    </div>
  );
}
