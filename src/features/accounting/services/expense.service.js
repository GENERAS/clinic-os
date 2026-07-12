import { createClient } from "@/lib/supabase/client";

let cachedService = null;

export const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities (Electricity/Water)" },
  { value: "internet", label: "Internet/Phone" },
  { value: "supplies", label: "Medical Supplies" },
  { value: "salaries", label: "Staff Salaries" },
  { value: "maintenance", label: "Equipment Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "taxes", label: "Taxes & Fees" },
  { value: "marketing", label: "Marketing" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

export const EXPENSE_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

export class ExpenseService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getExpenses(clinicId, filters = {}) {
    let query = this.supabase
      .from("clinic_expenses")
      .select("*, users!clinic_expenses_created_by_fkey(id, full_name)")
      .eq("clinic_id", clinicId);

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.dateFrom) query = query.gte("expense_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("expense_date", filters.dateTo);
    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    const { data, error } = await query.order("expense_date", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createExpense(clinicId, data, userId) {
    const { data: record, error } = await this.supabase
      .from("clinic_expenses")
      .insert({
        clinic_id: clinicId,
        category: data.category,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        expense_date: data.expense_date || new Date().toISOString().split("T")[0],
        payment_method: data.payment_method || "cash",
        reference: data.reference || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return record.id;
  }

  async updateExpense(clinicId, expenseId, data) {
    const { error } = await this.supabase
      .from("clinic_expenses")
      .update({
        category: data.category,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        expense_date: data.expense_date,
        payment_method: data.payment_method,
        reference: data.reference || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async deleteExpense(clinicId, expenseId) {
    const { error } = await this.supabase
      .from("clinic_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("clinic_id", clinicId);
    if (error) throw error;
  }

  async getExpenseSummary(clinicId, dateFrom, dateTo) {
    let query = this.supabase
      .from("clinic_expenses")
      .select("category, amount")
      .eq("clinic_id", clinicId);

    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);

    const { data, error } = await query;
    if (error) throw error;

    const expenses = data || [];
    const byCategory = {};
    let total = 0;
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount);
      total += parseFloat(e.amount);
    });

    return { total, byCategory, count: expenses.length };
  }
}

export function getExpenseService() {
  if (cachedService) return cachedService;
  const supabase = createClient();
  cachedService = new ExpenseService(supabase);
  return cachedService;
}
