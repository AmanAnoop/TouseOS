import { ParentPayClient } from "@/components/payments/parent-pay-client";

export const metadata = {
  title: "Pay dues",
  description: "Secure parent and guardian payment portal",
};

export default async function ParentPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ParentPayClient token={token} />;
}
