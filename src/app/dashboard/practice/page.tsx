"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ALL_MODULES, LESSON_PARTS } from "@/lib/curriculum";
import { useLearnerStore } from "@/lib/learner-store";
import {
  DifficultyLevel,
  LearningModule,
  LessonPartId,
} from "@/types/curriculum";
import { SentenceBuilderCanvas } from "@/components/curriculum/SentenceBuilderCanvas";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Filter,
  Mic,
  MicOff,
  RotateCcw,
  Shuffle,
  Sparkles,
  Volume2,
} from "lucide-react";

type PartFilter = "all" | LessonPartId;
type DifficultyFilter = "all" | DifficultyLevel;

interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionResultAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const PART_OPTIONS: Array<{ value: PartFilter; label: string }> = [
  { value: "all", label: "All Parts" },
  ...LESSON_PARTS.map((part) => ({
    value: part.id as PartFilter,
    label: `${part.order}. ${part.title}`,
  })),
];

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "easy", label: "1. Easy" },
  { value: "medium", label: "2. Medium" },
  { value: "hard", label: "3. Hard" },
];

const DIFFICULTY_BADGE_MAP: Record<
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
    className: "bg-ai-50 text-ai-700 border-ai-200",
  },
};

function shuffleModules(modules: LearningModule[]): LearningModule[] {
  const copy = [...modules];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeForSpeechCheck(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function computeSpeechMatchPercent(spoken: string, target: string): number {
  const targetWords = normalizeForSpeechCheck(target);
  const spokenWords = normalizeForSpeechCheck(spoken);
  if (targetWords.length === 0 || spokenWords.length === 0) return 0;

  const spokenSet = new Set(spokenWords);
  let matched = 0;
  for (const word of targetWords) {
    if (spokenSet.has(word)) matched += 1;
  }
  return Math.round((matched / targetWords.length) * 100);
}

export default function PracticePage() {
  const { state } = useLearnerStore();

  const [selectedPart, setSelectedPart] = useState<PartFilter>("all");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<DifficultyFilter>("all");

  const filteredModules = useMemo(() => {
    return ALL_MODULES.filter((mod) => {
      const partMatch = selectedPart === "all" || mod.partId === selectedPart;
      const diffMatch =
        selectedDifficulty === "all" || mod.difficulty === selectedDifficulty;
      return partMatch && diffMatch;
    });
  }, [selectedPart, selectedDifficulty]);

  const [orderedModules, setOrderedModules] =
    useState<LearningModule[]>(filteredModules);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [drillResetSeed, setDrillResetSeed] = useState<number>(0);
  const [sessionDrillsCompleted, setSessionDrillsCompleted] =
    useState<number>(0);
  const [lastCompletedBanner, setLastCompletedBanner] = useState<string | null>(
    null
  );

  // Quick Speaking Practice state
  const [practicedModuleIds, setPracticedModuleIds] = useState<string[]>([]);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string | null>(null);
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setOrderedModules(filteredModules);
    setCurrentIndex(0);
    setDrillResetSeed((prev) => prev + 1);
    setSpokenTranscript(null);
    setSpeechNote(null);
    setLastCompletedBanner(null);
  }, [filteredModules]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const currentModule = orderedModules[currentIndex];
  const totalDrills = orderedModules.length;
  const partMeta = currentModule
    ? LESSON_PARTS.find((p) => p.id === currentModule.partId)
    : undefined;

  const stopOngoingSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingAudio(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListeningMic(false);
  };

  const resetSpeakingPanel = () => {
    stopOngoingSpeech();
    setSpokenTranscript(null);
    setSpeechNote(null);
  };

  const handleNextRandomDrill = () => {
    if (orderedModules.length === 0) return;
    resetSpeakingPanel();
    setLastCompletedBanner(null);

    if (orderedModules.length === 1) {
      setDrillResetSeed((prev) => prev + 1);
      return;
    }

    let nextIdx = currentIndex;
    while (nextIdx === currentIndex) {
      nextIdx = Math.floor(Math.random() * orderedModules.length);
    }
    setCurrentIndex(nextIdx);
    setDrillResetSeed((prev) => prev + 1);
  };

  const handleShuffleDeck = () => {
    if (filteredModules.length === 0) return;
    resetSpeakingPanel();
    setLastCompletedBanner(null);
    setOrderedModules(shuffleModules(filteredModules));
    setCurrentIndex(0);
    setDrillResetSeed((prev) => prev + 1);
  };

  const handleDrillComplete = () => {
    if (orderedModules.length === 0) return;
    resetSpeakingPanel();
    setSessionDrillsCompleted((prev) => prev + 1);
    if (currentModule) {
      setLastCompletedBanner(
        `Great job completing "${currentModule.title}"! Here is your next drill.`
      );
    }
    setCurrentIndex((prev) => (prev + 1) % orderedModules.length);
    setDrillResetSeed((prev) => prev + 1);
  };

  const handlePlayTargetAudio = () => {
    if (!currentModule) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechNote("Audio playback is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      currentModule.exercise.expectedEnglish
    );
    utterance.lang = "en-IN";
    utterance.rate = state.audioRate;
    setIsSpeakingAudio(true);
    setSpeechNote(null);

    utterance.onend = () => setIsSpeakingAudio(false);
    utterance.onerror = () => setIsSpeakingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const markCurrentPracticed = () => {
    if (!currentModule) return;
    setPracticedModuleIds((prev) =>
      prev.includes(currentModule.id) ? prev : [...prev, currentModule.id]
    );
  };

  const toggleCurrentPracticed = () => {
    if (!currentModule) return;
    setPracticedModuleIds((prev) =>
      prev.includes(currentModule.id)
        ? prev.filter((id) => id !== currentModule.id)
        : [...prev, currentModule.id]
    );
  };

  const handleToggleMicPractice = () => {
    if (!currentModule) return;

    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop error
        }
      }
      setIsListeningMic(false);
      return;
    }

    if (typeof window === "undefined") return;
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechNote(
        "Voice recognition works in Chrome/Edge. Listen to the audio, read the sentence aloud, and click Mark as Practiced."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
        if (transcript) {
          setSpokenTranscript(transcript);
          const matchScore = computeSpeechMatchPercent(
            transcript,
            currentModule.exercise.expectedEnglish
          );
          if (matchScore >= 70) {
            setSpeechNote(
              `Great pronunciation! ${matchScore}% word match with the target sentence.`
            );
            markCurrentPracticed();
          } else {
            setSpeechNote(
              `${matchScore}% word match — listen once more at ${state.audioRate}x and try again.`
            );
          }
        }
        setIsListeningMic(false);
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
        setSpeechNote(
          "Could not capture microphone input. Check mic permissions or mark practiced manually."
        );
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = recognition;
      setSpokenTranscript(null);
      setSpeechNote(null);
      recognition.start();
      setIsListeningMic(true);
    } catch {
      setIsListeningMic(false);
      setSpeechNote(
        "Microphone access is unavailable. You can still play the audio and mark as practiced."
      );
    }
  };

  const isCurrentPracticed = currentModule
    ? practicedModuleIds.includes(currentModule.id)
    : false;

  const speechMatchPercent =
    spokenTranscript && currentModule
      ? computeSpeechMatchPercent(
          spokenTranscript,
          currentModule.exercise.expectedEnglish
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Free Practice Lab</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sentence &amp; Speaking Practice
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Interactive daily drills
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="px-3.5 py-2 rounded-2xl bg-white border-2 border-slate-200/80 text-xs font-bold text-slate-700 shadow-sm">
            Drills Solved:{" "}
            <span className="text-brand-600 font-black">
              {sessionDrillsCompleted}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border-2 border-slate-200/80 text-xs font-bold text-slate-700 shadow-sm">
            Spoken:{" "}
            <span className="text-emerald-600 font-black">
              {practicedModuleIds.length}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Filters Card */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter className="w-4 h-4 text-brand-600" />
            <span>Filter Practice Drills</span>
          </div>
          {(selectedPart !== "all" || selectedDifficulty !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedPart("all");
                setSelectedDifficulty("all");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Part Selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Lesson Part</p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Part selector"
            >
              {PART_OPTIONS.map((opt) => {
                const isActive = selectedPart === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedPart(opt.value)}
                    aria-pressed={isActive}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Difficulty</p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Difficulty selector"
            >
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isActive = selectedDifficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedDifficulty(opt.value)}
                    aria-pressed={isActive}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-ai-600 text-white border-ai-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-ai-400 hover:bg-ai-50/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Completion Feedback Banner */}
      {lastCompletedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{lastCompletedBanner}</span>
        </div>
      )}

      {/* Drill Toolbar + SentenceBuilderCanvas */}
      {currentModule ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl px-4 py-3.5 sm:px-5 border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-black">
                Drill {currentIndex + 1} of {totalDrills}
              </span>
              {partMeta && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5" />
                  {partMeta.order}. {partMeta.title}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-xs font-bold ${
                  DIFFICULTY_BADGE_MAP[currentModule.difficulty].className
                }`}
              >
                {DIFFICULTY_BADGE_MAP[currentModule.difficulty].label}
              </span>
              <span className="text-xs font-bold text-slate-600 ml-1">
                {currentModule.title}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShuffleDeck}
                className="flex-1 sm:flex-initial justify-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNextRandomDrill}
                className="flex-1 sm:flex-initial justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Random Drill</span>
              </Button>
            </div>
          </div>

          <SentenceBuilderCanvas
            key={`${currentModule.id}-${drillResetSeed}`}
            exercise={currentModule.exercise}
            onComplete={handleDrillComplete}
          />

          {/* Quick Speaking Practice Card */}
          <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-ai-50 border border-ai-100 text-ai-600 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Quick Speaking Practice
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    Listen &amp; speak
                  </p>
                </div>
              </div>

              {isCurrentPracticed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Practiced</span>
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-slate-200/80 mb-5 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Target Sentence
              </p>
              <p className="text-lg sm:text-xl font-black text-slate-900">
                &ldquo;{currentModule.exercise.expectedEnglish}&rdquo;
              </p>
              {state.showHindiHints && (
                <p className="text-sm font-hindi font-semibold text-slate-600">
                  {currentModule.exercise.promptHindi}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handlePlayTargetAudio}
                className="w-full sm:w-auto justify-center gap-2"
              >
                <Volume2
                  className={`w-4 h-4 ${
                    isSpeakingAudio
                      ? "text-brand-600 animate-pulse"
                      : "text-slate-600"
                  }`}
                />
                <span>
                  {isSpeakingAudio
                    ? "Playing Audio..."
                    : `Listen (${state.audioRate}x)`}
                </span>
              </Button>

              <Button
                variant={isListeningMic ? "danger" : "secondary"}
                size="md"
                onClick={handleToggleMicPractice}
                className="w-full sm:w-auto justify-center gap-2"
              >
                {isListeningMic ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Listening... (Tap to Stop)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Read Aloud (Mic)</span>
                  </>
                )}
              </Button>

              <Button
                variant={isCurrentPracticed ? "outline" : "primary"}
                size="md"
                onClick={toggleCurrentPracticed}
                className={`w-full sm:w-auto justify-center gap-2 sm:ml-auto ${
                  isCurrentPracticed
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : ""
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCurrentPracticed ? "Marked Practiced" : "Mark as Practiced"}
                </span>
              </Button>
            </div>

            {(spokenTranscript || speechNote) && (
              <div className="mt-4 p-4 rounded-2xl bg-ai-50/70 border border-ai-100 space-y-1.5">
                {spokenTranscript && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700">
                      You said:{" "}
                      <span className="text-ai-700">
                        &ldquo;{spokenTranscript}&rdquo;
                      </span>
                    </p>
                    {speechMatchPercent !== null && (
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-white border border-ai-200 text-ai-700">
                        {speechMatchPercent}% Match
                      </span>
                    )}
                  </div>
                )}
                {speechNote && (
                  <p className="text-xs font-semibold text-slate-600">
                    {speechNote}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 text-center space-y-3">
          <p className="text-base font-bold text-slate-700">
            No drills match the selected filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPart("all");
              setSelectedDifficulty("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
