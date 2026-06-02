"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Alert, Button, Card, CardHeader, Input, Textarea } from "@/components/ui";
import type { PnmLead } from "@/types";

interface ProfileEnrichmentPanelProps {
  orgId: string | null;
  pnm: PnmLead | null;
  onEnriched?: () => void;
}

export function ProfileEnrichmentPanel({ orgId, pnm, onEnriched }: ProfileEnrichmentPanelProps) {
  const [bioText, setBioText] = useState(pnm?.instagram_bio_text ?? "");
  const [handle, setHandle] = useState(pnm?.instagram_handle ?? "");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!pnm) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Select a PNM from the list to enrich their profile.</p>
      </Card>
    );
  }

  const instagramUrl = handle
    ? `https://instagram.com/${handle.replace(/^@/, "")}`
    : null;

  async function enrich() {
    if (!pnm || !orgId || !bioText.trim()) {
      toast.error("Paste the public bio text first");
      return;
    }
    if (!consent) {
      toast.error("Confirm consent before enriching");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pnm/enrich-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pnmId: pnm.id,
          orgId,
          bioText,
          instagramHandle: handle,
          consentConfirmed: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Extracted ${data.extracted?.interests?.length ?? 0} interests`);
        onEnriched?.();
      } else {
        toast.error(data.error ?? "Enrichment failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Profile enrichment"
        description="Consent-based interest import — not automated Instagram scraping"
        icon={<Sparkles size={16} />}
      />

      <Alert
        type="info"
        title="How this works"
        description="Open the PNM's public Instagram in your browser, copy their bio, and paste it below. AI extracts hobbies and interests to match with brothers. Meta's terms prohibit unauthorized scraping; TouseOS never logs into Instagram or scrapes profiles automatically."
      />

      <div className="flex flex-wrap gap-2 items-end">
        <Input
          label="Instagram handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@username"
          className="flex-1 min-w-[140px]"
        />
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-racing hover:underline pb-1"
          >
            Open profile <ExternalLink size={14} />
          </a>
        )}
      </div>

      <Textarea
        label="Paste public bio"
        value={bioText}
        onChange={(e) => setBioText(e.target.value)}
        placeholder="Copy text from their Instagram bio, highlights, or public About section…"
        rows={6}
      />

      <label className="flex items-start gap-3 cursor-pointer border border-border rounded-lg p-3">
        <input
          type="checkbox"
          className="mt-1 rounded"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className="text-sm text-muted-foreground">
          I confirm this PNM was informed that their <strong>public</strong> profile information may be used
          only for chapter rush matching, and the bio text above was provided voluntarily or with their permission.
        </span>
      </label>

      {pnm.profile_enriched_at && (
        <p className="text-xs text-muted-foreground">
          Last enriched {new Date(pnm.profile_enriched_at).toLocaleString()}
          {pnm.ai_interest_summary && ` — ${pnm.ai_interest_summary}`}
        </p>
      )}

      {pnm.interests?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pnm.interests.map((i) => (
            <span key={i} className="text-xs bg-surface-2 rounded-full px-2 py-0.5 text-muted-foreground">
              {i}
            </span>
          ))}
        </div>
      )}

      <Button onClick={enrich} loading={loading} icon={<Sparkles size={14} />} disabled={!consent || !bioText.trim()}>
        Extract interests with AI
      </Button>

      <p className="text-xs text-muted-foreground">
        Need official API integration later? Use Meta&apos;s Instagram Graph API with org approval — see{" "}
        <Link href="https://developers.facebook.com/docs/instagram-api" className="text-racing hover:underline" target="_blank" rel="noopener noreferrer">
          Meta developer docs
        </Link>.
      </p>
    </Card>
  );
}
