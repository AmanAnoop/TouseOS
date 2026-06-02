"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TournamentBracketManager } from "@/components/tournaments/bracket-manager";

export function TournamentTools() {
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) setOrgId(m.org_id);
    }
    init();
  }, []);

  if (!orgId) return null;
  return <TournamentBracketManager orgId={orgId} />;
}
