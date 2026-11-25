"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ALL_MODULES,
  LESSON_PARTS,
  MODULES_BY_PART,
} from "@/lib/curriculum";
import { LearningGoal, useLearnerStore } from "@/lib/learner-store";
import { formatTime } from "@/lib/utils";
import { DifficultyLevel } from "@/types/curriculum";
import { StreakFlameBadge } from "@/components/dashboard/StreakFlameBadge";
import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Compass,
  GraduationCap,
  Layers,
  MessageCircle,
  Mic,
  Phone,
  Plane,
  Target,
  Trophy,
  User,
} from "lucide-react";

const GOAL_OPTIONS: Array<{
  value: LearningGoal;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "Daily Conversation",
    subtitle: "Daily talks",
    icon: MessageCircle,
  },
  {
    value: "Job Interview",
    subtitle: "Interview prep",
    icon: Briefcase,
  },
  {
    value: "IELTS",
    subtitle: "IELTS speaking",
    icon: GraduationCap,
  },
  {
    value: "Travel",
    subtitle: "Trip phrases",
    icon: Plane,
  },
];

interface LevelTier {
  code: string;
  label: string;
  minModules: number;
  maxModules: number;
  description: string;
}

const LEVEL_TIERS: LevelTier[] = [
  {
    code: "A1",
    label: "A1 Beginner",
    minModules: 0,
    maxModules: 19,
    description: "Core foundations",
  },
  {
    code: "A2",
    label: "A2 Elementary",
    minModules: 20,
    maxModules: 39,
    description: "Routine fluency",
  },
  {
    code: "B1",
    label: "B1 Intermediate",
    minModules: 40,
    maxModules: 59,
    description: "Clear expression",
  },
  {
    code: "B2",
    label: "B2 Upper-Intermediate",
    minModules: 60,
    maxModules: 80,
    description: "Confident fluency",
  },
];

const PART_ACCENT_COLORS: Record<
  string,
  { bar: string; badge: string; text: string }
> = {
  tenses: {
    bar: "bg-brand-600",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    text: "text-brand-600",
  },
  grammar: {
    bar: "bg-ai-600",
    badge: "bg-ai-50 text-ai-700 border-ai-200",
    text: "text-ai-600",
  },
  vocabulary: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-600",
  },
  phrases: {
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-600",
  },
};

const DIFFICULTY_META: Array<{
  key: DifficultyLevel;
  label: string;
  subtitle: string;
  barClass: string;
  badgeClass: string;
}> = [
  {
    key: "easy",
    label: "1. Easy",
    subtitle: "Basic patterns",
    barClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "medium",
    label: "2. Medium",
    subtitle: "Daily fluency",
    barClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "hard",
    label: "3. Hard",
    subtitle: "Advanced usage",
    barClass: "bg-ai-600",
    badgeClass: "bg-ai-50 text-ai-700 border-ai-200",
  },
];

function getLevelInfo(completedCount: number) {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (completedCount >= LEVEL_TIERS[i].minModules) {
      const current = LEVEL_TIERS[i];
      const next = LEVEL_TIERS[i + 1] ?? null;
      return { current, next, tierIndex: i };
    }
  }
  return { current: LEVEL_TIERS[0], next: LEVEL_TIERS[1], tierIndex: 0 };
}

