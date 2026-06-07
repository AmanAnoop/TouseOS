"use client";

import Link from "next/link";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface TravelTripCardProps {
  id: string;
  name: string;
  destination?: string | null;
  venueName?: string | null;
  startLabel: string;
  endLabel: string;
  status: string;
  totalCost?: number | null;
  typeLabel?: string;
}

const STATUS_COLOR: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  confirmed: "green",
  planning: "yellow",
  in_progress: "blue",
  completed: "gray",
};

export function TravelTripCard({
  id,
  name,
  destination,
  venueName,
  startLabel,
  endLabel,
  status,
  totalCost,
  typeLabel,
}: TravelTripCardProps) {
  const location = [venueName, destination].filter(Boolean).join(" · ");

  return (
    <Link href={`/travel/${id}`} className="block group">
      <Card padding="none" className="overflow-hidden hover:border-greek-300 transition-colors">
        <div className="h-2 bg-gradient-to-r from-greek-500 to-greek-700" />
        <div className="p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
            <Calendar size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate group-hover:text-greek-700">{name}</p>
              <Badge label={status.replace(/_/g, " ")} color={STATUS_COLOR[status] ?? "gray"} />
              {typeLabel && <Badge label={typeLabel} color="blue" />}
            </div>
            {location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                <MapPin size={12} />
                {location}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {startLabel} – {endLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {totalCost != null && (
              <span className="text-sm font-mono font-medium hidden sm:block">
                {formatCurrency(totalCost)}
              </span>
            )}
            <ChevronRight size={16} className="text-muted-foreground group-hover:text-greek-600" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
