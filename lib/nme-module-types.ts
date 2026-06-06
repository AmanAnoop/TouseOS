/** NME module content kinds for completion validation. */

export type NmeContentKind = "reading" | "video" | "quiz";

export function inferNmeContentKind(
  quizQuestions: unknown[] | null | undefined,
  content: string | null | undefined,
  contentKind?: string | null,
): NmeContentKind {
  if (contentKind === "video" || contentKind === "reading" || contentKind === "quiz") {
    return contentKind;
  }
  if ((quizQuestions?.length ?? 0) > 0) return "quiz";
  const c = (content ?? "").toLowerCase();
  if (/\.(mp4|webm|mov)(\?|$)/i.test(c) || /youtube\.com|youtu\.be|vimeo\.com/.test(c)) {
    return "video";
  }
  return "reading";
}
