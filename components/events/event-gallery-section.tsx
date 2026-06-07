"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { ImageIcon, Upload } from "lucide-react";
import { Button, Card, CardHeader, EmptyState } from "@/components/ui";
import type { Photo } from "@/types";

export function EventGallerySection({
  eventId,
  orgId,
  eventTitle,
}: {
  eventId: string;
  orgId: string;
  eventTitle: string;
}) {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    const albumRes = await fetch(
      `/api/events/event-album?org_id=${encodeURIComponent(orgId)}&event_id=${encodeURIComponent(eventId)}`,
    );
    if (!albumRes.ok) {
      setLoading(false);
      return;
    }
    const { album } = (await albumRes.json()) as { album: { id: string } };
    setAlbumId(album.id);

    const photosRes = await fetch(`/api/photos?album_id=${encodeURIComponent(album.id)}&limit=12`);
    if (photosRes.ok) setPhotos((await photosRes.json()) as Photo[]);
    setLoading(false);
  }, [orgId, eventId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  return (
    <Card>
      <CardHeader
        title="Photos & videos"
        icon={<ImageIcon size={16} />}
        description={`Memories from ${eventTitle}`}
        action={
          albumId ? (
            <Link href={`/social?eventId=${eventId}&albumId=${albumId}&upload=1`}>
              <Button variant="secondary" size="sm" icon={<Upload size={14} />}>
                Upload
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={20} />}
          title="No photos yet"
          description="Upload shots from the event — they'll show up here for everyone."
          action={
            albumId ? (
              <Link href={`/social?eventId=${eventId}&albumId=${albumId}&upload=1`}>
                <Button size="sm" icon={<Upload size={14} />}>Add photos</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.slice(0, 8).map((p) => (
              <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-surface-2">
                {p.url ? (
                  <NextImage src={p.url} alt={p.caption ?? "Event photo"} fill className="object-cover" sizes="120px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {albumId && (
            <Link href={`/social?eventId=${eventId}&albumId=${albumId}`} className="inline-block mt-3 text-sm text-greek-600 hover:underline">
              View full gallery →
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
