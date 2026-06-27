"use client";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Loader2, RefreshCw, CreditCard, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getSubscriptionService } from "@/features/subscription/services/subscription.service";
import { getPaymentService } from "@/features/subscription/services/payment.service";
import { getInvoiceService } from "@/features/subscription/services/invoice.service";
import { PlanCard } from "@/features/subscription/components/plan-card";
import { UsageBars } from "@/features/subscription/components/usage-bars";
import { BillingHistoryTable } from "@/features/subscription/components/billing-history-table";
import { PaymentSubmissionForm } from "@/features/subscription/components/payment-submission-form";
import { GracePeriodBanner } from "@/features/subscription/components/grace-period-banner";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";

export default function SubscriptionPage() {
  const { user, clinic: authClinic } = useAuth();
  const clinicId = authClinic?.id;
  const subscriptionService = getSubscriptionService();
  const paymentService = getPaymentService();
  const invoiceService = getInvoiceService();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [showRenewal, setShowRenewal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [sub, allPlans, usageData, invs, methods] = await Promise.all([
        subscriptionService.getSubscription(clinicId),
        subscriptionService.getAllPlans(),
        subscriptionService.getUsage(clinicId),
        subscriptionService.getBillingHistory(clinicId),
        paymentService.getPaymentMethods(),
      ]);
      setSubscription(sub);
      setPlans(allPlans);
      setUsage(usageData);
      setInvoices(invs);
      setPaymentMethods(methods);
      if (sub) {
        setPlan(allPlans.find((p) => p.id === sub.plan_id) || null);
        setDaysRemaining(await subscriptionService.getDaysRemaining(sub));
      }
    } catch (err) {
      toast.error(handleApiError(err, "Failed to load subscription data"));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectPlan = async (selectedPlan) => {
    if (!clinicId) return;
    try {
      if (selectedPlan.slug === "free") {
        await subscriptionService.changePlan(clinicId, selectedPlan.id);
        toast.success("Plan changed to Free");
        loadData();
      } else {
        await subscriptionService.renewSubscription(clinicId, selectedPlan.id, "monthly", selectedPlan.price_monthly);
        setShowRenewal(true);
      }
    } catch (err) {
      toast.error(handleApiError(err, "Failed to process plan selection"));
    }
  };

  const handlePaymentSubmit = async (values) => {
    if (!clinicId || !subscription || !user) return;
    await paymentService.submitPayment(clinicId, subscription.id, values, user.id);
    setShowRenewal(false);
    loadData();
  };

  const handleDownloadReceipt = (inv) => {
    invoiceService.downloadReceipt(inv);
    toast.success("Receipt downloaded");
  };

  const formatRWF = (amount) => Number(amount || 0).toLocaleString("en-RW") + " RWF";

  if (!clinicId) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const nextAmount = plan ? (subscription?.billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly) : 0;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali", year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription" description="Manage your clinic's plan and billing">
        <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </PageHeader>

      <GracePeriodBanner subscription={subscription} daysRemaining={daysRemaining} />

      {/* Section 1: Current Plan Card */}
      <SectionCard title="Current Plan" description="Your active subscription plan and status">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Plan</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{plan?.name || "—"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Status</p>
            <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              subscription?.status === "active" ? "bg-emerald-50 text-emerald-700" :
              subscription?.status === "trialing" ? "bg-blue-50 text-blue-700" :
              subscription?.status === "grace_period" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>
              {subscription?.status === "grace_period" ? "Grace Period" : subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1) || "—"}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Price</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {plan?.price_monthly > 0 ? formatRWF(plan.price_monthly) + "/mo" : "Free"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Days Remaining</p>
            <p className={`mt-1 text-lg font-bold ${daysRemaining <= 7 ? "text-amber-600" : "text-slate-900"}`}>
              {daysRemaining > 0 ? `${daysRemaining} days` : "—"}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Section 4: Renewal Banner (if not expired) */}
      {subscription && subscription.status !== "expired" && subscription.status !== "cancelled" && daysRemaining <= 30 && (
        <SectionCard title="Upcoming Renewal" description="Your next billing cycle">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`size-5 ${daysRemaining <= 7 ? "text-red-500" : "text-amber-500"}`} />
                <div>
                  <p className={`text-sm font-semibold ${daysRemaining <= 7 ? "text-red-800" : "text-amber-800"}`}>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                  </p>
                  <p className="text-xs text-slate-500">Renewal date: {renewalDate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Amount due</p>
                <p className="text-lg font-bold text-slate-900">{formatRWF(nextAmount)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowRenewal(true); setShowUpgrade(false); }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
              >
                Renew Now
              </button>
              <button
                onClick={() => { setShowUpgrade(!showUpgrade); setShowRenewal(false); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Change Plan
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Payment Submission Flow */}
      {showRenewal && (
        <SectionCard title="Submit Payment" description="Complete your renewal payment">
          <PaymentSubmissionForm
            methods={paymentMethods}
            instructions={Object.fromEntries(paymentMethods.map(m => [m.slug, m.instructions || ""]))}
            subscription={subscription}
            onBack={() => setShowRenewal(false)}
            onSubmit={handlePaymentSubmit}
          />
        </SectionCard>
      )}

      {/* Upgrade Plans */}
      {showUpgrade && (
        <SectionCard title="Available Plans" description="Choose the plan that fits your clinic">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                currentPlanId={plan?.id}
                isCurrent={plan?.id === p.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Section 2: Usage */}
      {plan && usage && (
        <SectionCard title="Usage" description="Your current usage vs plan limits">
          <UsageBars usage={usage} plan={plan} />
        </SectionCard>
      )}

      {/* Section 3: Billing History */}
      <SectionCard title="Billing History" description="Invoices and payment records">
        <BillingHistoryTable invoices={invoices} onDownload={handleDownloadReceipt} />
      </SectionCard>
    </div>
  );
}
