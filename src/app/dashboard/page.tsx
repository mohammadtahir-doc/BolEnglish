"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ALL_MODULES,
  LESSON_PARTS,
  MODULES_BY_PART,
} from "@/lib/curriculum";
import { useLearnerStore } from "@/lib/learner-store";
import { formatTime } from "@/lib/utils";
import { LessonPartId } from "@/types/curriculum";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Clock,
  Coffee,
  Flame,
  MessageSquareQuote,
  Mic,
  Phone,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

interface PartVisualStyle {
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  numberBadge: string;
  progressFill: string;
  cardAccent: string;
  ctaText: string;
}

const PART_STYLES: Record<LessonPartId, PartVisualStyle> = {
  tenses: {
    icon: Clock,
    badgeBg: "bg-brand-50 text-brand-700 border-brand-200",
    numberBadge: "bg-brand-600 text-white shadow-3d-primary",
    progressFill: "from-brand-600 to-teal-400",
    cardAccent: "hover:border-brand-300",
    ctaText: "text-brand-700",
  },
  grammar: {
    icon: BookOpen,
    badgeBg: "bg-ai-50 text-ai-700 border-indigo-200",
    numberBadge: "bg-ai-600 text-white shadow-3d-ai",
    progressFill: "from-ai-600 to-indigo-400",
    cardAccent: "hover:border-indigo-300",
    ctaText: "text-ai-700",
  },
  vocabulary: {
    icon: Sparkles,
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    numberBadge: "bg-streak-500 text-slate-900 shadow-3d-streak",
    progressFill: "from-amber-500 to-yellow-400",
    cardAccent: "hover:border-amber-300",
    ctaText: "text-amber-700",
  },
  phrases: {
    icon: MessageSquareQuote,
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    numberBadge: "bg-emerald-600 text-white shadow-[0_4px_0_0_#047857]",
    progressFill: "from-emerald-600 to-emerald-400",
    cardAccent: "hover:border-emerald-300",
    ctaText: "text-emerald-700",
  },
};

