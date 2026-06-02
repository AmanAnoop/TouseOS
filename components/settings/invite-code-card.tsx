"use client";

import { Copy } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";

interface InviteCodeCardProps {
  inviteCode: string | null | undefined;
  isAdmin: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

export function InviteCodeCard({ inviteCode, isAdmin, onCopy, onRegenerate }: InviteCodeCardProps) {
  return (
    <Card>
      <CardHeader title="Invite code" description="Share with members to join your organization" icon={<Copy size={16} />} />
      <div className="flex items-center gap-3">
        <div className="flex-1 h-12 rounded-xl border border-border bg-surface-1 flex items-center justify-center">
          <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
            {inviteCode ?? "········"}
          </span>
        </div>
        <Button variant="secondary" icon={<Copy size={14} />} onClick={onCopy}>Copy</Button>
        {isAdmin && (
          <Button variant="secondary" onClick={onRegenerate}>Regenerate</Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">Members enter this code at <strong>app.touseos.com/onboarding</strong> to request to join.</p>
    </Card>
  );
}
