"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LearnerState, useLearnerStore } from "@/lib/learner-store";
import { CallScenario, TutorPersona, VoiceAccent } from "@/types/tutor";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Globe,
  Languages,
  Mic,
  Phone,
  RotateCcw,
  Settings as SettingsIcon,
  Volume2,
} from "lucide-react";

const AUDIO_RATE_OPTIONS: Array<{
  value: 0.75 | 1;
  label: string;
  subtitle: string;
}> = [
  { value: 0.75, label: "0.75x Slow", subtitle: "Clearer pace" },
  { value: 1, label: "1.0x Normal", subtitle: "Natural pace" },
];

const PERSONA_OPTIONS: Array<{
  value: TutorPersona;
  title: string;
  subtitle: string;
}> = [
  {
    value: "POOJA_FRIENDLY",
    title: "Pooja (Friendly)",
    subtitle: "Warm & encouraging",
  },
  {
    value: "KAPOOR_STRICT",
    title: "Mr. Kapoor (Strict)",
    subtitle: "Grammar precision",
  },
  {
    value: "HR_INTERVIEW",
    title: "HR Interview Coach",
    subtitle: "Job interview prep",
  },
  {
    value: "IELTS_EXAMINER",
    title: "IELTS Examiner",
    subtitle: "Band 9 rubric",
  },
];

const VOICE_ACCENT_OPTIONS: Array<{
  value: VoiceAccent;
  label: string;
  subtitle: string;
}> = [
  { value: "en-IN", label: "🇮🇳 Indian English", subtitle: "Local clarity" },
  { value: "en-US", label: "🇺🇸 US English", subtitle: "US accent" },
  { value: "en-GB", label: "🇬🇧 UK English", subtitle: "UK accent" },
];

const CALL_SCENARIO_OPTIONS: Array<{
  value: CallScenario;
  label: string;
  subtitle: string;
}> = [
  { value: "CASUAL_CHAT", label: "Casual Call", subtitle: "Friendly chat" },
  { value: "DAILY_ROUTINE", label: "Daily Routine", subtitle: "Daily habits" },
  { value: "JOB_INTERVIEW", label: "Job Interview", subtitle: "HR call prep" },
  { value: "CAFE_TRAVEL", label: "Cafe & Travel", subtitle: "Travel roleplay" },
];

const DAILY_GOAL_OPTIONS: Array<{
  value: 10 | 15 | 30;
  label: string;
  subtitle: string;
}> = [
  { value: 10, label: "10 min", subtitle: "Quick habit" },
  { value: 15, label: "15 min", subtitle: "Steady growth" },
  { value: 30, label: "30 min", subtitle: "Fast track" },
];

