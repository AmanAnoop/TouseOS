"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Download, Lock, Play, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { NmeModuleModal, type QuizQuestion } from "@/components/nme/nme-module-modal";
import { NmeModuleEditor } from "@/components/nme/nme-module-editor";
import { usePermissions } from "@/hooks/use-permissions";
import { inferNmeContentKind, type NmeContentKind } from "@/lib/nme-module-types";

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  content_kind?: string | null;
  is_required: boolean;
  order_index: number;
  quiz_questions: QuizQuestion[];
}

function typeBadge(kind: NmeContentKind) {
  if (kind === "video") return { label: "Video", icon: Play };
  if (kind === "quiz") return { label: "Quiz", icon: HelpCircle };
  return { label: "Reading", icon: BookOpen };
}

export function NmeLearningClient({ orgId }: { orgId: string }) {
  const { can } = usePermissions();
  const [modules, setModules] = useState<Module[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/nme/modules?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) {
      const data = await res.json();
      setModules((data.modules ?? []).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        title: String(m.title),
        description: m.description ? String(m.description) : null,
        content: m.content ? String(m.content) : null,
        content_kind: m.content_kind ? String(m.content_kind) : null,
        is_required: Boolean(m.is_required),
        order_index: Number(m.order_index ?? 0),
        quiz_questions: (m.quiz_questions ?? []) as QuizQuestion[],
      })));
      setCompletedIds(new Set((data.completedModuleIds ?? []) as string[]));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  function isLocked(mod: Module): boolean {
    if (!mod.is_required) return false;
    const priorRequired = modules
      .filter((m) => m.is_required && m.order_index < mod.order_index)
      .map((m) => m.id);
    return priorRequired.some((id) => !completedIds.has(id));
  }

  async function completeModule(moduleId: string, score: number) {
    setCompleting(true);
    const res = await fetch("/api/nme/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, moduleId, score }),
    });
    setCompleting(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Module completed!");
    setCompletedIds((prev) => new Set([...prev, moduleId]));
    setActiveModule(null);
    load();
  }

  const required = modules.filter((m) => m.is_required);
  const doneRequired = required.filter((m) => completedIds.has(m.id)).length;

  return (
    <div className="ds-page-stack">
      {required.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <ProgressBar
              value={Math.round((doneRequired / required.length) * 100)}
              label={`${doneRequired} of ${required.length} modules complete`}
            />
          </div>
          {!can("manage_nme") && doneRequired >= required.length && (
            <a href={`/api/nme/certificate?org_id=${encodeURIComponent(orgId)}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary" icon={<Download size={14} />}>Download certificate</Button>
            </a>
          )}
        </div>
      )}

      {can("manage_nme") && (
        <NmeModuleEditor
          orgId={orgId}
          modules={modules.map((m) => ({ ...m, quiz_questions: m.quiz_questions }))}
          onSaved={load}
        />
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-36 animate-pulse bg-surface-2 border-0">&nbsp;</Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <p className="type-small" style={{ color: "var(--color-text-secondary)" }}>
            No modules yet. Officers can seed default modules from this page.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const done = completedIds.has(mod.id);
            const locked = !done && isLocked(mod);
            const kind = inferNmeContentKind(mod.quiz_questions, mod.content, mod.content_kind);
            const badge = typeBadge(kind);
            const status = done ? "Complete" : locked ? "Not Started" : "In Progress";

            return (
              <Card key={mod.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <h2 className="type-h2" style={{ margin: 0 }}>{mod.title}</h2>
                  {locked && <Lock size={16} aria-label="Locked" />}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <Badge label={badge.label} color="gray" />
                  <Badge label={status} color={done ? "green" : locked ? "gray" : "blue"} />
                  {mod.is_required && <Badge label="Required" color="purple" />}
                </div>
                {mod.description && (
                  <p className="type-small" style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>
                    {mod.description}
                  </p>
                )}
                {!done && !locked && (
                  <Button size="sm" onClick={() => setActiveModule(mod)}>
                    {status === "In Progress" ? "Continue" : "Start"}
                  </Button>
                )}
                {done && (
                  <Button size="sm" variant="secondary" onClick={() => setActiveModule(mod)}>Review</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {activeModule && (
        <NmeModuleModal
          open={!!activeModule}
          onClose={() => setActiveModule(null)}
          title={activeModule.title}
          content={activeModule.content}
          contentKind={inferNmeContentKind(activeModule.quiz_questions, activeModule.content, activeModule.content_kind)}
          quizQuestions={activeModule.quiz_questions ?? []}
          completing={completing}
          onComplete={(score) => completeModule(activeModule.id, score)}
        />
      )}
    </div>
  );
}
