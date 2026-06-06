"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";

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
  quizQuestions: QuizQuestion[];
  onComplete: (score: number) => Promise<void>;
  completing?: boolean;
}

export function NmeModuleModal({
  open,
  onClose,
  title,
  content,
  quizQuestions,
  onComplete,
  completing,
}: NmeModuleModalProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const hasQuiz = quizQuestions.length > 0;

  function computeScore(): number {
    if (!hasQuiz) return 100;
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct += 1;
    });
    return Math.round((correct / quizQuestions.length) * 100);
  }

  async function submit() {
    const score = computeScore();
    if (hasQuiz && score < 80) return;
    await onComplete(score);
    setAnswers({});
  }

  const score = computeScore();
  const canSubmit = !hasQuiz || Object.keys(answers).length === quizQuestions.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={submit} loading={completing} disabled={!canSubmit || (hasQuiz && score < 80)}>
            {hasQuiz ? `Submit quiz (${score}%)` : "Mark complete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
          </div>
        )}
        {hasQuiz && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">Quiz — score 80% or higher to pass</p>
            {quizQuestions.map((q, qi) => (
              <fieldset key={qi} className="space-y-2">
                <legend className="text-sm font-medium">{q.question}</legend>
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
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
            {canSubmit && score < 80 && (
              <p className="text-sm text-red-600">Score {score}% — review the material and try again.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
