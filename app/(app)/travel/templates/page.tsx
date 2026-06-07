import { redirect } from "next/navigation";

/** Travel templates live under the Travel page Templates tab. */
export default function TravelTemplatesRedirectPage() {
  redirect("/travel?tab=templates");
}
