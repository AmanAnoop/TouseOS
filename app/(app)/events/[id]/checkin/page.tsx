"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useParams } from "next/navigation";
import {
  Camera, Check, CheckCircle2, List, QrCode, Search, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar, Button, Card, Input, StatCard,
} from "@/components/ui";

interface Attendee {
  id: string;
  member_id: string | null;
  guest_name: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  member_profiles?: { full_name: string; profile_photo_url: string | null } | null;
}

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createClient();
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "qr">("list");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    const [eventRes, rsvpRes] = await Promise.all([
      supabase.from("events").select("id, title, starts_at, type").eq("id", eventId).single(),
      supabase.from("event_rsvps").select("*, member_profiles(full_name, profile_photo_url)").eq("event_id", eventId).order("checked_in", { ascending: true }),
    ]);
    if (eventRes.data) setEvent(eventRes.data as Record<string, unknown>);
    setAttendees((rsvpRes.data ?? []) as Attendee[]);
    setLoading(false);
  }, [supabase, eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function checkIn(rsvpId: string) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("event_rsvps").update({
      checked_in: true,
      checked_in_at: now,
    }).eq("id", rsvpId);

    if (error) { toast.error(error.message); return; }

    setAttendees((prev) => prev.map((a) => a.id === rsvpId ? { ...a, checked_in: true, checked_in_at: now } : a));
    toast.success("Checked in ✓");
  }

  async function undoCheckIn(rsvpId: string) {
    await supabase.from("event_rsvps").update({ checked_in: false, checked_in_at: null }).eq("id", rsvpId);
    setAttendees((prev) => prev.map((a) => a.id === rsvpId ? { ...a, checked_in: false, checked_in_at: null } : a));
  }

  async function addWalkIn(name: string) {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("event_rsvps").insert({
      event_id: eventId,
      guest_name: name.trim(),
      status: "going",
      checked_in: true,
      checked_in_at: new Date().toISOString(),
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setAttendees((prev) => [data as Attendee, ...prev]);
    toast.success(`${name} checked in as walk-in`);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      qrReaderRef.current = new BrowserQRCodeReader();
      const scanLoop = async () => {
        if (!videoRef.current || !qrReaderRef.current) return;
        try {
          const result = await qrReaderRef.current.decodeOnceFromVideoElement(videoRef.current);
          const code = result.getText();
          const match = attendees.find((a) => a.id === code || a.member_id === code);
          if (match && !match.checked_in) await checkIn(match.id);
        } catch {
          // continue scanning
        }
        scanIntervalRef.current = setTimeout(scanLoop, 800);
      };
      scanLoop();
    } catch {
      toast.error("Camera access denied. Please allow camera access to use QR check-in.");
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) clearTimeout(scanIntervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  const checked = attendees.filter((a) => a.checked_in).length;
  const total = attendees.filter((a) => a.status === "going").length;

  const filtered = attendees.filter((a) => {
    if (!query) return true;
    const name = (a.member_profiles?.full_name ?? a.guest_name ?? "").toLowerCase();
    return name.includes(query.toLowerCase());
  });

  const [walkInName, setWalkInName] = useState("");

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Event Check-In</p>
        <h1 className="text-xl font-bold text-foreground">{String(event?.title ?? "Loading...")}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Checked in" value={checked} deltaType="up" icon={<CheckCircle2 size={16} />} />
        <StatCard title="RSVPs" value={total} icon={<List size={16} />} />
        <StatCard title="Rate" value={total > 0 ? `${Math.round((checked / total) * 100)}%` : "—"} icon={<CheckCircle2 size={16} />} />
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="h-2 rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-greek-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((checked / total) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{checked} of {total} checked in</p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => { setMode("list"); stopCamera(); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "list" ? "bg-greek-600 text-white border-greek-600" : "border-border text-muted-foreground"}`}>
          <List size={15} />
          RSVP list
        </button>
        <button onClick={() => { setMode("qr"); startCamera(); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "qr" ? "bg-greek-600 text-white border-greek-600" : "border-border text-muted-foreground"}`}>
          <QrCode size={15} />
          QR scanner
        </button>
      </div>

      {mode === "qr" && (
        <Card padding="sm">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            {scanning ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-white p-8">
                <Camera size={32} className="mx-auto mb-2 opacity-60" />
                <p className="text-sm opacity-60">Tap &quot;QR scanner&quot; to start</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/80 rounded-xl" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Point camera at a member&apos;s QR code to check them in automatically.
          </p>
          <p className="text-xs text-muted-foreground text-center">Scanning member QR codes. Point camera at RSVP QR code to check in.</p>
        </Card>
      )}

      {mode === "list" && (
        <>
          {/* Search */}
          <Input
            icon={<Search size={15} />}
            placeholder="Search attendees..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Walk-in */}
          <Card padding="sm">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Add walk-in</p>
            <div className="flex gap-2">
              <Input
                placeholder="Guest name"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                icon={<Check size={14} />}
                onClick={() => { addWalkIn(walkInName); setWalkInName(""); }}
                disabled={!walkInName.trim()}
              >
                Check in
              </Button>
            </div>
          </Card>

          {/* Attendee list */}
          <div className="space-y-1.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-2 animate-pulse" />
              ))
            ) : (
              <>
                {/* Not checked in */}
                {filtered.filter((a) => !a.checked_in).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-surface-1 transition-colors">
                    <Avatar name={a.member_profiles?.full_name ?? a.guest_name ?? "?"} src={a.member_profiles?.profile_photo_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{a.member_profiles?.full_name ?? a.guest_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{a.guest_name ? "Walk-in / guest" : "RSVP: going"}</p>
                    </div>
                    <Button size="sm" icon={<Check size={14} />} onClick={() => checkIn(a.id)}>
                      Check in
                    </Button>
                  </div>
                ))}

                {/* Checked in */}
                {filtered.filter((a) => a.checked_in).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{a.member_profiles?.full_name ?? a.guest_name ?? "Unknown"}</p>
                      <p className="text-xs text-green-600">Checked in {a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                    <button onClick={() => undoCheckIn(a.id)} className="text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
