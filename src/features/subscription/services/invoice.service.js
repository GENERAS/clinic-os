import { createClient } from "@/lib/supabase/client";

export function getInvoiceService() {
  const supabase = createClient();

  return {
    async getInvoices(clinicId) {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("issued_at", { ascending: false });
      return data || [];
    },

    async getInvoiceById(invoiceId) {
      const { data } = await supabase.from("invoices").select("*, clinics(name)").eq("id", invoiceId).maybeSingle();
      return data || null;
    },

    async getAllInvoices(page = 0, pageSize = 50) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, count } = await supabase
        .from("invoices")
        .select("*, clinics!inner(name)", { count: "exact" })
        .order("issued_at", { ascending: false })
        .range(from, to);
      return { data: data || [], total: count || 0 };
    },

    formatInvoiceNumber(num) {
      const year = new Date().getFullYear();
      return `INV-${year}-${String(num).padStart(5, "0")}`;
    },

    generateReceiptHtml(invoice) {
      const statusColor = invoice.status === "paid" ? "#059669" : invoice.status === "pending" ? "#d97706" : "#dc2626";
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt ${invoice.invoice_number}</title>
<style>
  body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
  .title { font-size: 24px; font-weight: 700; color: #0f172a; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${statusColor}15; color: ${statusColor}; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { font-size: 14px; font-weight: 500; color: #0f172a; margin-top: 4px; }
  .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px; }
  .amount-label { font-size: 12px; color: #64748b; }
  .amount-value { font-size: 36px; font-weight: 700; color: #0f172a; margin-top: 4px; }
  .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center; }
</style></head><body>
  <div class="header">
    <div><div class="title">Receipt</div><div style="color:#64748b;font-size:14px;margin-top:4px;">${invoice.invoice_number}</div></div>
    <div class="badge">${invoice.status.toUpperCase()}</div>
  </div>
  <div class="grid">
    <div><div class="label">Clinic</div><div class="value">${invoice.clinics?.name || "—"}</div></div>
    <div><div class="label">Plan</div><div class="value">${invoice.plan_name || "—"}</div></div>
    <div><div class="label">Issue Date</div><div class="value">${new Date(invoice.issued_at).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali" })}</div></div>
    <div><div class="label">Payment Date</div><div class="value">${invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("en-RW", { timeZone: "Africa/Kigali" }) : "—"}</div></div>
  </div>
  <div class="amount-box">
    <div class="amount-label">Total Amount</div>
    <div class="amount-value">${Number(invoice.amount).toLocaleString("en-RW")} RWF</div>
  </div>
  <div class="footer">
    <p>ClinicOS Ltd &middot; KG 123 St, Kigali, Rwanda</p>
    <p>Thank you for your business!</p>
  </div>
</body></html>`;
    },

    downloadReceipt(invoice) {
      const html = this.generateReceiptHtml(invoice);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.html`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}
