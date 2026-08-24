"use client";

import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface TransactionItemProps {
  type: "reward" | "escrow" | "withdrawal" | "refund";
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string;
  createdAt: string;
}

const typeConfig = {
  reward: { label: "Récompense", variant: "success" as const },
  escrow: { label: "Séquestre", variant: "warning" as const },
  withdrawal: { label: "Retrait", variant: "outline" as const },
  refund: { label: "Remboursement", variant: "secondary" as const },
};

const statusConfig = {
  pending: { label: "En attente", variant: "warning" as const },
  completed: { label: "Complété", variant: "success" as const },
  failed: { label: "Échoué", variant: "destructive" as const },
};

export function TransactionItem({
  type,
  amount,
  status,
  description,
  createdAt,
}: TransactionItemProps) {
  const typeInfo = typeConfig[type];
  const statusInfo = statusConfig[status];

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-medium">{description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={typeInfo.variant} className="text-[10px]">
              {typeInfo.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm font-semibold",
            amount >= 0 ? "text-emerald-600" : "text-red-600"
          )}
        >
          {amount >= 0 ? "+" : ""}{formatCurrency(amount)}
        </span>
        <Badge variant={statusInfo.variant} className="text-[10px]">
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}
