import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        We store account, roster, and operational data needed to run your organization (events, payments, messages, etc.).
        Data is hosted in Supabase with row-level security per organization.
      </p>
      <p>
        Officers control who can see financial and member records through role permissions inside each org.
      </p>
      <p className="text-muted-foreground text-sm">
        This is a placeholder summary. Replace with counsel-approved privacy policy before public launch.
      </p>
      <Link href="/signup" className="text-greek-600 hover:underline">← Back to signup</Link>
    </div>
  );
}
