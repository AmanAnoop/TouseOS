import Link from "next/link";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p>
        TouseOS is provided for chapter and campus organization operations. By using the service you agree to
        use it responsibly, keep member data confidential, and comply with your university and national organization policies.
      </p>
      <p>
        Payment processing is handled by Stripe. TouseOS is not a bank and does not hold funds on your behalf.
      </p>
      <p className="text-muted-foreground text-sm">
        This is a placeholder summary. Replace with counsel-approved terms before public launch.
      </p>
      <Link href="/signup" className="text-greek-600 hover:underline">← Back to signup</Link>
    </div>
  );
}
