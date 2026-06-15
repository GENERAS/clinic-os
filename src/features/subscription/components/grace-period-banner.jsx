"use client";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";

export function GracePeriodBanner({ subscription, daysRemaining }) {
  if (!subscription) return null;

  if (subscription.status === "expired") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Subscription Expired</p>
            <p className="text-xs text-red-600 mt-0.5">Your subscription has expired. Renew now to restore full access to all features.</p>
          </div>
          <Link to="/subscription" className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500">Renew Now</Link>
        </div>
      </div>
    );
  }

  if (subscription.status === "grace_period") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <Clock className="size-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Grace Period</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your subscription has expired. You are in a grace period. Some features are limited. Renew now to restore full access.
            </p>
          </div>
          <Link to="/subscription" className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-500">Renew Now</Link>
        </div>
      </div>
    );
  }

  if (subscription.status === "pending_payment") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <Clock className="size-5 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Payment Pending</p>
            <p className="text-xs text-blue-600 mt-0.5">Your payment is pending verification. Once verified, your subscription will be activated.</p>
          </div>
        </div>
      </div>
    );
  }

  if (daysRemaining > 0 && daysRemaining <= 14) {
    return (
      <div className={`rounded-xl border p-4 ${daysRemaining <= 3 ? "border-red-200 bg-red-50" : daysRemaining <= 7 ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`size-5 shrink-0 ${daysRemaining <= 3 ? "text-red-500" : daysRemaining <= 7 ? "text-amber-500" : "text-blue-500"}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${daysRemaining <= 3 ? "text-red-800" : daysRemaining <= 7 ? "text-amber-800" : "text-blue-800"}`}>
              Subscription Expires {daysRemaining === 1 ? "Tomorrow" : `in ${daysRemaining} Days`}
            </p>
            <p className={`text-xs mt-0.5 ${daysRemaining <= 3 ? "text-red-600" : daysRemaining <= 7 ? "text-amber-600" : "text-blue-600"}`}>
              Renew now to avoid interruption of service.
            </p>
          </div>
          <Link to="/subscription" className={`shrink-0 rounded-lg px-4 py-2 text-xs font-medium text-white ${daysRemaining <= 3 ? "bg-red-600 hover:bg-red-500" : daysRemaining <= 7 ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"}`}>
            Renew Now
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
