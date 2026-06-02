"use client";

import { Camera } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/permissions";

interface OrgRole {
  org_id: string;
  role: string;
  org_name: string;
}

interface ProfileHeaderProps {
  fullName: string;
  photoUrl: string | null;
  orgRoles: OrgRole[];
  uploading?: boolean;
  onAvatarClick: () => void;
}

export function ProfileHeader({
  fullName, photoUrl, orgRoles, uploading, onAvatarClick,
}: ProfileHeaderProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={fullName} src={photoUrl} size="xl" />
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-greek-600 text-white flex items-center justify-center hover:bg-greek-700 shadow"
          >
            <Camera size={13} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-foreground">{fullName}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {orgRoles.map((r) => (
              <Badge
                key={r.org_id}
                label={`${r.org_name} · ${ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role}`}
                color="green"
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
