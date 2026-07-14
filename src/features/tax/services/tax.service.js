import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export const TAX_CLASSES = {
  A: { label: "Class A — 18% VAT", rate: 18 },
  B: { label: "Class B — 0% Essential", rate: 0 },
  C: { label: "Class C — Exempt Medical", rate: 0 },
  D: { label: "Class D — Fully Exempt", rate: 0 },
};

export const MEDICAL_TAX_MAP = {
  consultation: "D",
  lab: "D",
  procedure: "D",
  surgery: "D",
  xray: "D",
  ultrasound: "D",
  vaccination: "D",
  dental: "D",
  eye_exam: "D",
  physiotherapy: "D",
  mental_health: "D",
  maternity: "D",
  otc_medicine: "B",
  wellness_product: "A",
  cosmetic: "A",
  supplement: "A",
};

export class TaxService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getTaxSettings(clinicId) {
    const { data, error } = await this.supabase
      .from("clinic_tax_settings")
      .select("*")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertTaxSettings(clinicId, data) {
    const { data: existing } = await this.supabase
      .from("clinic_tax_settings")
      .select("id")
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await this.supabase
        .from("clinic_tax_settings")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    }

    const { data: created, error } = await this.supabase
      .from("clinic_tax_settings")
      .insert({ clinic_id: clinicId, ...data })
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  calculateTax(subtotal, taxClass) {
    const cls = TAX_CLASSES[taxClass];
    if (!cls) return 0;
    return Math.round((subtotal * cls.rate) / 100 * 100) / 100;
  }

  async calculateInvoiceTax(clinicId, lineItems) {
    let totalTax = 0;
    const itemTaxBreakdown = [];

    for (const item of lineItems) {
      let taxClass = item.tax_classification || null;

      if (!taxClass && item.service_catalog_id) {
        taxClass = await this.getTaxClassForService(clinicId, item.service_catalog_id);
      }

      if (!taxClass) {
        taxClass = "D";
      }

      const lineSubtotal = (item.quantity || 1) * item.unit_price;
      const taxAmount = this.calculateTax(lineSubtotal, taxClass);

      totalTax += taxAmount;
      itemTaxBreakdown.push({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        tax_class: taxClass,
        tax_rate: TAX_CLASSES[taxClass]?.rate || 0,
        tax_amount: taxAmount,
      });
    }

    return {
      total_tax: Math.round(totalTax * 100) / 100,
      breakdown: itemTaxBreakdown,
    };
  }

  async getTaxClassForService(clinicId, serviceCatalogId) {
    const { data, error } = await this.supabase
      .from("service_catalog")
      .select("tax_classification, category")
      .eq("id", serviceCatalogId)
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (error) throw error;
    if (data?.tax_classification) return data.tax_classification;
    if (data?.category) return this.mapServiceToTaxClass(data.category);
    return "D";
  }

  async generateFiscalReceipt(clinicId, invoiceId, data) {
    const settings = await this.getTaxSettings(clinicId);
    const nextNumber = (settings?.last_fiscal_receipt_number || 0) + 1;
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(6, "0");
    const fiscalNumber = `FISCAL-${year}-${paddedNumber}`;

    const fiscalPayload = {
      fiscal_number: fiscalNumber,
      clinic_tin: settings?.tin_number || null,
      invoice_id: invoiceId,
      patient_name: data.patient_name || null,
      line_items: data.line_items || [],
      subtotal: data.subtotal || 0,
      total_tax: data.total_tax || 0,
      total: data.total || 0,
      payment_method: data.payment_method || "cash",
      issued_at: new Date().toISOString(),
    };

    const { data: receipt, error } = await this.supabase
      .from("fiscal_receipts")
      .insert({
        clinic_id: clinicId,
        invoice_id: invoiceId,
        fiscal_number: fiscalNumber,
        receipt_number: nextNumber,
        total_amount: data.total || 0,
        tax_amount: data.total_tax || 0,
        tax_class: data.tax_class || "D",
        rra_response: fiscalPayload,
        rra_status: "validated",
      })
      .select()
      .single();
    if (error) throw error;

    await this.supabase
      .from("clinic_tax_settings")
      .update({ last_fiscal_receipt_number: nextNumber })
      .eq("clinic_id", clinicId);

    return receipt;
  }

  async getFiscalReceipts(clinicId, filters = {}) {
    let query = this.supabase
      .from("fiscal_receipts")
      .select(`
        *,
        billing_invoices(invoice_number, total, patients(full_name))
      `)
      .eq("clinic_id", clinicId);

    if (filters.rra_status) query = query.eq("rra_status", filters.rra_status);
    if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getFiscalReceiptForInvoice(clinicId, invoiceId) {
    const { data, error } = await this.supabase
      .from("fiscal_receipts")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getTaxReport(clinicId, dateFrom, dateTo) {
    const { data: receipts, error } = await this.supabase
      .from("fiscal_receipts")
      .select("rra_response, created_at, total_amount, tax_amount, tax_class")
      .eq("clinic_id", clinicId)
      .eq("rra_status", "validated")
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);
    if (error) throw error;

    const byClass = {};
    let totalCollected = 0;

    for (const receipt of receipts || []) {
      const payload = receipt.rra_response;
      if (!payload?.line_items) continue;

      for (const item of payload.line_items) {
        const cls = item.tax_class || "D";
        if (!byClass[cls]) {
          byClass[cls] = {
            tax_class: cls,
            label: TAX_CLASSES[cls]?.label || cls,
            rate: TAX_CLASSES[cls]?.rate || 0,
            taxable_amount: 0,
            tax_collected: 0,
            item_count: 0,
          };
        }
        const lineTotal = (item.quantity || 1) * item.unit_price;
        byClass[cls].taxable_amount += lineTotal;
        byClass[cls].tax_collected += item.tax_amount || 0;
        byClass[cls].item_count += 1;
        totalCollected += item.tax_amount || 0;
      }
    }

    return {
      period: { dateFrom, dateTo },
      total_tax_collected: Math.round(totalCollected * 100) / 100,
      receipt_count: (receipts || []).length,
      by_class: Object.values(byClass).map(c => ({
        ...c,
        taxable_amount: Math.round(c.taxable_amount * 100) / 100,
        tax_collected: Math.round(c.tax_collected * 100) / 100,
      })),
    };
  }

  mapServiceToTaxClass(serviceCategory) {
    if (!serviceCategory) return "D";
    const normalized = serviceCategory.toLowerCase().trim();
    if (MEDICAL_TAX_MAP[normalized]) return MEDICAL_TAX_MAP[normalized];
    if (normalized.includes("consult")) return "D";
    if (normalized.includes("lab") || normalized.includes("investigation")) return "D";
    if (normalized.includes("procedure") || normalized.includes("surgery")) return "D";
    if (normalized.includes("pharmacy") || normalized.includes("medicine") || normalized.includes("drug")) return "B";
    if (normalized.includes("wellness") || normalized.includes("cosmetic") || normalized.includes("supplement")) return "A";
    return "D";
  }
}

export function getTaxService() {
  if (cachedService) return cachedService;
  const supabase = createClient();
  cachedService = new TaxService(supabase);
  return cachedService;
}
