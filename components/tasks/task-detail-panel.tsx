"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskComment {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

interface TaskDetailPanelProps {
  task: Task;
  orgId: string;
  userId: string | null;
  userName: string;
  twilioLive?: boolean | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailPanel({ task, orgId, userName, twilioLive, onClose, onUpdate }: TaskDetailPanelProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [attachments, setAttachments] = useState<string[]>(
    ((task as Task & { attachment_urls?: string[] }).attachment_urls ?? []),
  );
  const [uploading, setUploading] = useState(false);

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/tasks/comments?task_id=${encodeURIComponent(task.id)}`);
    if (res.ok) setComments((await res.json()) as TaskComment[]);
  }, [task.id]);

  useEffect(() => {
    loadComments();
    setAttachments(((task as Task & { attachment_urls?: string[] }).attachment_urls ?? []));
  }, [task, loadComments]);

  async function postComment() {
    if (!commentText.trim()) return;
    const res = await fetch("/api/tasks/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        body: commentText.trim(),
        authorName: userName,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "Failed to post comment");
      return;
    }
    setCommentText("");
    loadComments();
  }

  async function uploadAttachment(file: File) {
    if (!orgId) return;
    setUploading(true);
    const path = `${orgId}/tasks/${task.id}/${Date.now()}-${file.name}`;
    const { data: stored, error } = await supabase.storage.from("documents").upload(path, file);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(stored.path);
    const next = [...attachments, urlData.publicUrl];
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, attachment_urls: next }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save attachment");
      return;
    }
    setAttachments(next);
    toast.success("Attachment added");
    onUpdate();
  }

  async function textAssignees() {
    const res = await fetch("/api/tasks/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, taskId: task.id }),
    });
    const data = await res.json().catch(() => ({})) as { message?: string; sent?: number; error?: string };
    if (!res.ok) {
      toast.error(data.message ?? data.error ?? "Could not send texts");
      return;
    }
    toast.success(data.message ?? `Sent ${data.sent ?? 0} message(s)`);
  }

  async function removeAttachment(url: string) {
    const next = attachments.filter((a) => a !== url);
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, attachment_urls: next }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save attachment");
      return;
    }
    setAttachments(next);
    onUpdate();
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground truncate">{task.title}</h2>
          <p className="text-xs text-muted-foreground">{task.assignee_name ?? "Unassigned"} · {task.status.replace("_", " ")}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-1 text-muted-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        {twilioLive && task.assignee_name && (
          <Button variant="secondary" size="sm" icon={<MessageSquare size={14} />} onClick={textAssignees}>
            Text assignees
          </Button>
        )}

        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Paperclip size={14} /> Attachments ({attachments.length})
          </h3>
          {attachments.length > 0 && (
            <ul className="space-y-1 mb-2">
              {attachments.map((url) => (
                <li key={url} className="flex items-center justify-between text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-greek-600 truncate flex-1">
                    {url.split("/").pop()}
                  </a>
                  <button onClick={() => removeAttachment(url)} className="text-muted-foreground hover:text-red-500 ml-2">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAttachment(file);
          }} />
          <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
            Add attachment
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare size={14} /> Comments ({comments.length})
          </h3>
          <div className="space-y-3 mb-3">
            {comments.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-surface-1 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{c.author_name ?? "Member"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground">{c.body}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 min-h-[60px]"
            />
          </div>
          <Button size="sm" className="mt-2" icon={<Send size={14} />} onClick={postComment} disabled={!commentText.trim()}>
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
