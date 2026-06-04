"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, CardHeader, PageHeader, ProgressBar, StatCard } from "@/components/ui";

interface Module {
  id: string;
  title: string;
  description: string | null;
  is_required: boolean;
}

export function NmeLearningClient({ orgId }: { orgId: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/nme/modules?org_id=${encodeURIComponent(orgId)}`);
    if (res.ok) {
      const data = await res.json();
      setModules((data.modules ?? []) as Module[]);
      setCompletedIds(new Set((data.completedModuleIds ?? []) as string[]));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function completeModule(moduleId: string) {
    const res = await fetch("/api/nme/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, moduleId, score: 100 }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed");
      return;
    }
    toast.success("Module completed!");
    setCompletedIds((prev) => new Set([...prev, moduleId]));
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
              return (
                <div key={mod.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{mod.title}</p>
                      {mod.is_required && <Badge label="Required" color="green" />}
                      {done && <Badge label="Done" color="blue" />}
                    </div>
                    {mod.description && <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>}
                  </div>
                  {!done && (
                    <Button size="sm" onClick={() => completeModule(mod.id)}>Mark complete</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
