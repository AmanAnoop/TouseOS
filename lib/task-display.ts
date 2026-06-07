import type { Task } from "@/types";

const HARDSHIP_TITLE_RE = /^Hardship request\s*[—–-]\s*(.+)$/i;

/** Name of the member who submitted a hardship request task (for officer review). */
export function getHardshipRequesterName(task: Pick<Task, "title" | "description" | "tags">): string | null {
  const titleMatch = task.title.match(HARDSHIP_TITLE_RE);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const desc = task.description ?? "";
  const memberLine = desc.match(/^Member:\s*(.+)$/m);
  if (memberLine?.[1]) return memberLine[1].trim();

  return null;
}

export function isHardshipTask(task: Pick<Task, "tags">): boolean {
  return (task.tags ?? []).some((t) => t === "hardship");
}
