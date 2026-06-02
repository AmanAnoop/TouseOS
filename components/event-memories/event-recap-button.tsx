"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, Modal } from "@/components/ui";

export function EventRecapButton({
  orgId,
  eventId,
  eventTitle,
}: {
  orgId: string;
  eventId: string;
  eventTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recap, setRecap] = useState<{
    feedCaption: string;
    storySlides: string[];
    stats: { rsvpGoing: number; photoCount: number };
  } | null>(null);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/events/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, eventId }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not generate recap");
      return;
    }
    setRecap({
      feedCaption: data.feedCaption,
      storySlides: data.storySlides,
      stats: data.stats,
    });
    setOpen(true);
    toast.success("Recap ready");
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} loading={loading} onClick={generate}>
        Recap
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Recap: ${eventTitle}`}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>}
      >
        {recap && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {recap.stats.rsvpGoing} RSVPs · {recap.stats.photoCount} photos in pack
            </p>
            <Card padding="sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Feed caption</p>
                <Button size="sm" variant="secondary" icon={<Copy size={12} />} onClick={() => copyText(recap.feedCaption, "Caption")}>
                  Copy
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{recap.feedCaption}</p>
            </Card>
            <Card padding="sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Story slides</p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Copy size={12} />}
                  onClick={() => copyText(recap.storySlides.join("\n\n"), "Slides")}
                >
                  Copy all
                </Button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {recap.storySlides.map((slide) => (
                  <li key={slide}>{slide}</li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </Modal>
    </>
  );
}
