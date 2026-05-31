"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WorkspaceRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proposalId = searchParams.get("proposal");

  useEffect(() => {
    async function redirect() {
      if (!proposalId) {
        router.replace("/interchapter");
        return;
      }
      const res = await fetch(`/api/interchapter/workspaces?proposalId=${proposalId}`);
      const { workspace } = await res.json();
      if (workspace?.id) {
        router.replace(`/interchapter/workspace/${workspace.id}`);
      } else {
        router.replace("/interchapter");
      }
    }
    redirect();
  }, [proposalId, router]);

  return <div className="p-8 text-center text-muted-foreground">Opening workspace...</div>;
}
