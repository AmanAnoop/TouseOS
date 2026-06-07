import { redirect } from "next/navigation";

/** Budget editor merged into unified finance — keep route for bookmarks and deep links. */
export default function BudgetPage() {
  redirect("/finance?tab=budget");
}