export default function ProfilePage() {
  const { state, isLoaded, updateSettings } = useLearnerStore();
  const [nameInput, setNameInput] = useState(state.learnerName);
  const [nameSavedBadge, setNameSavedBadge] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setNameInput(state.learnerName);
    }
  }, [isLoaded, state.learnerName]);

  const completedSet = useMemo(
    () => new Set(state.completedModuleIds),
    [state.completedModuleIds]
  );

  const completedCount = completedSet.size;
  const totalModulesCount = ALL_MODULES.length;
  const levelInfo = useMemo(
    () => getLevelInfo(completedCount),
    [completedCount]
  );

  const partProgressList = useMemo(() => {
    return LESSON_PARTS.map((part) => {
      const partModules = MODULES_BY_PART[part.id];
      const completed = partModules.filter((m) =>
        completedSet.has(m.id)
      ).length;
      const total = partModules.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        part,
        completed,
        total,
        percent,
      };
    });
  }, [completedSet]);

  const difficultyBreakdown = useMemo(() => {
    return DIFFICULTY_META.map((meta) => {
      const matching = ALL_MODULES.filter((m) => m.difficulty === meta.key);
      const completed = matching.filter((m) => completedSet.has(m.id)).length;
      const total = matching.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...meta,
        completed,
        total,
        percent,
      };
    });
  }, [completedSet]);

  const displayName = nameInput.trim() || state.learnerName.trim() || "Learner";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "L";

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    setNameSavedBadge(false);
    if (val.trim().length > 0) {
      updateSettings({ learnerName: val });
    }
  };

  const commitNameSave = () => {
    const cleaned = nameInput.trim() || "Learner";
    setNameInput(cleaned);
    updateSettings({ learnerName: cleaned });
    setNameSavedBadge(true);
    setTimeout(() => setNameSavedBadge(false), 2000);
  };

  const handleNameFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitNameSave();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold mb-2">
          <User className="w-3.5 h-3.5" />
          <span>Learner Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Your Profile
        </h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">
          Progress &amp; goals
        </p>
      </div>

      {/* Identity & Key Metrics Card */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
            {/* Avatar Initial */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-brand-600 text-white shadow-3d-primary flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 select-none"
              aria-label={`Avatar initial ${avatarInitial}`}
            >
              {avatarInitial}
            </div>

            {/* Editable Name Form */}
            <form onSubmit={handleNameFormSubmit} className="space-y-2 flex-1 min-w-0">
              <label
                htmlFor="learner-name-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Learner Name
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  id="learner-name-input"
                  type="text"
                  value={nameInput}
                  onChange={handleNameChange}
                  onBlur={commitNameSave}
                  maxLength={40}
                  placeholder="Enter your name"
                  className="w-full sm:w-64 min-w-0 px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 font-bold text-sm focus-visible:outline-none focus-visible:border-brand-500 focus:bg-white transition-colors"
                />
                <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto justify-center">
                  Save Name
                </Button>
                {nameSavedBadge && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Streak + XP + Level Quick Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Streak
              </span>
              <div className="mt-1">
                <StreakFlameBadge streak={state.streak} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                Total XP
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-brand-900 font-black text-lg">
                <Trophy className="w-5 h-5 text-brand-600 shrink-0" />
                <span>{state.xp} XP</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-ai-50/80 border border-ai-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ai-700">
                Estimated Level
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-ai-700 font-black text-sm">
                <Award className="w-4 h-4 shrink-0" />
                <span>{levelInfo.current.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated CEFR Level Progression (A1 Beginner -> B2 Upper-Intermediate) */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-ai-600" />
                <h2 className="text-sm font-black text-slate-900">
                  Estimated Proficiency: {levelInfo.current.label}
                </h2>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                {levelInfo.current.description}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
              {completedCount} / {totalModulesCount} Modules Completed
            </span>
          </div>

          {/* 4-tier roadmap */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {LEVEL_TIERS.map((tier, idx) => {
              const isCurrent = idx === levelInfo.tierIndex;
              const isUnlocked = completedCount >= tier.minModules;
              return (
                <div
                  key={tier.code}
                  className={`p-3 rounded-xl border-2 transition-[border-color,background-color] duration-150 ${
                    isCurrent
                      ? "bg-white border-ai-500 shadow-sm"
                      : isUnlocked
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-white/60 border-slate-200/80 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-black ${
                        isCurrent
                          ? "text-ai-700"
                          : isUnlocked
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {tier.label}
                    </span>
                    {isUnlocked && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          isCurrent ? "text-ai-600" : "text-emerald-600"
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {tier.minModules}–{tier.maxModules} modules
                  </p>
                </div>
              );
            })}
          </div>

          {levelInfo.next && (
            <p className="text-xs font-semibold text-slate-500">
              Next:{" "}
              <span className="font-bold text-ai-700">
                {levelInfo.next.label}
              </span>
            </p>
          )}
        </div>
      </section>

      {/* Learning Goal Selector */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">Learning Goal</h2>
            <p className="text-xs text-slate-500 font-semibold">
              Choose your focus
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {GOAL_OPTIONS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = state.learnerGoal === goal.value;
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => updateSettings({ learnerGoal: goal.value })}
                aria-pressed={isSelected}
                className={`p-4 rounded-2xl border-2 text-left transition-[border-color,background-color,box-shadow] duration-150 cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? "bg-brand-50/70 border-brand-600 shadow-sm"
                    : "bg-slate-50/70 border-slate-200 hover:border-brand-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                  )}
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900">
                    {goal.value}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                    {goal.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Speaking Practice & Voice Call Stats */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-indigo-100 shadow-lg shadow-indigo-100/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-ai-600 text-white shadow-3d-ai flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Speaking Practice with AI
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Voice call stats
              </p>
            </div>
          </div>

          <Link href="/dashboard/ai?mode=call" className="w-full sm:w-auto shrink-0">
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_0_0_#047857]"
            >
              <Phone className="w-4 h-4" />
              <span>Talk with AI Now</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              AI Call Time
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatTime(state.aiCallSeconds)}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Call duration
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Voice Sessions
            </span>
            <p className="text-2xl font-black text-ai-700 mt-1">
              {state.aiCallSessions} Calls
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {state.aiTurnsSpoken} turns
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Voice Accent
            </span>
            <p className="text-base font-black text-brand-700 mt-1">
              {state.voiceAccent === "en-IN"
                ? "🇮🇳 Indian English"
                : state.voiceAccent === "en-GB"
                ? "🇬🇧 UK English"
                : "🇺🇸 US English"}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {state.autoCallMode ? "Hands-free call" : "Manual mic"}
            </p>
          </div>
        </div>
      </section>

      {/* 4 Lesson Parts Progress & Difficulty Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4 Lesson Parts Progress */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-7 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-black text-slate-900">
                4 Lesson Parts Progress
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              20 Modules Each
            </span>
          </div>

          <div className="space-y-4">
            {partProgressList.map(({ part, completed, total, percent }) => {
              const colors = PART_ACCENT_COLORS[part.id] ?? {
                bar: "bg-brand-600",
                badge: "bg-brand-50 text-brand-700 border-brand-200",
                text: "text-brand-600",
              };
              return (
                <div
                  key={part.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {part.order}. {part.title}
                      </h3>
                      <p className="text-xs font-hindi text-slate-500">
                        {part.titleHindi}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 ${colors.badge}`}
                    >
                      {completed} / {total} Modules
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} rounded-full transition-[width] duration-300`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Difficulty Breakdown */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-7 border-2 border-slate-100 shadow-lg shadow-slate-100/50 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-ai-600" />
              <h2 className="text-lg font-black text-slate-900">
                Difficulty Breakdown
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {totalModulesCount} Total Modules
            </span>
          </div>

          <div className="space-y-4">
            {difficultyBreakdown.map((item) => {
              const difficultyName =
                item.key.charAt(0).toUpperCase() + item.key.slice(1);
              return (
                <div
                  key={item.key}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 ${item.badgeClass}`}
                    >
                      {item.completed} / {item.total} {difficultyName}
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barClass} rounded-full transition-[width] duration-300`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
