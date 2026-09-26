"use client";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
import { paymentSubmissionSchema, toFieldErrors } from "@/features/billing/schemas/billing.schema";

export function PaymentSubmissionForm({ methods, instructions, subscription, onBack, onSubmit }) {
  const [method, setMethod] = useState(methods[0]?.slug || "");
  const [transactionRef, setTransactionRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedMethod = methods.find((m) => m.slug === method);
  const methodInstructions = instructions[method] || selectedMethod?.instructions || "";

  const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = paymentSubmissionSchema.safeParse({
      payment_method: method,
      transaction_reference: transactionRef,
      amount,
      payer_name: payerName,
      payer_phone: payerPhone,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit({
        payment_method: parsed.data.payment_method,
        transaction_reference: parsed.data.transaction_reference,
        payer_name: parsed.data.payer_name || null,
        payer_phone: parsed.data.payer_phone || null,
        amount: parsed.data.amount,
      });
      toast.success("Payment submitted for verification");
    } catch (err) {
      toast.error(handleApiError(err, "Failed to submit payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Instructions */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Payment Instructions</h4>
        <pre className="whitespace-pre-wrap text-xs text-slate-600 font-sans">{methodInstructions}</pre>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="text-xs font-medium text-slate-700">Payment Method</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {methods.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => setMethod(m.slug)}
                className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors ${
                  method === m.slug
                    ? "border-teal-300 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          {errors.payment_method && <p className="mt-1 text-xs text-destructive">{errors.payment_method}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700">Transaction Reference *</label>
            <input
              type="text" value={transactionRef}
              onChange={(e) => { clearError("transaction_reference"); setTransactionRef(e.target.value); }}
              maxLength={100}
              placeholder="e.g. MTN-1234567890"
              aria-invalid={errors.transaction_reference ? "true" : undefined}
              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${errors.transaction_reference ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.transaction_reference && <p className="mt-1 text-xs text-destructive">{errors.transaction_reference}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Amount (RWF) *</label>
            <input
              type="number" value={amount}
              inputMode="decimal"
              min="0" step="any"
              onChange={(e) => { clearError("amount"); setAmount(e.target.value); }}
              placeholder="25000"
              aria-invalid={errors.amount ? "true" : undefined}
              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${errors.amount ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Payer Name</label>
            <input
              type="text" value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              maxLength={200}
              placeholder="Jean Pierre"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Phone Number</label>
            <input
              type="tel" value={payerPhone}
              onChange={(e) => { clearError("payer_phone"); setPayerPhone(e.target.value); }}
              maxLength={20}
              placeholder="0788 123 456"
              aria-invalid={errors.payer_phone ? "true" : undefined}
              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ${errors.payer_phone ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.payer_phone && <p className="mt-1 text-xs text-destructive">{errors.payer_phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button" onClick={onBack}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Submit Payment
          </button>
        </div>
      </form>
    </div>
  );
}
