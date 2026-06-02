import { HousingClient } from "@/components/housing/housing-client";

export const metadata = { title: "Housing" };
export const dynamic = "force-dynamic";

export default function HousingPage() {
  return <HousingClient />;
}
