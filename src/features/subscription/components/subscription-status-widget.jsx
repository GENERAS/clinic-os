"use client";
import { Link } from "react-router-dom";
import { CreditCard, Loader2 } from "lucide-react";

export function SubscriptionStatusWidget({ subscription, plan, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="size-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="size-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">No active subscription</p>
        <Link to="/subscription" className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500">
          View Plans
        </Link>
      </div>
    );
  }

  const daysRemaining = subscription.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const statusColors = {
    active: "text-emerald-600 bg-emerald-50",
    trialing: "text-blue-600 bg-blue-50",
    grace_period: "text-amber-600 bg-amber-50",
    pending_payment: "text-blue-600 bg-blue-50",
    expired: "text-red-600 bg-red-50",
    suspended: "text-red-600 bg-red-50",
    cancelled: "text-slate-500 bg-slate-100",
  };

  const statusColor = statusColors[subscription.status] || "text-slate-500 bg-slate-100";
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 14;
  const isExpired = ["expired", "grace_period"].includes(subscription.status);

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${isExpired ? "border-red-200 bg-red-50" : isExpiringSoon ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard className={`size-4 ${isExpired ? "text-red-500" : "text-slate-400"}`} />
          <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
          {subscription.status === "trialing" ? "Trial" : subscription.status === "grace_period" ? "Grace Period" : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
        {daysRemaining > 0 && (
          <div className="flex items-baseline justify-between">
            <p className={`text-xs ${isExpiringSoon ? "text-amber-600 font-medium" : "text-slate-500"}`}>
              {daysRemaining} day{daysRemaining > 1 ? "s" : ""} remaining
            </p>
          </div>
        )}
        {subscription.current_period_end && daysRemaining > 0 && (
          <p className="text-[11px] text-slate-400">
            Renews: {new Date(subscription.current_period_end).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali" })}
          </p>
        )}
      </div>

      {(isExpired || isExpiringSoon || daysRemaining <= 14) && (
        <Link
          to="/subscription"
          className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-white ${isExpired ? "bg-red-600 hover:bg-red-500" : "bg-teal-600 hover:bg-teal-500"}`}
        >
          {isExpired ? "Renew Now" : "Manage Plan"}
        </Link>
      )}
    </div>
  );
}