export default function SettingsPage() {
  const { state, updateSettings, resetProgress } = useLearnerStore();
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const triggerSavedIndicator = () => {
    setSavedNotice(true);
    setResetSuccess(false);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = setTimeout(() => {
      setSavedNotice(false);
    }, 2500);
  };

  const handleUpdateSetting = (partial: Partial<LearnerState>) => {
    updateSettings(partial);
    triggerSavedIndicator();
  };

  const handlePreviewAudioRate = (rate: 0.75 | 1) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "I am practicing spoken English every day."
      );
      utterance.lang = state.voiceAccent || "en-IN";
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleConfirmReset = () => {
    resetProgress();
    setConfirmReset(false);
    setResetSuccess(true);
    triggerSavedIndicator();
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-2">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Preferences &amp; controls
          </p>
        </div>

        <div className="self-start sm:self-auto min-h-[36px] flex items-center">
          <div
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-[opacity,transform,background-color,border-color,color] duration-200 ${
              savedNotice
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 opacity-100 scale-100"
                : "bg-white border-slate-200 text-slate-400 opacity-85 scale-95"
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                savedNotice ? "text-emerald-600" : "text-slate-400"
              }`}
            />
            <span>Saved automatically</span>
          </div>
        </div>
      </div>

      {/* 1. Hindi Hints */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Hindi Hints
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Bilingual rule tips
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={state.showHindiHints}
            aria-label="Hindi Hints"
            onClick={() =>
              handleUpdateSetting({ showHindiHints: !state.showHindiHints })
            }
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              state.showHindiHints
                ? "bg-brand-600 border-brand-600"
                : "bg-slate-200 border-slate-200"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                state.showHindiHints ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {/* 2. Audio Speed */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Audio Speed
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Voice playback pace
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePreviewAudioRate(state.audioRate)}
            className="gap-1.5 text-brand-700 hover:bg-brand-50"
          >
            <Volume2 className="w-4 h-4" />
            <span>Preview ({state.audioRate}x)</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUDIO_RATE_OPTIONS.map((opt) => {
            const isSelected = state.audioRate === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleUpdateSetting({ audioRate: opt.value })}
                aria-pressed={isSelected}
                className={`p-4 rounded-2xl border-2 text-left transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-brand-50/70 border-brand-600 shadow-sm"
                    : "bg-slate-50/70 border-slate-200 hover:border-brand-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-black text-sm text-slate-900">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  {opt.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. AI Tutor Partner */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-ai-50 border border-ai-100 text-ai-600 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              AI Tutor Partner
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Choose speaking style
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERSONA_OPTIONS.map((persona) => {
            const isSelected = state.defaultPersona === persona.value;
            return (
              <button
                key={persona.value}
                type="button"
                onClick={() =>
                  handleUpdateSetting({ defaultPersona: persona.value })
                }
                aria-pressed={isSelected}
                className={`p-4 rounded-2xl border-2 text-left transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-ai-50/70 border-ai-600 shadow-sm"
                    : "bg-slate-50/70 border-slate-200 hover:border-ai-400 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-black text-sm text-slate-900">
                    {persona.title}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-ai-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  {persona.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Speaking Practice with AI */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-indigo-100 shadow-lg shadow-indigo-100/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-ai-600 text-white shadow-3d-ai flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900">
                Speaking Practice with AI
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Voice call controls
              </p>
            </div>
          </div>

          <Link href="/dashboard/ai?mode=call" className="w-full sm:w-auto shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-[0_3px_0_0_#047857]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Test Voice Call</span>
            </Button>
          </Link>
        </div>

        {/* Hands-Free Call Switch */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Hands-Free Call Mode
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Auto-listen after AI
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={state.autoCallMode}
            aria-label="Hands-Free Call Mode"
            onClick={() =>
              handleUpdateSetting({ autoCallMode: !state.autoCallMode })
            }
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              state.autoCallMode
                ? "bg-emerald-600 border-emerald-600"
                : "bg-slate-200 border-slate-200"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                state.autoCallMode ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Voice Accent */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span>Voice Accent</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {VOICE_ACCENT_OPTIONS.map((opt) => {
              const isSelected = state.voiceAccent === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleUpdateSetting({ voiceAccent: opt.value })}
                  aria-pressed={isSelected}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-brand-50/70 border-brand-600 shadow-sm"
                      : "bg-slate-50/70 border-slate-200 hover:border-brand-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-slate-900">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {opt.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Default Call Scenario */}
        <div className="space-y-2.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Call Topic
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {CALL_SCENARIO_OPTIONS.map((sc) => {
              const isSelected = state.defaultCallScenario === sc.value;
              return (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() =>
                    handleUpdateSetting({ defaultCallScenario: sc.value })
                  }
                  aria-pressed={isSelected}
                  className={`p-3 rounded-2xl border-2 text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-ai-50/70 border-ai-600 shadow-sm"
                      : "bg-slate-50/70 border-slate-200 hover:border-ai-400 hover:bg-white"
                  }`}
                >
                  <p className="font-black text-xs text-slate-900">{sc.label}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {sc.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Daily Study Goal */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              Daily Study Goal
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Daily target
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DAILY_GOAL_OPTIONS.map((goal) => {
            const isSelected = state.dailyGoalMinutes === goal.value;
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() =>
                  handleUpdateSetting({ dailyGoalMinutes: goal.value })
                }
                aria-pressed={isSelected}
                className={`p-4 rounded-2xl border-2 text-left transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50/70 border-emerald-600 shadow-sm"
                    : "bg-slate-50/70 border-slate-200 hover:border-emerald-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-base text-slate-900">
                    {goal.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {goal.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Danger Zone: Reset Progress */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-red-200/80 shadow-lg shadow-red-100/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Reset Progress
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Clear saved data
              </p>
            </div>
          </div>

          {!confirmReset && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmReset(true);
                setResetSuccess(false);
              }}
              className="gap-2 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {resetSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Progress reset</span>
          </div>
        )}

        {confirmReset && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-bold text-red-800">
              Confirm permanent reset?
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReset}
              >
                Yes, Reset
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
