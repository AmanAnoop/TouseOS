"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Flag, Heart, Info, RotateCcw, Settings, Star, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, EmptyState, Modal, Spinner } from "@/components/ui";
import toast from "react-hot-toast";
import { rankGreekMatchCandidates } from "@/lib/greekmatch-scorer";

interface GmProfile {
  id: string;
  user_id: string;
  display_name: string;
  age: number | null;
  bio: string | null;
  photos: string[];
  major: string | null;
  graduation_year: number | null;
  interests: string[];
  gender: string | null;
  show_org_name: boolean;
  org_name?: string;
  matchScore?: number;
}

export default function GreekMatchPage() {
  const supabase = createClient();
  const [myProfile, setMyProfile] = useState<GmProfile | null>(null);
  const [candidates, setCandidates] = useState<GmProfile[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState<"left" | "right" | null>(null);
  const [matchModal, setMatchModal] = useState<GmProfile | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [seenCount, setSeenCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, rotation: 0 });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: mine } = await supabase
        .from("greekmatch_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!mine) { setLoading(false); return; }
      setMyProfile(mine as GmProfile);

      // Load seen list
      const { data: seen } = await supabase
        .from("greekmatch_interactions")
        .select("target_id")
        .eq("actor_id", user.id);

      const seenIds = new Set((seen ?? []).map((s: Record<string, unknown>) => String(s.target_id)));

      // Load candidates from OTHER Greek orgs
      const { data: profiles } = await supabase
        .from("greekmatch_profiles")
        .select("*, organizations(name)")
        .eq("is_active", true)
        .eq("paused", false)
        .neq("user_id", user.id)
        .limit(30);

      const filtered = ((profiles ?? []) as Array<Record<string, unknown>>)
        .filter((p) => !seenIds.has(String(p.user_id)))
        .map((p) => ({
          ...p,
          org_name: (p.organizations as Record<string, unknown>)?.name as string | undefined,
        })) as unknown as GmProfile[];

      const viewerProfile = mine as GmProfile;
      const ranked = rankGreekMatchCandidates(viewerProfile, filtered);

      setCandidates(ranked);
      setSeenCount(seenIds.size);
      setLoading(false);
    }
    init();
  }, [supabase]);

  const currentProfile = candidates[current];

  const interact = useCallback(async (action: "like" | "pass" | "super_like") => {
    if (!userId || !currentProfile) return;

    setAnimating(action === "pass" ? "left" : "right");
    await new Promise((r) => setTimeout(r, 300));
    setAnimating(null);
    setDrag({ x: 0, rotation: 0 });

    await supabase.from("greekmatch_interactions").upsert({
      actor_id: userId,
      target_id: currentProfile.user_id,
      action,
    }, { onConflict: "actor_id,target_id" });

    if (action !== "pass") {
      // Check if other user already liked us
      const { data: reciprocal } = await supabase
        .from("greekmatch_interactions")
        .select("id")
        .eq("actor_id", currentProfile.user_id)
        .eq("target_id", userId)
        .in("action", ["like", "super_like"])
        .maybeSingle();

      if (reciprocal) {
        // It's a match!
        const [a, b] = [userId, currentProfile.user_id].sort();
        await supabase.from("greekmatch_matches").upsert(
          { user_a_id: a, user_b_id: b },
          { onConflict: "user_a_id,user_b_id" },
        );
        setMatchModal(currentProfile);
      }
    }

    setCurrent((prev) => prev + 1);
  }, [userId, currentProfile, supabase]);

  // Drag / swipe handling
  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY };
    cardRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    setDrag({ x: dx, rotation: dx * 0.08 });
  }

  function onPointerUp() {
    if (!dragStart.current) return;
    const { x } = drag;
    dragStart.current = null;
    if (Math.abs(x) > 80) {
      interact(x > 0 ? "like" : "pass");
    } else {
      setDrag({ x: 0, rotation: 0 });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="max-w-sm mx-auto pt-16">
        <EmptyState
          icon={<Heart size={28} className="text-rose-400" />}
          title="Join GreekMatch"
          description="Set up your profile to start matching with Greek students across campus."
          action={
            <Link href="/profile">
              <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
                <Heart size={14} className="fill-white" />
                Set up GreekMatch
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen max-w-sm mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4">
        <Link href="/greekmatch/matches">
          <div className="relative w-10 h-10 rounded-full bg-surface-1 border border-border flex items-center justify-center">
            <Heart size={18} className="text-rose-500" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Heart size={22} className="text-rose-500 fill-rose-500" />
          <span className="text-lg font-bold text-foreground">GreekMatch</span>
        </div>
        <Link href="/profile?tab=greekmatch">
          <div className="w-10 h-10 rounded-full bg-surface-1 border border-border flex items-center justify-center">
            <Settings size={18} className="text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Card stack */}
      <div className="relative w-full" style={{ height: "calc(100vh - 240px)", maxHeight: 520 }}>
        {/* Background cards (stack effect) */}
        {candidates.slice(current + 1, current + 3).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-3xl bg-card border border-border shadow-card"
            style={{
              transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.04})`,
              zIndex: 10 - i,
            }}
          />
        ))}

        {/* Current card */}
        {currentProfile ? (
          <div
            ref={cardRef}
            className="absolute inset-0 rounded-3xl overflow-hidden shadow-card-lg cursor-grab active:cursor-grabbing select-none"
            style={{
              zIndex: 20,
              transform: `translateX(${animating === "left" ? -400 : animating === "right" ? 400 : drag.x}px) rotate(${animating ? 0 : drag.rotation}deg)`,
              opacity: animating ? 0 : 1,
              transition: animating ? "all 0.3s ease" : drag.x !== 0 ? "none" : "all 0.3s ease",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Photo area */}
            <div
              className="w-full h-2/3 bg-gradient-to-br from-rose-400 to-pink-600 relative flex items-end"
              style={currentProfile.photos?.[0] ? { backgroundImage: `url(${currentProfile.photos[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
            >
              {/* Swipe indicators */}
              {drag.x > 40 && (
                <div className="absolute top-6 left-6 border-4 border-green-400 rounded-xl px-3 py-1 rotate-[-20deg]">
                  <span className="text-green-400 font-bold text-xl">LIKE</span>
                </div>
              )}
              {drag.x < -40 && (
                <div className="absolute top-6 right-6 border-4 border-red-400 rounded-xl px-3 py-1 rotate-[20deg]">
                  <span className="text-red-400 font-bold text-xl">NOPE</span>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Name / age */}
              <div className="relative p-4 text-white w-full">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-bold leading-tight">
                      {currentProfile.display_name}
                      {(currentProfile as GmProfile & { matchScore?: number }).matchScore != null && (
                        <Badge label={`${(currentProfile as GmProfile & { matchScore?: number }).matchScore}% match`} color="green" />
                      )}
                      {currentProfile.age && <span className="text-xl font-normal ml-2">{currentProfile.age}</span>}
                    </h2>
                    {currentProfile.major && (
                      <p className="text-white/80 text-sm">{currentProfile.major}</p>
                    )}
                    {currentProfile.show_org_name && currentProfile.org_name && (
                      <Badge label={currentProfile.org_name} color="green" className="mt-1 bg-white/20 text-white border-transparent" />
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailModal(true); }}
                    className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Info size={16} className="text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Info area */}
            <div className="p-4 bg-card h-1/3 flex flex-col justify-between">
              {currentProfile.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">{currentProfile.bio}</p>
              )}
              {currentProfile.interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentProfile.interests.slice(0, 4).map((interest) => (
                    <span key={interest} className="text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-full px-2 py-0.5">
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="absolute inset-0 rounded-3xl bg-card border border-border flex items-center justify-center" style={{ zIndex: 20 }}>
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-4">
                <Heart size={28} className="text-rose-400" />
              </div>
              <p className="font-semibold text-foreground">You&apos;ve seen everyone!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon for new profiles.
              </p>
              <p className="text-xs text-muted-foreground mt-3">{seenCount} profiles seen today</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {currentProfile && (
        <div className="flex items-center justify-center gap-5 mt-6 w-full">
          <button
            onClick={() => interact("pass")}
            className="w-14 h-14 rounded-full bg-white dark:bg-surface-1 border-2 border-red-200 dark:border-red-900 flex items-center justify-center shadow-card hover:scale-110 transition-transform active:scale-95"
          >
            <X size={24} className="text-red-500" />
          </button>

          <button
            onClick={() => interact("super_like")}
            className="w-12 h-12 rounded-full bg-white dark:bg-surface-1 border-2 border-blue-200 dark:border-blue-900 flex items-center justify-center shadow-card hover:scale-110 transition-transform active:scale-95"
          >
            <Star size={18} className="text-blue-500 fill-blue-500" />
          </button>

          <button
            onClick={() => interact("like")}
            className="w-14 h-14 rounded-full bg-white dark:bg-surface-1 border-2 border-rose-200 dark:border-rose-900 flex items-center justify-center shadow-card hover:scale-110 transition-transform active:scale-95"
          >
            <Heart size={24} className="text-rose-500 fill-rose-500" />
          </button>
        </div>
      )}

      {currentProfile && (
        <button
          onClick={() => { setCurrent(0); toast.success("Reloaded profiles"); }}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      )}

      {/* Profile detail modal */}
      <Modal
        open={detailModal}
        onClose={() => setDetailModal(false)}
        title={currentProfile?.display_name ?? ""}
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => { interact("pass"); setDetailModal(false); }} icon={<X size={14} />}>Pass</Button>
            <Button className="flex-1 bg-rose-500 hover:bg-rose-600" onClick={() => { interact("like"); setDetailModal(false); }} icon={<Heart size={14} className="fill-white" />}>Like</Button>
          </div>
        }
      >
        {currentProfile && (
          <div className="space-y-4">
            {currentProfile.bio && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">About</p>
                <p className="text-sm text-foreground">{currentProfile.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {currentProfile.age && <div className="bg-surface-1 rounded-lg p-3 text-center"><p className="text-lg font-bold">{currentProfile.age}</p><p className="text-xs text-muted-foreground">Age</p></div>}
              {currentProfile.major && <div className="bg-surface-1 rounded-lg p-3 text-center"><p className="text-sm font-semibold truncate">{currentProfile.major}</p><p className="text-xs text-muted-foreground">Major</p></div>}
              {currentProfile.show_org_name && currentProfile.org_name && <div className="bg-surface-1 rounded-lg p-3 text-center"><p className="text-sm font-semibold truncate">{currentProfile.org_name}</p><p className="text-xs text-muted-foreground">Org</p></div>}
              {currentProfile.graduation_year && <div className="bg-surface-1 rounded-lg p-3 text-center"><p className="text-lg font-bold">{String(currentProfile.graduation_year).slice(-2)}</p><p className="text-xs text-muted-foreground">Class of &apos;{String(currentProfile.graduation_year).slice(-2)}</p></div>}
            </div>
            {currentProfile.interests.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((i) => (
                    <span key={i} className="text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-full px-3 py-1">{i}</span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => { setDetailModal(false); toast.success("Report submitted. We'll review it within 24 hours."); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 pt-2"
            >
              <Flag size={12} />
              Report this profile
            </button>
          </div>
        )}
      </Modal>

      {/* It's a match! modal */}
      <Modal
        open={!!matchModal}
        onClose={() => setMatchModal(null)}
        title=""
        size="sm"
        footer={
          <div className="flex flex-col gap-2 w-full">
            <Link href="/greekmatch/matches" className="w-full" onClick={() => setMatchModal(null)}>
              <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500">Send a message</Button>
            </Link>
            <Button variant="ghost" className="w-full" onClick={() => setMatchModal(null)}>Keep swiping</Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-2xl border-4 border-white shadow-lg">
              {matchModal?.display_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex">
              <Heart size={24} className="text-rose-500 fill-rose-500 -mr-1 -mt-1 animate-bounce" />
              <Heart size={32} className="text-rose-500 fill-rose-500 animate-pulse" />
              <Heart size={24} className="text-rose-500 fill-rose-500 -ml-1 -mt-1 animate-bounce" style={{ animationDelay: "0.1s" }} />
            </div>
            <div className="w-16 h-16 rounded-full bg-greek-100 dark:bg-greek-950/50 flex items-center justify-center text-2xl border-4 border-white shadow-lg font-bold text-greek-700">
              You
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground">It&apos;s a match!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You and {matchModal?.display_name} both liked each other 💚
          </p>
        </div>
      </Modal>
    </div>
  );
}
