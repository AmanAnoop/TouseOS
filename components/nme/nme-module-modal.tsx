"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "@/components/ui";
import type { NmeContentKind } from "@/lib/nme-module-types";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface NmeModuleModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string | null;
  contentKind: NmeContentKind;
  quizQuestions: QuizQuestion[];
  onComplete: (score: number) => Promise<void>;
  completing?: boolean;
}

function extractVideoUrl(content: string | null): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed) && /\.(mp4|webm|mov)(\?|$)/i.test(trimmed)) return trimmed;
  const yt = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

export function NmeModuleModal({
  open,
  onClose,
  title,
  content,
  contentKind,
  quizQuestions,
  onComplete,
  completing,
}: NmeModuleModalProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [embedAcknowledged, setEmbedAcknowledged] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasQuiz = contentKind === "quiz" && quizQuestions.length > 0;
  const videoUrl = contentKind === "video" ? extractVideoUrl(content) : null;

  const resetState = useCallback(() => {
    setAnswers({});
    setQuizSubmitted(false);
    setScrollReady(false);
    setVideoEnded(false);
    setEmbedAcknowledged(false);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open || contentKind !== "reading") return;
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      if (!el) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
      if (nearBottom) setScrollReady(true);
    }

    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, contentKind, content]);

  function computeScore(): number {
    if (!hasQuiz) return 100;
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct += 1;
    });
    return Math.round((correct / quizQuestions.length) * 100);
  }

  const score = computeScore();
  const allAnswered = Object.keys(answers).length === quizQuestions.length;

  const canComplete = (() => {
    if (hasQuiz) return quizSubmitted && allAnswered;
    if (contentKind === "video") return videoEnded || embedAcknowledged;
    if (contentKind === "reading") return scrollReady || !content?.trim();
    return true;
  })();

  async function submitQuiz() {
    setQuizSubmitted(true);
    if (score < 80) return;
    await onComplete(score);
    resetState();
  }

  async function markComplete() {
    await onComplete(hasQuiz ? score : 100);
    resetState();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {hasQuiz ? (
            <Button
              onClick={submitQuiz}
              loading={completing}
              disabled={!allAnswered}
              className={!canComplete ? "ds-btn-disabled" : undefined}
            >
              Submit quiz ({score}%)
            </Button>
          ) : (
            <Button
              onClick={markComplete}
              loading={completing}
              disabled={!canComplete}
              className={!canComplete ? "ds-btn-disabled" : undefined}
            >
              Mark complete
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {contentKind === "reading" && content && (
          <div
            ref={scrollRef}
            className="type-body"
            style={{
              maxHeight: 320,
              overflowY: "auto",
              padding: 16,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {content}
          </div>
        )}

        {contentKind === "video" && (
          <div>
            {videoUrl?.includes("youtube.com/embed") ? (
              <iframe
                title={title}
                src={videoUrl}
                className="w-full rounded-lg"
                style={{ height: 280, border: "none" }}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                onLoad={() => {
                  /* YouTube embed end detection requires API — allow complete after interaction */
                }}
              />
            ) : videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: 320 }}
                onEnded={() => setVideoEnded(true)}
              />
            ) : (
              <p className="type-body whitespace-pre-wrap">{content}</p>
            )}
            {contentKind === "video" && videoUrl?.includes("youtube.com/embed") && !embedAcknowledged && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => setEmbedAcknowledged(true)}
              >
                I finished watching this video
              </Button>
            )}
            {contentKind === "video" && !videoEnded && !embedAcknowledged && videoUrl && !videoUrl.includes("youtube.com/embed") && (
              <p className="type-small" style={{ color: "var(--color-text-tertiary)", marginTop: 8 }}>
                Watch the video to the end to unlock Mark complete.
              </p>
            )}
          </div>
        )}

        {hasQuiz && (
          <div className="space-y-4">
            <p className="type-small font-medium">Quiz — score 80% or higher to pass</p>
            {quizQuestions.map((q, qi) => (
              <fieldset key={qi} className="space-y-2">
                <legend className="type-small font-medium">{q.question}</legend>
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2 type-small cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers({ ...answers, [qi]: oi })}
                    />
                    {opt}
                  </label>
                ))}
              </fieldset>
            ))}
            {quizSubmitted && score < 80 && (
              <p className="type-small" style={{ color: "var(--color-error)" }}>
                Score {score}% — review the material and try again.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
