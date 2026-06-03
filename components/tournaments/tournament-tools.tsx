"use client";

import { useOrg } from "@/hooks/use-org";
import { TournamentBracketManager } from "@/components/tournaments/bracket-manager";

export function TournamentTools() {
  const { orgId } = useOrg();

  if (!orgId) return null;
  return <TournamentBracketManager orgId={orgId} />;
}
