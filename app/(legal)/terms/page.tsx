import Link from "next/link";
import { LegalDocumentLayout } from "@/components/legal/legal-document-layout";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Terms of Service" updated="June 2026">
      <section>
        <h2>1. The service</h2>
        <p>
          TouseOS provides software for student and alumni organizations (chapters, club sports, campus clubs)
          to manage members, events, communications, documents, and finances. Features vary by organization type
          TouseOS (including Greek life, club sports, and campus organizations).
        </p>
      </section>

      <section>
        <h2>2. Your responsibilities</h2>
        <ul>
          <li>Use the platform only for lawful organization operations and in line with your university and national policies.</li>
          <li>Keep login credentials secure and assign officer roles thoughtfully.</li>
          <li>Do not upload unlawful content, harass other users, or misuse member data you can access as an officer.</li>
          <li>Ensure payment and reimbursement records you enter are accurate; officers are responsible for chapter financial controls.</li>
        </ul>
      </section>

      <section>
        <h2>3. Payments</h2>
        <p>
          Card and bank payments are processed by Stripe. TouseOS is not a bank, money transmitter, or escrow agent.
          Funds settle according to your chapter&apos;s Stripe Connect configuration. Fees and payout timing are governed by Stripe&apos;s terms.
        </p>
      </section>

      <section>
        <h2>4. Data and availability</h2>
        <p>
          We strive for reliable uptime but do not guarantee uninterrupted service. You are responsible for maintaining
          backups of critical records where required by your organization. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for how we handle personal data.
        </p>
      </section>

      <section>
        <h2>5. GreekMatch and communications</h2>
        <p>
          Optional features such as GreekMatch and mass messaging must be used respectfully. Users may report misuse;
          platform administrators may suspend accounts that violate community standards.
        </p>
      </section>

      <section>
        <h2>6. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, TouseOS and its operators are not liable for indirect, incidental,
          or consequential damages arising from use of the service. Our total liability for any claim is limited to
          fees paid to us for the service in the twelve months before the claim, or one hundred U.S. dollars if no fees were paid.
        </p>
      </section>

      <section>
        <h2>7. Changes</h2>
        <p>
          We may update these terms. Continued use after notice of material changes constitutes acceptance.
          Chapters should notify members when policies change.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about these terms: contact your chapter officers or the TouseOS support channel provided in your onboarding materials.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
