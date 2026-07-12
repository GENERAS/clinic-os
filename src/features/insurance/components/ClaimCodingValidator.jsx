"use client";
import { useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

const DIAGNOSIS_BILLING_RULES = [
  { diagnosisPrefix: ["B54"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Unspecified Malaria" },
  { diagnosisPrefix: ["B53", "B52"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Malaria" },
  { diagnosisPrefix: ["A01"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Typhoid" },
  { diagnosisPrefix: ["J18"], allowedCategories: ["lab", "consultation", "pharmacy", "procedure"], label: "Pneumonia" },
  { diagnosisPrefix: ["A09"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Diarrhea / GI" },
  { diagnosisPrefix: ["E11"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Type 2 Diabetes" },
  { diagnosisPrefix: ["I10"], allowedCategories: ["lab", "consultation", "pharmacy"], label: "Hypertension" },
];

export function ClaimCodingValidator({ diagnoses = [], billingItems = [] }) {
  const validation = useMemo(() => {
    const warnings = [];
    const errors = [];
    const matches = [];

    if (diagnoses.length === 0 && billingItems.length > 0) {
      warnings.push({ type: "no_diagnosis", message: "No diagnosis codes — billing items will not be clinically justified" });
    }

    if (diagnoses.length > 0 && billingItems.length === 0) {
      warnings.push({ type: "no_billing", message: "Diagnoses recorded but no billing items attached" });
    }

    diagnoses.forEach(dx => {
      const icd = dx.icd_code || dx.code || "";
      const prefix = icd.substring(0, 3);
      const rule = DIAGNOSIS_BILLING_RULES.find(r => r.diagnosisPrefix.some(p => prefix.startsWith(p)));

      if (rule) {
        billingItems.forEach(item => {
          const category = item.category || "other";
          if (!rule.allowedCategories.includes(category)) {
            errors.push({
              type: "category_mismatch",
              message: `"${item.description}" (${category}) is not typically billed for ${rule.label} (${icd})`,
              suggestion: `Verify if this item is clinically appropriate for ${rule.label}`,
            });
          } else {
            matches.push({ diagnosis: icd, item: item.description, rule: rule.label });
          }
        });
      }
    });

    const totalAmount = billingItems.reduce((s, i) => s + (parseFloat(i.total || i.unit_price || 0) * (parseInt(i.quantity) || 1)), 0);
    if (billingItems.length > 5) {
      warnings.push({ type: "many_items", message: `${billingItems.length} billing items — review for completeness` });
    }
    if (totalAmount > 500000) {
      warnings.push({ type: "high_cost", message: `Total ${new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(totalAmount)} — ensure all items are justified` });
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings, matches };
  }, [diagnoses, billingItems]);

  return (
    <div className="space-y-2">
      {validation.valid && validation.warnings.length === 0 ? (
        <div className="rounded-xl border bg-white p-3 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <p className="text-xs font-medium text-emerald-600">Coding valid — all diagnoses match billing items</p>
        </div>
      ) : validation.valid ? (
        <div className="rounded-xl border bg-white p-3 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <p className="text-xs font-medium text-emerald-600">Coding valid with warnings</p>
          </div>
          {validation.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600">
              <AlertTriangle className="size-3 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-3 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="size-4 text-red-500" />
            <p className="text-xs font-medium text-red-600">Coding issues found ({validation.errors.length} error{validation.errors.length !== 1 ? "s" : ""})</p>
          </div>
          {validation.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-600">
              <AlertCircle className="size-3 mt-0.5 shrink-0" />
              <div>
                <span>{e.message}</span>
                {e.suggestion && <span className="block text-amber-600 ml-4">→ {e.suggestion}</span>}
              </div>
            </div>
          ))}
          {validation.warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex items-start gap-1.5 text-[10px] text-amber-600">
              <AlertTriangle className="size-3 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
