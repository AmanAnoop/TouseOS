"use client";

import { Trash2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export interface BudgetLineRow {
  id: string;
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

interface BudgetLineTableProps {
  lines: BudgetLineRow[];
  showType?: boolean;
  readOnly?: boolean;
  totals?: {
    budgetedLabel: string;
    actualLabel: string;
    varianceLabel: string;
  };
  onUpdateBudgeted: (lineId: string, value: number) => void;
  onUpdateActual: (lineId: string, value: number) => void;
  onDelete: (lineId: string) => void;
}

export function BudgetLineTable({
  lines,
  showType = true,
  readOnly = false,
  totals,
  onUpdateBudgeted,
  onUpdateActual,
  onDelete,
}: BudgetLineTableProps) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Category", ...(showType ? ["Type"] : []), "Description", "Budgeted", "Actual", "Variance", ""].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const variance = Number(line.actual) - Number(line.budgeted);
              const isOver = line.type === "expense" ? variance > 0 : variance < 0;
              return (
                <tr key={line.id} className="border-b border-border last:border-0 hover:bg-surface-1 transition-colors">
                  <td className="py-3 px-4 font-medium">{line.category}</td>
                  {showType && (
                    <td className="py-3 px-4">
                      <Badge label={line.type} color={line.type === "income" ? "green" : "red"} />
                    </td>
                  )}
                  <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">{line.description ?? "—"}</td>
                  <td className="py-3 px-4">
                    {readOnly ? (
                      <span>{formatCurrency(Number(line.budgeted))}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-24 h-7 border border-border rounded-md bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={line.budgeted}
                        onChange={(e) => onUpdateBudgeted(line.id, parseFloat(e.target.value) || 0)}
                        onBlur={(e) => onUpdateBudgeted(line.id, parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {readOnly ? (
                      <span>{formatCurrency(Number(line.actual))}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-24 h-7 border border-border rounded-md bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={line.actual}
                        onChange={(e) => onUpdateActual(line.id, parseFloat(e.target.value) || 0)}
                        onBlur={(e) => onUpdateActual(line.id, parseFloat(e.target.value) || 0)}
                      />
                    )}
                  </td>
                  <td className={`py-3 px-4 font-medium ${isOver ? "text-red-500" : "text-green-600"}`}>
                    {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                  </td>
                  <td className="py-3 px-4">
                    {!readOnly && (
                      <button onClick={() => onDelete(line.id)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-border bg-surface-1">
                <td colSpan={showType ? 3 : 2} className="py-3 px-4 font-bold text-foreground">Total</td>
                <td className="py-3 px-4 font-bold">{totals.budgetedLabel}</td>
                <td className="py-3 px-4 font-bold">{totals.actualLabel}</td>
                <td className="py-3 px-4 font-bold">{totals.varianceLabel}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}
