import type { TransitionBinder } from "@/types";
import { ROLE_LABELS } from "@/lib/permissions";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTransitionBinderHtml(binder: TransitionBinder, orgName: string): string {
  const role = ROLE_LABELS[binder.role as keyof typeof ROLE_LABELS] ?? binder.role;
  const extra = binder as TransitionBinder & {
    unfinished_tasks?: string | null;
    vendor_notes?: string | null;
    budget_notes?: string | null;
  };
  const sections: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Responsibilities", value: binder.responsibilities },
    { label: "Lessons learned", value: binder.lessons_learned },
    { label: "Unfinished tasks", value: extra.unfinished_tasks },
    { label: "Vendor notes", value: extra.vendor_notes },
    { label: "Budget notes", value: extra.budget_notes },
    { label: "Recommendations", value: binder.recommendations },
  ];

  const body = sections
    .filter((s) => s.value)
    .map(
      (s) => `<section><h2>${escapeHtml(s.label)}</h2><pre>${escapeHtml(String(s.value))}</pre></section>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(role)} Transition Binder</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#111}
h1{font-size:1.5rem}h2{font-size:1rem;margin-top:1.5rem;color:#444}pre{white-space:pre-wrap;background:#f4f4f5;padding:1rem;border-radius:8px}</style></head>
<body><h1>${escapeHtml(orgName)} — ${escapeHtml(role)}</h1>
<p><strong>${escapeHtml(binder.outgoing_name ?? "Officer")}</strong> · ${escapeHtml(binder.semester ?? "")} ${binder.year ?? ""}</p>
${body}
<p style="margin-top:2rem;font-size:12px;color:#666">Generated ${new Date().toLocaleString()}</p></body></html>`;
}

export function downloadTransitionBinderHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
