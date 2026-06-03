import Link from "next/link";

export function LegalDocumentLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2 border-b border-border pb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">TouseOS</p>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
            Summary for beta users. Have qualified counsel review before a public launch.
          </p>
        </header>
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground">
          {children}
        </article>
        <footer className="flex flex-wrap gap-4 text-sm pt-4 border-t border-border">
          <Link href="/signup" className="text-primary hover:underline">← Back to signup</Link>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
        </footer>
      </div>
    </div>
  );
}
