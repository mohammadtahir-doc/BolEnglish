"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  getLessonPart,
  getModuleById,
  getNextModule,
  isLessonPartId,
} from "@/lib/curriculum";
import { DifficultyLevel } from "@/types/curriculum";
import { useLearnerStore } from "@/lib/learner-store";
import { SentenceBuilderCanvas } from "@/components/curriculum/SentenceBuilderCanvas";
import { QuizCard } from "@/components/curriculum/QuizCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Languages,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";

type PlayerStep = 0 | 1 | 2 | 3;

const DIFFICULTY_BADGE: Record<
  DifficultyLevel,
  { label: string; className: string }
> = {
  easy: {
    label: "1. Easy",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  medium: {
    label: "2. Medium",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  hard: {
    label: "3. Hard",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const STEP_LABELS: Record<PlayerStep, string> = {
  0: "Step 1 of 3 • Learn Concept",
  1: "Step 2 of 3 • Sentence Builder",
  2: "Step 3 of 3 • Quiz Check",
  3: "Module Complete",
};

function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export default function ModulePlayerPage() {
  const params = useParams<{
    partId?: string | string[];
    moduleId?: string | string[];
  }>();

  const partId = Array.isArray(params?.partId)
    ? params.partId[0]
    : params?.partId ?? "";
  const moduleId = Array.isArray(params?.moduleId)
    ? params.moduleId[0]
    : params?.moduleId ?? "";

  const validPart = isLessonPartId(partId);
  const part = validPart ? getLessonPart(partId) : undefined;
  const mod = validPart ? getModuleById(partId, moduleId) : undefined;
  const nextModule = validPart ? getNextModule(partId, moduleId) : undefined;

  const { state, isLoaded, markModuleComplete } = useLearnerStore();

  const [step, setStep] = useState<PlayerStep>(0);
  const [showHindi, setShowHindi] = useState<boolean>(true);
  const [hindiToggledByUser, setHindiToggledByUser] = useState<boolean>(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] =
    useState<boolean>(false);

  // Reset player state cleanly when switching between modules
  useEffect(() => {
    setStep(0);
    setHindiToggledByUser(false);
    setPlayingIdx(null);
    setWasAlreadyCompleted(false);
    cancelSpeech();
  }, [partId, moduleId]);

  // Respect saved showHindiHints once localStorage loads unless user toggled locally
  useEffect(() => {
    if (isLoaded && !hindiToggledByUser) {
      setShowHindi(state.showHindiHints);
    }
  }, [isLoaded, state.showHindiHints, hindiToggledByUser]);

  // Ensure speech synthesis stops if user navigates away
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const speakExample = useCallback(
    (text: string, index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = state.audioRate;
      setPlayingIdx(index);
      utterance.onend = () =>
        setPlayingIdx((curr) => (curr === index ? null : curr));
      utterance.onerror = () =>
        setPlayingIdx((curr) => (curr === index ? null : curr));
      window.speechSynthesis.speak(utterance);
    },
    [state.audioRate]
  );

  const handleToggleHindi = () => {
    setHindiToggledByUser(true);
    setShowHindi((prev) => !prev);
  };

  const handleGoToBuilder = () => {
    cancelSpeech();
    setPlayingIdx(null);
    setStep(1);
  };

  const handleFinish = useCallback(() => {
    if (!mod) return;
    const alreadyDone = state.completedModuleIds.includes(mod.id);
    setWasAlreadyCompleted(alreadyDone);
    markModuleComplete(mod.id, mod.xpReward);
    setStep(3);
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });
  }, [mod, state.completedModuleIds, markModuleComplete]);

  if (!part || !mod) {
    const backHref = part ? `/dashboard/lessons/${part.id}` : "/dashboard";
    const backLabel = part ? "Back to 20 Modules" : "Back to Dashboard";

    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Module Not Found
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            We couldn&apos;t find that learning module. Head back and select an
            available module.
          </p>
          <div className="pt-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-3d-primary hover:bg-brand-500 transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const diffBadge = DIFFICULTY_BADGE[mod.difficulty];
  const formattedModuleNum = String(mod.moduleNumber).padStart(2, "0");
  const progressPercent =
    step === 0 ? 25 : step === 1 ? 50 : step === 2 ? 75 : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Progress Header */}
      <div className="bg-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-100 shadow-sm flex items-center justify-between gap-2 sm:gap-4">
        <Link
          href={`/dashboard/lessons/${part.id}`}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs md:text-sm font-bold transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">
            {part.order}. {part.title}
          </span>
          <span className="sm:hidden">Back</span>
        </Link>

        {/* Progress Bar */}
        <div className="flex-1 min-w-0 max-w-md space-y-1">
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-500">
            <span className="sm:hidden truncate">Step {step + 1}/3</span>
            <span className="hidden sm:inline truncate">{STEP_LABELS[step]}</span>
            <span className="shrink-0">{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-teal-400 rounded-full transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] sm:text-xs font-bold shrink-0 whitespace-nowrap">
          <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
          <span>+{mod.xpReward} XP</span>
        </div>
      </div>

      {/* Player Stage */}
      <div>
        {/* Step 0: Learn */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/60 space-y-6">
              {/* Module Header & Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
                      Module {formattedModuleNum}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${diffBadge.className}`}
                    >
                      {diffBadge.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleHindi}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Languages className="w-3.5 h-3.5 text-brand-600" />
                    <span>
                      {showHindi ? "Hide Hindi Hint" : "Show Hindi Hint"}
                    </span>
                    {showHindi ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 pt-1">
                  {mod.title}
                </h1>
                <p className="text-base md:text-lg font-bold text-slate-500 font-hindi">
                  {mod.titleHindi}
                </p>
              </div>

              {/* English Summary */}
              <div className="p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Key Rule
                </span>
                <p className="text-slate-800 font-semibold leading-relaxed text-sm md:text-base">
                  {mod.summaryEn}
                </p>
              </div>

              {/* Collapsible Hindi Summary */}
              {showHindi && (
                <div className="p-4 md:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-800 font-hindi">
                  <span className="text-xs font-bold text-amber-800 block mb-1">
                    आसान हिंदी में समझें:
                  </span>
                  <p className="text-sm md:text-base leading-relaxed text-slate-800">
                    {mod.summaryHi}
                  </p>
                </div>
              )}

              {/* Spoken Examples */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Spoken Examples
                  </h2>
                  <span className="text-[11px] font-bold text-slate-400">
                    Audio Speed: {state.audioRate}x
                  </span>
                </div>

                <div className="space-y-2.5">
                  {mod.examples.map((example, idx) => {
                    const isPlaying = playingIdx === idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
                          isPlaying
                            ? "bg-brand-50/60 border-brand-300"
                            : "bg-slate-50 border-slate-200/80 hover:border-brand-200"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-sm md:text-base">
                            {example.en}
                          </p>
                          <p className="text-xs md:text-sm text-slate-500 font-hindi">
                            {example.hi}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakExample(example.en, idx)}
                          aria-label={`Listen to: ${example.en}`}
                          title={`Listen at ${state.audioRate}x`}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer ${
                            isPlaying
                              ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:text-brand-600 hover:border-brand-300"
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleGoToBuilder}
                className="gap-2 w-full sm:w-auto"
              >
                <span>Start Sentence Builder</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Sentence Builder */}
        {step === 1 && (
          <SentenceBuilderCanvas
            key={mod.id}
            exercise={mod.exercise}
            onComplete={() => setStep(2)}
          />
        )}

        {/* Step 2: Quiz */}
        {step === 2 && (
          <QuizCard key={mod.id} quiz={mod.quiz} onNext={handleFinish} />
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-5 sm:p-8 md:p-10 border-2 border-slate-100 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 fill-amber-400 text-amber-500" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Module {formattedModuleNum} Completed
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
                {mod.title}
              </h1>
              <p className="text-sm md:text-base font-semibold text-slate-500 font-hindi">
                {mod.titleHindi}
              </p>
            </div>

            {/* XP & Streak Summary */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {wasAlreadyCompleted ? "Review Value" : "XP Earned"}
                </span>
                <p className="text-2xl font-black text-brand-600 mt-0.5">
                  +{mod.xpReward} XP
                </p>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total XP
                </span>
                <p className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1 mt-0.5">
                  <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
                  {state.xp}
                </p>
              </div>
            </div>

            {wasAlreadyCompleted && (
              <p className="text-xs font-semibold text-slate-500">
                Revision complete
              </p>
            )}

            {/* Next Module Preview */}
            {nextModule && (
              <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-brand-50/60 border border-brand-200 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  Up Next
                </span>
                <p className="text-sm font-black text-slate-900">
                  Module {String(nextModule.moduleNumber).padStart(2, "0")}:{" "}
                  {nextModule.title}
                </p>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {nextModule && (
                <Link
                  href={`/dashboard/lessons/${part.id}/${nextModule.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-brand-600 text-white text-sm md:text-base font-extrabold shadow-3d-primary hover:bg-brand-500 hover:-translate-y-0.5 active:translate-y-0.5 transition-[transform,background-color] duration-150"
                >
                  <span>Next Module</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <Link
                href={`/dashboard/lessons/${part.id}`}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white text-slate-800 border-2 border-slate-200 text-sm md:text-base font-extrabold shadow-3d-neutral hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0.5 transition-[transform,background-color] duration-150"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to 20 Modules</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
