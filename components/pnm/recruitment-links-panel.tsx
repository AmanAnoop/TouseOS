"use client";

import { useState } from "react";
import { Copy, Link2, QrCode } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { QRCodeSVG } from "qrcode.react";

interface RecruitmentLinksPanelProps {
  orgName: string;
  inviteCode: string | null;
}

export function RecruitmentLinksPanel({ orgName, inviteCode }: RecruitmentLinksPanelProps) {
  const [campaign, setCampaign] = useState("spring-rush-2026");
  const [refMember, setRefMember] = useState("");

  if (!inviteCode) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Set an invite code in Settings to generate recruitment links.</p>
      </Card>
    );
  }

  const base = typeof window !== "undefined"
    ? `${window.location.origin}/join/${inviteCode}`
    : `/join/${inviteCode}`;

  function buildUrl(extra: Record<string, string>) {
    const params = new URLSearchParams(extra);
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  }

  const links = [
    {
      label: "General interest form",
      url: buildUrl({}),
      description: "Default chapter recruitment form",
    },
    {
      label: "Campaign tracking",
      url: buildUrl({ campaign }),
      description: `Tags leads with campaign: ${campaign || "—"}`,
    },
    {
      label: "Member referral link",
      url: buildUrl({ campaign, ref: refMember || "member" }),
      description: "Tracks which brother shared the link",
    },
    {
      label: "Instagram bio link",
      url: buildUrl({ campaign: "instagram-bio", utm_source: "instagram" }),
      description: "For link-in-bio during rush",
    },
  ];

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  const qrUrl = links[1]?.url ?? base;

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Recruitment links"
        description="Consent-based lead capture — share in bio, stories, or QR flyers"
        icon={<Link2 size={16} />}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label="Campaign name"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="spring-rush-2026"
        />
        <Input
          label="Referring member (display name)"
          value={refMember}
          onChange={(e) => setRefMember(e.target.value)}
          placeholder="Alex Johnson"
        />
      </div>

      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.label} className="p-3 rounded-lg border border-border">
            <p className="text-sm font-medium">{link.label}</p>
            <p className="text-xs text-muted-foreground mb-2">{link.description}</p>
            <p className="text-xs font-mono break-all text-racing mb-2">{link.url}</p>
            <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={() => copy(link.url)}>
              Copy
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-surface-1">
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG value={qrUrl} size={120} />
        </div>
        <div>
          <p className="text-sm font-medium flex items-center gap-1">
            <QrCode size={16} /> QR for tabling
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Print for {orgName} events. Leads flow into PNM CRM with campaign tracking.
          </p>
        </div>
      </div>
    </Card>
  );
}
