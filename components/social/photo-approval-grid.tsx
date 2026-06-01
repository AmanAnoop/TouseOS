"use client";

import { CheckCircle, Flag, Star } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Photo } from "@/types";

const APPROVAL_COLOR = {
  pending: "yellow",
  approved: "green",
  chapter_only: "blue",
  do_not_post: "red",
  flagged: "red",
  removed: "gray",
} as const;

interface PhotoApprovalGridProps {
  photos: Photo[];
  onApprove: (id: string, status: string) => void;
  onSelect?: (id: string) => void;
  selectedIds?: string[];
}

export function PhotoApprovalGrid({
  photos, onApprove, onSelect, selectedIds = [],
}: PhotoApprovalGridProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={`relative group rounded-xl overflow-hidden border border-border aspect-square cursor-pointer ${
            selectedIds.includes(photo.id) ? "ring-2 ring-greek-500" : ""
          }`}
          onClick={() => onSelect?.(photo.id)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption ?? "Photo"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(photo.id, "approved"); }}
                className="p-1.5 rounded-md bg-green-600 text-white"
                title="Approve"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(photo.id, "chapter_only"); }}
                className="p-1.5 rounded-md bg-blue-600 text-white"
                title="Chapter only"
              >
                <Star size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(photo.id, "flagged"); }}
                className="p-1.5 rounded-md bg-red-600 text-white"
                title="Flag"
              >
                <Flag size={14} />
              </button>
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <Badge label={photo.status.replace("_", " ")} color={APPROVAL_COLOR[photo.status] ?? "gray"} />
          </div>
        </div>
      ))}
    </div>
  );
}
