import Link from "next/link";
import { LegalDocumentLayout } from "@/components/legal/legal-document-layout";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy" updated="June 2026">
      <section>
        <h2>1. What we collect</h2>
        <p>Depending on how your organization uses TouseOS, we may process:</p>
        <ul>
          <li>Account data (name, email, phone, profile photo)</li>
          <li>Roster and membership data (class year, major, emergency contacts, roles)</li>
          <li>Operational data (events, attendance, tasks, documents, messages you send through the app)</li>
          <li>Financial data (dues, payments, reimbursements, budget lines — processed in part via Stripe)</li>
          <li>Optional social data (feed posts, GreekMatch profile fields if you opt in)</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use data</h2>
        <ul>
          <li>Provide and secure the service for your organization</li>
          <li>Enforce role-based access so only authorized officers see sensitive records</li>
          <li>Send notifications you or your officers configure (email, SMS where enabled)</li>
          <li>Improve reliability, prevent abuse, and comply with law</li>
        </ul>
      </section>

      <section>
        <h2>3. Where data lives</h2>
        <p>
          Application data is stored in Supabase (PostgreSQL) with row-level security scoped per organization.
          Files such as receipts and photos are stored in organization-scoped storage buckets.
          Payment card data is handled by Stripe; we do not store full card numbers on TouseOS servers.
        </p>
      </section>

      <section>
        <h2>4. Who can see your information</h2>
        <p>
          Within an organization, access follows officer roles (treasurer, president, etc.). Members typically see
          roster and event information appropriate to their role. GreekMatch discovery is limited to users who opt in
          and is not shown to the general public.
        </p>
        <p>
          Platform administrators may access data only for support, security, and moderation (for example, GreekMatch reports)
          under controlled processes.
        </p>
      </section>

      <section>
        <h2>5. Retention and deletion</h2>
        <p>
          Data is retained while your organization maintains an account and as needed for legal, financial, or university records.
          Officers may export reports from the app. Account deletion requests should be routed through your chapter and support.
        </p>
      </section>

      <section>
        <h2>6. Your choices</h2>
        <ul>
          <li>Update profile and privacy settings in the app</li>
          <li>Opt out of GreekMatch or pause discovery at any time</li>
          <li>Manage notification preferences in account settings</li>
        </ul>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>
          TouseOS is intended for university-affiliated organizations and their members. It is not directed at children under 13.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          We may update this policy. Material changes will be reflected on this page with an updated date.
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
