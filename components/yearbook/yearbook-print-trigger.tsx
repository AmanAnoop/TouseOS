"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";

export function YearbookPrintTrigger({ disabled }: { disabled?: boolean }) {
  return (
    <Link href="/yearbook/print" target="_blank" rel="noopener noreferrer">
      <Button variant="secondary" size="sm" icon={<Printer size={14} />} disabled={disabled}>
        Print PDF
      </Button>
    </Link>
  );
}
