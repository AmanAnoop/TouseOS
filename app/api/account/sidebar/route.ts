import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProductSidebarPrefs,
  mergeSidebarProductPrefs,
  parseSidebarPreferences,
  type SidebarProductPreferences,
} from "@/lib/sidebar-preferences";
import type { ProductId } from "@/lib/org-product";

function parseProduct(value: string | null): ProductId | null {
  if (value === "greek" || value === "sports" || value === "club") return value;
  return null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = parseProduct(new URL(request.url).searchParams.get("product"));
  if (!product) return NextResponse.json({ error: "product required (greek|sports|club)" }, { status: 400 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("sidebar_preferences")
    .eq("id", user.id)
    .single();

  if (error || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const map = parseSidebarPreferences(profile.sidebar_preferences);
  return NextResponse.json({
    product,
    preferences: getProductSidebarPrefs(map, product),
    all: map,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const product = parseProduct(String(body.product ?? ""));
  const preferences = body.preferences as SidebarProductPreferences | undefined;

  if (!product || !preferences) {
    return NextResponse.json({ error: "product and preferences required" }, { status: 400 });
  }

  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("sidebar_preferences")
    .eq("id", user.id)
    .single();

  if (readErr || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const map = parseSidebarPreferences(profile.sidebar_preferences);
  const next = mergeSidebarProductPrefs(map, product, {
    hiddenHrefs: Array.isArray(preferences.hiddenHrefs) ? preferences.hiddenHrefs : [],
    sectionOrder: preferences.sectionOrder && typeof preferences.sectionOrder === "object"
      ? preferences.sectionOrder
      : {},
  });

  const { data, error } = await supabase
    .from("profiles")
    .update({ sidebar_preferences: next })
    .eq("id", user.id)
    .select("sidebar_preferences")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    product,
    preferences: getProductSidebarPrefs(parseSidebarPreferences(data.sidebar_preferences), product),
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = parseProduct(new URL(request.url).searchParams.get("product"));
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("sidebar_preferences")
    .eq("id", user.id)
    .single();

  const map = parseSidebarPreferences(profile?.sidebar_preferences);
  delete map[product];

  const { error } = await supabase
    .from("profiles")
    .update({ sidebar_preferences: map })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reset: true, product });
}
