import Link from "next/link";
import { Card } from "@/components/ui";
import type { ReactNode } from "react";

export interface ProductShortcut {
  href: string;
  label: string;
  icon?: ReactNode;
}

const LINK_CLASS: Record<string, string> = {
  sports: "text-sports-600 hover:bg-sports-50/50 dark:hover:bg-sports-950/20",
  club: "text-club-600 hover:bg-club-50/50 dark:hover:bg-club-950/20",
  greek: "text-greek-600 hover:bg-greek-50/50 dark:hover:bg-greek-950/20",
};

export function ProductHomeShortcuts({
  title,
  product,
  links,
}: {
  title: string;
  product: "sports" | "club" | "greek";
  links: ProductShortcut[];
}) {
  const linkClass = LINK_CLASS[product];

  return (
    <Card padding="sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium p-2 rounded-lg transition-colors ${linkClass}`}
          >
            {link.label} →
          </Link>
        ))}
      </div>
    </Card>
  );
}
