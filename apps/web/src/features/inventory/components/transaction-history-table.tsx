"use client"

import { TRANSACTION_TYPE_LABELS } from "../types"
import type { InventoryTransactionWithUser } from "../types"

interface TransactionHistoryTableProps {
  transactions: InventoryTransactionWithUser[]
}

const typeColors: Record<string, string> = {
  stock_in: "text-emerald-600 dark:text-emerald-400",
  stock_out: "text-red-600 dark:text-red-400",
  adjustment: "text-amber-600 dark:text-amber-400",
  expired: "text-slate-600 dark:text-slate-400",
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">No transactions recorded yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Qty</th>
            <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Previous</th>
            <th className="hidden px-4 py-3 text-right font-medium md:table-cell">New</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Performed By</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-muted/30">
              <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums">
                {new Date(tx.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className={`font-medium ${typeColors[tx.type] || ""}`}>
                  {TRANSACTION_TYPE_LABELS[tx.type]}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {tx.quantity}
              </td>
              <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell tabular-nums">
                {tx.previous_stock}
              </td>
              <td className="hidden px-4 py-3 text-right md:table-cell tabular-nums">
                {tx.new_stock}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <span className="text-xs">{tx.performed_by_name}</span>
              </td>
              <td className="hidden max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                {tx.reason || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
