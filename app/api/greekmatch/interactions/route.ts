import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, action, reportReason } = await request.json();
  if (!targetUserId || !action) {
    return NextResponse.json({ error: "targetUserId and action required" }, { status: 400 });
  }
  if (!["like","super_like","pass","block","report"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Upsert interaction
  const { error: interactionError } = await supabase
    .from("greekmatch_interactions")
    .upsert({ actor_id: user.id, target_id: targetUserId, action }, { onConflict: "actor_id,target_id" });

  if (interactionError) return NextResponse.json({ error: interactionError.message }, { status: 500 });

  let isMatch = false;

  if (action === "like" || action === "super_like") {
    // Check if target already liked back
    const { data: reciprocal } = await supabase
      .from("greekmatch_interactions")
      .select("id")
      .eq("actor_id", targetUserId)
      .eq("target_id", user.id)
      .in("action", ["like", "super_like"])
      .maybeSingle();

    if (reciprocal) {
      // Create match (sorted user IDs for uniqueness)
      const [a, b] = [user.id, targetUserId].sort();
      await supabase.from("greekmatch_matches").upsert(
        { user_a_id: a, user_b_id: b },
        { onConflict: "user_a_id,user_b_id" },
      );
      isMatch = true;
    }
  }

  if (action === "block") {
    await supabase.from("greekmatch_blocks").upsert(
      { blocker_id: user.id, blocked_id: targetUserId },
      { onConflict: "blocker_id,blocked_id" },
    );
  }

  if (action === "report") {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .neq("status", "removed")
      .limit(1)
      .maybeSingle();

    if (membership?.org_id) {
      await supabase.from("audit_logs").insert({
        org_id: membership.org_id,
        actor_id: user.id,
        action: "greekmatch_report",
        resource_type: "greekmatch_profiles",
        resource_id: targetUserId,
        metadata: { reason: reportReason ?? "unspecified" },
      });
    }
  }

  return NextResponse.json({ success: true, isMatch });
}
