"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trophy, UserCheck, UserX, Users } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Badge, Button, Card, EmptyState, Modal,
  PageHeader, ProgressBar, StatCard, Tabs,
} from "@/components/ui";
import type { SportsTryout } from "@/types";

const EVAL_FIELDS = [
  { key: "athletic_ability", label: "Athletic ability" },
  { key: "position_fit", label: "Position fit" },
  { key: "experience_score", label: "Experience" },
  { key: "coachability", label: "Coachability" },
  { key: "teamwork", label: "Teamwork" },
  { key: "culture_fit", label: "Culture fit" },
];

export default function TryoutsPage() {
  const supabase = createClient();
  const [tryouts, setTryouts] = useState<SportsTryout[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tab, setTab] = useState("candidates");
  const [addOpen, setAddOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState<SportsTryout | null>(null);

  const [newCandidate, setNewCandidate] = useState({
    name: "", email: "", phone: "", position: "",
    experienceLevel: "intermediate", availability: "", priorTeams: "",
    tryoutDate: "",
  });

  const [evalScores, setEvalScores] = useState<Record<string, number>>({
    athletic_ability: 3, position_fit: 3, experience_score: 3,
    coachability: 3, teamwork: 3, culture_fit: 3,
  });
  const [evalNotes, setEvalNotes] = useState("");

  const load = useCallback(async (oid: string) => {
    setLoading(true);
    const { data } = await supabase.from("sports_tryouts").select("*").eq("org_id", oid).order("created_at", { ascending: false });
    setTryouts((data ?? []) as SportsTryout[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (m) { setOrgId(m.org_id); load(m.org_id); }
    }
    init();
  }, [supabase, load]);

  async function addCandidate() {
    if (!orgId || !newCandidate.name) return;
    const { error } = await supabase.from("sports_tryouts").insert({
      org_id: orgId,
      candidate_name: newCandidate.name,
      candidate_email: newCandidate.email || null,
      candidate_phone: newCandidate.phone || null,
      position: newCandidate.position || null,
      experience_level: newCandidate.experienceLevel,
      availability: newCandidate.availability || null,
      prior_teams: newCandidate.priorTeams || null,
      tryout_date: newCandidate.tryoutDate || null,
      status: "registered",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Candidate added");
    setAddOpen(false);
    setNewCandidate({ name: "", email: "", phone: "", position: "", experienceLevel: "intermediate", availability: "", priorTeams: "", tryoutDate: "" });
    load(orgId);
  }

  async function saveEval() {
    if (!evalOpen || !orgId) return;
    const avg = Object.values(evalScores).reduce((a, b) => a + b, 0) / Object.values(evalScores).length;
    const { error } = await supabase.from("sports_tryouts").update({
      ...evalScores,
      overall_score: Math.round(avg * 10) / 10,
      notes: evalNotes || null,
      status: "attended",
    }).eq("id", evalOpen.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Evaluation saved");
    setEvalOpen(null);
    load(orgId);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("sports_tryouts").update({ status }).eq("id", id);
    setTryouts((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    toast.success(`Candidate ${status}`);
  }

  const byStatus = {
    registered: tryouts.filter((t) => t.status === "registered"),
    attended: tryouts.filter((t) => t.status === "attended"),
    invited: tryouts.filter((t) => t.status === "invited"),
    waitlisted: tryouts.filter((t) => t.status === "waitlisted"),
    cut: tryouts.filter((t) => t.status === "cut"),
    accepted: tryouts.filter((t) => t.status === "accepted"),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tryout Management"
        description={`${tryouts.length} candidates · ${byStatus.accepted.length} accepted`}
        action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add candidate</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Registered" value={byStatus.registered.length} icon={<Users size={18} />} />
        <StatCard title="Evaluated" value={byStatus.attended.length} icon={<Trophy size={18} />} />
        <StatCard title="Invited" value={byStatus.invited.length} deltaType="up" icon={<UserCheck size={18} />} />
        <StatCard title="Cut" value={byStatus.cut.length} icon={<UserX size={18} />} />
      </div>

      <Tabs
        tabs={[
          { id: "candidates", label: "All candidates", count: tryouts.length },
          { id: "pipeline", label: "Pipeline" },
          { id: "evaluations", label: "Evaluations" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Card key={i} className="h-16 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
      ) : tab === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {Object.entries(byStatus).map(([status, candidates]) => (
            <div key={status} className="flex-shrink-0 w-52">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{status}</span>
                <Badge label={String(candidates.length)} color="gray" />
              </div>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <Card key={c.id} padding="sm">
                    <p className="text-xs font-semibold truncate">{c.candidate_name}</p>
                    <p className="text-xs text-muted-foreground">{c.position ?? "—"}</p>
                    {c.overall_score && (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-semibold">{c.overall_score}/5</span>
                        </div>
                        <div className="h-1 rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-sports-500" style={{ width: `${(Number(c.overall_score) / 5) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 mt-2">
                      {status === "attended" && (
                        <>
                          <button onClick={() => updateStatus(c.id, "invited")} className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100">Invite</button>
                          <button onClick={() => updateStatus(c.id, "cut")} className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100">Cut</button>
                        </>
                      )}
                      {status === "invited" && (
                        <button onClick={() => updateStatus(c.id, "accepted")} className="text-[10px] px-2 py-0.5 rounded bg-sports-50 text-sports-700 hover:bg-sports-100">Roster</button>
                      )}
                    </div>
                  </Card>
                ))}
                {candidates.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-3 text-center text-xs text-muted-foreground">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : tryouts.length === 0 ? (
        <EmptyState icon={<Trophy size={24} />} title="No tryout candidates" description="Add candidates and evaluate them for your team." action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>Add candidate</Button>} />
      ) : (
        <div className="space-y-2">
          {tryouts.map((t) => (
            <Card key={t.id} padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sports-100 dark:bg-sports-950/30 flex items-center justify-center text-sports-600 font-bold text-sm flex-shrink-0">
                  {t.candidate_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{t.candidate_name}</p>
                    <Badge label={t.status} color={t.status === "accepted" ? "green" : t.status === "cut" ? "red" : t.status === "invited" ? "blue" : "yellow"} />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.position ?? "—"} · {t.experience_level}</p>
                  {t.overall_score && <p className="text-xs text-muted-foreground">Score: {t.overall_score}/5</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {tab === "evaluations" || !t.overall_score ? (
                    <Button size="sm" variant="secondary" onClick={() => setEvalOpen(t)}>Evaluate</Button>
                  ) : null}
                  {t.status === "attended" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(t.id, "invited")}>
                        <UserCheck size={13} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateStatus(t.id, "cut")}>
                        <UserX size={13} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add candidate modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add tryout candidate" size="lg"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addCandidate} disabled={!newCandidate.name}>Add</Button></>}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Full name *", key: "name", placeholder: "Jordan Smith" },
            { label: "Email", key: "email", placeholder: "jordan@college.edu", type: "email" },
            { label: "Phone", key: "phone", placeholder: "+1 (555) 000-0000", type: "tel" },
            { label: "Position", key: "position", placeholder: "Forward, Midfielder..." },
            { label: "Tryout date", key: "tryoutDate", type: "date" },
            { label: "Availability", key: "availability", placeholder: "M/W/F 4-6pm" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{field.label}</label>
              <input type={field.type ?? "text"} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={field.placeholder} value={String(newCandidate[field.key as keyof typeof newCandidate])} onChange={(e) => setNewCandidate({ ...newCandidate, [field.key]: e.target.value })} />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Prior teams</label>
            <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="HS varsity, club team..." value={newCandidate.priorTeams} onChange={(e) => setNewCandidate({ ...newCandidate, priorTeams: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Evaluation modal */}
      <Modal open={!!evalOpen} onClose={() => setEvalOpen(null)} title={`Evaluate ${evalOpen?.candidate_name}`} size="md"
        footer={<><Button variant="secondary" onClick={() => setEvalOpen(null)}>Cancel</Button><Button onClick={saveEval}>Save evaluation</Button></>}
      >
        <div className="space-y-4">
          {EVAL_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">{field.label}</label>
                <span className="text-sm font-bold text-sports-600">{evalScores[field.key]}/5</span>
              </div>
              <input type="range" min="1" max="5" step="1" className="w-full accent-sports-600" value={evalScores[field.key]} onChange={(e) => setEvalScores({ ...evalScores, [field.key]: parseInt(e.target.value) })} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 – Poor</span><span>5 – Excellent</span>
              </div>
            </div>
          ))}
          <div className="p-3 bg-sports-50 dark:bg-sports-950/20 rounded-lg">
            <p className="text-sm font-semibold text-sports-700">Average score: {(Object.values(evalScores).reduce((a, b) => a + b, 0) / Object.values(evalScores).length).toFixed(1)}/5</p>
            <ProgressBar value={(Object.values(evalScores).reduce((a, b) => a + b, 0) / Object.values(evalScores).length) * 20} color="blue" className="mt-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Captain/coach notes..." value={evalNotes} onChange={(e) => setEvalNotes(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
