"use client";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export function PaymentSubmissionForm({ methods, instructions, subscription, onBack, onSubmit }) {
  const [method, setMethod] = useState(methods[0]?.slug || "");
  const [transactionRef, setTransactionRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMethod = methods.find((m) => m.slug === method);
  const methodInstructions = instructions[method] || selectedMethod?.instructions || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionRef || !amount) {
      toast.error("Transaction reference and amount are required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        payment_method: method,
        transaction_reference: transactionRef,
        payer_name: payerName,
        payer_phone: payerPhone,
        amount: parseFloat(amount),
      });
      toast.success("Payment submitted for verification");
    } catch {
      toast.error("Failed to submit payment");
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

      <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700">Transaction Reference *</label>
            <input
              type="text" value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. MTN-1234567890"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Amount (RWF) *</label>
            <input
              type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Payer Name</label>
            <input
              type="text" value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Jean Pierre"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Phone Number</label>
            <input
              type="tel" value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="0788 123 456"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
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
