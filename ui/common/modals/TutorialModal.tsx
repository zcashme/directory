"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Modal from "./Modal";
import Button from "@/ui/common/buttons/Button";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  details?: string[];
  videoUrl?: string;
  videoTitle?: string;
  textContent?: ReactNode;
}

export interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  steps: TutorialStep[];
  onSkip?: () => void;
  onComplete?: () => void;
}

export default function TutorialModal({
  isOpen,
  onClose,
  title = "Welcome to your quick tour",
  subtitle = "Learn the core actions in a few short steps.",
  steps,
  onSkip,
  onComplete,
}: TutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
  }, [isOpen]);

  const totalSteps = steps.length;
  const clampedIndex = Math.min(stepIndex, Math.max(0, totalSteps - 1));
  const step = steps[clampedIndex];
  const progressPercent = useMemo(() => {
    if (totalSteps <= 0) return 0;
    return ((clampedIndex + 1) / totalSteps) * 100;
  }, [clampedIndex, totalSteps]);

  if (totalSteps === 0) return null;

  const isFirstStep = clampedIndex === 0;
  const isLastStep = clampedIndex === totalSteps - 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="max-w-[1100px] max-h-[92vh] overflow-hidden"
      closeOnBackdrop={false}
      closeOnEscape
    >
      <div className="relative border-b border-black/10 bg-white">
        <div className="absolute inset-x-0 top-0 h-2 bg-black/5">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundImage: "linear-gradient(90deg, #fde047, #4ade80, #22c55e, #fde047)",
              backgroundSize: "200% 100%",
              animation: "tutorialSlideGradient 15s linear infinite",
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
              Step {clampedIndex + 1} of {totalSteps}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="h-9 w-9 shrink-0 rounded-full border border-black/15 text-gray-700 transition-colors hover:bg-gray-100"
          >
            X
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Current lesson</p>
              <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm leading-6 text-gray-700">{step.description}</p>

              {step.textContent && (
                <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm text-gray-700">
                  {step.textContent}
                </div>
              )}

              {step.details && step.details.length > 0 && (
                <ul className="space-y-2">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 text-green-600">-</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-auto border-t border-black/10 pt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {steps.map((stepItem, index) => (
                  <button
                    key={stepItem.id}
                    type="button"
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      index === clampedIndex ? "bg-green-600 w-6" : "bg-black/20 hover:bg-black/35"
                    }`}
                    onClick={() => setStepIndex(index)}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onSkip?.();
                    onClose();
                  }}
                >
                  Skip
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={isFirstStep}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (isLastStep) {
                      onComplete?.();
                      onClose();
                      return;
                    }
                    setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
                  }}
                >
                  {isLastStep ? "Finish" : "Next"}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Video walkthrough</p>
            {step.videoUrl ? (
              <div className="overflow-hidden rounded-xl border border-black/10 bg-black">
                <iframe
                  src={step.videoUrl}
                  title={step.videoTitle ?? `${step.title} video`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-black/20 bg-gray-50 text-sm text-gray-500">
                Add a video URL for this step to show a walkthrough.
              </div>
            )}

            <p className="text-xs text-gray-500">
              Keep each clip under 60 seconds so first-time users can complete the tour quickly.
            </p>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes tutorialSlideGradient {
          0% { background-position: 0% 0%; }
          100% { background-position: -200% 0%; }
        }
      `}</style>
    </Modal>
  );
}
