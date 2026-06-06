"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, CheckCircle2, Download, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { NmeModuleModal, type QuizQuestion } from "@/components/nme/nme-module-modal";
import { NmeModuleEditor } from "@/components/nme/nme-module-editor";
import { usePermissions } from "@/hooks/use-permissions";

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  is_required: boolean;
  order_index: number;
  quiz_questions: QuizQuestion[];
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
    <div className="space-y-5">
      <PageHeader title="New Member Education" description="Complete required modules for your chapter" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Modules" value={modules.length} icon={<BookOpen size={18} />} />
        <StatCard title="Your progress" value={required.length ? `${doneRequired}/${required.length}` : "—"} icon={<CheckCircle2 size={18} />} />
      </div>
      {required.length > 0 && (
        <ProgressBar value={Math.round((doneRequired / required.length) * 100)} label="Required modules complete" />
      )}
      {required.length > 0 && doneRequired >= required.length && (
        <div className="flex justify-end">
          <a href={`/api/nme/certificate?org_id=${encodeURIComponent(orgId)}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="secondary" icon={<Download size={14} />}>Download certificate</Button>
          </a>
        </div>
      )}
      {can("manage_nme") && (
        <NmeModuleEditor orgId={orgId} modules={modules} onSaved={load} />
      )}
      <Card>
        <CardHeader title="Your modules" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No modules yet. Officers can seed default modules from this page.</p>
        ) : (
          <div className="space-y-2">
            {modules.map((mod) => {
              const done = completedIds.has(mod.id);
              const locked = !done && isLocked(mod);
              return (
                <div key={mod.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{mod.title}</p>
                      {mod.is_required && <Badge label="Required" color="green" />}
                      {done && <Badge label="Done" color="blue" />}
                      {locked && <Badge label="Locked" color="gray" />}
                      {(mod.quiz_questions?.length ?? 0) > 0 && <Badge label="Quiz" color="purple" />}
                    </div>
                    {mod.description && <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>}
                  </div>
                  {!done && !locked && (
                    <Button size="sm" onClick={() => setActiveModule(mod)}>Start</Button>
                  )}
                  {locked && <Lock size={14} className="text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {activeModule && (
        <NmeModuleModal
          open={!!activeModule}
          onClose={() => setActiveModule(null)}
          title={activeModule.title}
          content={activeModule.content}
          quizQuestions={activeModule.quiz_questions ?? []}
          completing={completing}
          onComplete={(score) => completeModule(activeModule.id, score)}
        />
      )}
    </div>
  );
}
