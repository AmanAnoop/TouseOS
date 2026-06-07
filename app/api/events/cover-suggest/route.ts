import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestEventCovers } from "@/lib/event-cover";

/** Suggest cover images from venue keywords or geocoded location. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const venue = params.get("venue")?.trim() ?? "";
  const address = params.get("address")?.trim() ?? "";
  const destination = params.get("destination")?.trim() ?? "";

  const { suggestions, query } = await suggestEventCovers({ venue, address, destination });
  return NextResponse.json({ suggestions, query });
}