export default function DashboardHomePage() {
  const { state, isLoaded } = useLearnerStore();

  const totalModules = ALL_MODULES.length;
  const completedSet = useMemo(
    () => new Set(state.completedModuleIds),
    [state.completedModuleIds]
  );

  const completedTotal = useMemo(
    () => ALL_MODULES.filter((mod) => completedSet.has(mod.id)).length,
    [completedSet]
  );

  const overallPercent =
    totalModules > 0 ? Math.round((completedTotal / totalModules) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-900 to-brand-800 text-white p-4 sm:p-6 md:p-8 shadow-xl">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-brand-400/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-14 w-48 h-48 rounded-full bg-ai-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-teal-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Goal: {state.learnerGoal}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight break-words">
              Namaste, {isLoaded ? state.learnerName : "Learner"}!
            </h1>
            <p className="text-sm md:text-base text-teal-100/90 font-semibold">
              Speak with confidence
            </p>
          </div>

          {/* Stats Pills */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-2 sm:px-4 py-2.5 sm:py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-300 mb-1">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-100 truncate">
                  Total XP
                </span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-black">{state.xp}</p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-2 sm:px-4 py-2.5 sm:py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-300 mb-1">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-100 truncate">
                  Modules
                </span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-black">
                {completedTotal}
                <span className="text-xs sm:text-sm font-bold text-teal-200/80">
                  {" "}
                  / {totalModules}
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-2 sm:px-4 py-2.5 sm:py-3 text-center">
              <div className="flex items-center justify-center gap-1 text-orange-300 mb-1">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-orange-400 text-orange-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-100 truncate">
                  Streak
                </span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-black">
                {state.streak}
                <span className="text-xs font-bold text-teal-200/80 ml-0.5 sm:ml-1">
                  d
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Overall Course Progress */}
        <div className="relative mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/15">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-teal-100 mb-2">
            <span>Overall Curriculum Progress</span>
            <span>
              {completedTotal} / {totalModules} modules ({overallPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-teal-300 to-emerald-300 transition-[width] duration-500"
              style={{ width: `${Math.max(overallPercent, 2)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Speaking Practice with AI — Talk Like Another Person */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-7 border-2 border-indigo-100 shadow-lg shadow-indigo-100/40 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-ai-600 text-white shadow-3d-ai flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ai-50 border border-ai-200 text-ai-700 text-[11px] font-bold mb-1">
                <span>Live Voice Call Mode</span>
                <span>•</span>
                <span>{formatTime(state.aiCallSeconds)} spoken</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Speaking Practice with AI
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                Live voice call
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/ai?mode=call"
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold shadow-[0_4px_0_0_#047857] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 shrink-0"
          >
            <Phone className="w-4 h-4" />
            <span>Start Voice Call</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
          <Link
            href="/dashboard/ai?mode=call&scenario=CASUAL_CHAT"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-brand-50/60 border border-slate-200 hover:border-brand-300 transition-colors duration-150 flex items-center gap-2.5"
          >
            <Mic className="w-4 h-4 text-brand-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">Casual Call</p>
              <p className="text-[11px] text-slate-500 truncate">Friendly chat</p>
            </div>
          </Link>

          <Link
            href="/dashboard/ai?mode=call&scenario=DAILY_ROUTINE"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition-colors duration-150 flex items-center gap-2.5"
          >
            <Sun className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">Daily Routine</p>
              <p className="text-[11px] text-slate-500 truncate">Day &amp; habits</p>
            </div>
          </Link>

          <Link
            href="/dashboard/ai?mode=call&scenario=JOB_INTERVIEW"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-ai-50/60 border border-slate-200 hover:border-indigo-300 transition-colors duration-150 flex items-center gap-2.5"
          >
            <Briefcase className="w-4 h-4 text-ai-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">Job Interview</p>
              <p className="text-[11px] text-slate-500 truncate">HR call practice</p>
            </div>
          </Link>

          <Link
            href="/dashboard/ai?mode=call&scenario=CAFE_TRAVEL"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition-colors duration-150 flex items-center gap-2.5"
          >
            <Coffee className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">Cafe &amp; Travel</p>
              <p className="text-[11px] text-slate-500 truncate">Real-life roleplay</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 4 Lesson Parts */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              4-Part Learning Path
            </h2>
            <p className="text-sm text-slate-500 font-semibold">
              20 modules each
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            4 Parts • 80 Interactive Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LESSON_PARTS.map((part) => {
            const style = PART_STYLES[part.id];
            const Icon = style.icon;
            const partModules = MODULES_BY_PART[part.id];
            const completedInPart = partModules.filter((m) =>
              completedSet.has(m.id)
            ).length;
            const pct =
              part.moduleCount > 0
                ? Math.round((completedInPart / part.moduleCount) * 100)
                : 0;

            return (
              <Link
                key={part.id}
                href={`/dashboard/lessons/${part.id}`}
                className={`group flex flex-col justify-between bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-100 shadow-lg shadow-slate-100/60 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-xl ${style.cardAccent}`}
              >
                <div>
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${style.numberBadge}`}
                      >
                        {part.order}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                          {part.order}. {part.title}
                        </h3>
                        <p className="text-sm font-bold text-slate-500 font-hindi">
                          {part.titleHindi}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${style.badgeBg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Difficulty Tag */}
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Easy • Medium • Hard
                    </span>
                  </div>
                </div>

                {/* Progress & Action Footer */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-500">Part Progress</span>
                      <span className="text-slate-800">
                        {completedInPart} / {part.moduleCount} modules
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${style.progressFill} transition-[width] duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between text-sm font-extrabold ${style.ctaText}`}
                  >
                    <span>
                      {completedInPart > 0 ? "Continue Learning" : "Start Part"}{" "}
                      ({part.moduleCount} modules)
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick CTA Strip: Practice & AI Tutor */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/practice"
          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-4 sm:p-5 border-2 border-slate-100 shadow-md shadow-slate-100/60 hover:border-brand-300 hover:-translate-y-0.5 transition-[transform,border-color,box-shadow] duration-200"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                Daily Drill
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Practice Arena
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Quick mixed drills
              </p>
            </div>
          </div>
          <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-3d-primary group-hover:bg-brand-500 transition-colors shrink-0">
            Practice <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/dashboard/ai"
          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-4 sm:p-5 border-2 border-slate-100 shadow-md shadow-slate-100/60 hover:border-indigo-300 hover:-translate-y-0.5 transition-[transform,border-color,box-shadow] duration-200"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-ai-50 border border-indigo-200 text-ai-600 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ai-600">
                Live Speaking
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                AI Voice Tutor
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Live voice coaching
              </p>
            </div>
          </div>
          <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-ai-600 text-white text-xs font-bold shadow-3d-ai group-hover:bg-ai-500 transition-colors shrink-0">
            AI Tutor <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </section>
    </div>
  );
}
