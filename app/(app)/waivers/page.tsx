import { WaiversClient } from "@/components/waivers/waivers-client";

export const metadata = { title: "Waivers & Compliance" };
export const dynamic = "force-dynamic";

export default function WaiversPage() {
  return <WaiversClient />;
}
