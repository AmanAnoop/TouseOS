"use client";

import { ChatsPageClient } from "@/components/chats/chats-page-client";
import { useOrg } from "@/hooks/use-org";

export default function ChatsPage() {
  const { orgId, orgName, userId, role, loading } = useOrg();

  if (loading) {
    return <div className="ds-skeleton h-64 w-full rounded-xl" />;
  }

  if (!orgId || !userId) {
    return null;
  }

  return (
    <ChatsPageClient
      orgId={orgId}
      orgName={orgName}
      userId={userId}
      role={role}
    />
  );
}
