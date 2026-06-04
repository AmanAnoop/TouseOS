"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardHeader } from "@/components/ui";

export function GreekMatchPhotos({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/greekmatch/photos", { method: "POST", body });
    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Upload failed");
      return;
    }
    onChange((data.photos as string[]) ?? photos);
    toast.success("Photo added");
  }

  async function remove(index: number) {
    const res = await fetch(`/api/greekmatch/photos?index=${index}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error ?? "Remove failed");
      return;
    }
    onChange((data.photos as string[]) ?? []);
  }

  return (
    <Card>
      <CardHeader
        title="Profile photos"
        description="Up to 6 photos for GreekMatch. First photo is your main card image."
        action={
          photos.length < 6 ? (
            <Button size="sm" variant="secondary" icon={<ImagePlus size={14} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              Add photo
            </Button>
          ) : undefined
        }
      />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet — add at least one for better matches.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-surface-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white" onClick={() => remove(i)}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
