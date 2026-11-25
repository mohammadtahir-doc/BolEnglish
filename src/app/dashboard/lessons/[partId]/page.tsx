"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getLessonPart,
  getModulesByPart,
  isLessonPartId,
} from "@/lib/curriculum";
import { DifficultyLevel } from "@/types/curriculum";
import { useLearnerStore } from "@/lib/learner-store";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";

type DifficultyFilter = "all" | DifficultyLevel;

const DIFFICULTY_META: Record<
  DifficultyLevel,
  { label: string; badgeClass: string; activeTabClass: string }
> = {
  easy: {
    label: "1. Easy",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeTabClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  },
  medium: {
    label: "2. Medium",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    activeTabClass: "bg-amber-500 text-slate-900 border-amber-500 shadow-sm",
  },
  hard: {
    label: "3. Hard",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    activeTabClass: "bg-rose-600 text-white border-rose-600 shadow-sm",
  },
};

export default function LessonPartModulesPage() {
  const params = useParams<{ partId?: string | string[] }>();
  const rawPartId = Array.isArray(params?.partId)
    ? params.partId[0]
    : params?.partId ?? "";

  const validPart = isLessonPartId(rawPartId);
  const part = validPart ? getLessonPart(rawPartId) : undefined;

  const { state } = useLearnerStore();
  const [filter, setFilter] = useState<DifficultyFilter>("all");

  const modules = useMemo(
    () => (part ? getModulesByPart(part.id) : []),
    [part]
  );

  const completedSet = useMemo(
    () => new Set(state.completedModuleIds),
    [state.completedModuleIds]
  );

  const completedCount = useMemo(
    () => modules.filter((m) => completedSet.has(m.id)).length,
    [modules, completedSet]
  );

  const counts = useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    for (const m of modules) {
      if (m.difficulty === "easy") easy += 1;
      else if (m.difficulty === "medium") medium += 1;
      else if (m.difficulty === "hard") hard += 1;
    }
    return { all: modules.length, easy, medium, hard };
  }, [modules]);

  const filteredModules = useMemo(() => {
    if (filter === "all") return modules;
    return modules.filter((m) => m.difficulty === filter);
  }, [modules, filter]);

  if (!part) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Lesson Part Not Found
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The curriculum section you requested doesn&apos;t exist. Choose one
            of the 4 core lesson parts from your dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold shadow-3d-primary hover:bg-brand-500 transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent =
    modules.length > 0
      ? Math.round((completedCount / modules.length) * 100)
      : 0;

  const filterTabs: Array<{
    key: DifficultyFilter;
    label: string;
    activeClass: string;
  }> = [
    {
      key: "all",
      label: `All (${counts.all})`,
      activeClass: "bg-slate-900 text-white border-slate-900 shadow-sm",
    },
    {
      key: "easy",
      label: `1. Easy (${counts.easy})`,
      activeClass: DIFFICULTY_META.easy.activeTabClass,
    },
    {
      key: "medium",
      label: `2. Medium (${counts.medium})`,
      activeClass: DIFFICULTY_META.medium.activeTabClass,
    },
    {
      key: "hard",
      label: `3. Hard (${counts.hard})`,
      activeClass: DIFFICULTY_META.hard.activeTabClass,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Part Header Card */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-lg shadow-slate-100/60 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold uppercase tracking-wider">
              Part {part.order} of 4
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              {part.order}. {part.title}
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              {part.moduleCount} interactive modules
            </p>
          </div>

          {/* Progress Counter */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 sm:px-5 py-3.5 sm:py-4 w-full md:w-auto md:min-w-[190px] shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Part Progress
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {completedCount}{" "}
              <span className="text-base font-bold text-slate-400">
                / {modules.length}
              </span>
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {progressPercent}% completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-teal-400 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-bold border transition-colors duration-150 cursor-pointer text-center ${
                  isActive
                    ? tab.activeClass
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Modules List */}
      <section className="space-y-3">
        {filteredModules.map((mod) => {
          const isCompleted = completedSet.has(mod.id);
          const diffMeta = DIFFICULTY_META[mod.difficulty];
          const formattedNum = String(mod.moduleNumber).padStart(2, "0");

          return (
            <div
              key={mod.id}
              className={`bg-white rounded-2xl p-4 md:p-5 border-2 transition-[border-color,background-color,box-shadow] duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isCompleted
                  ? "border-emerald-200/90 bg-emerald-50/15"
                  : "border-slate-100 hover:border-brand-200 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Completion Indicator */}
                <div className="pt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2
                      className="w-6 h-6 text-emerald-600"
                      aria-label="Completed"
                    />
                  ) : (
                    <Circle
                      className="w-6 h-6 text-slate-300"
                      aria-label="Not completed"
                    />
                  )}
                </div>

                {/* Module Details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Module {formattedNum}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${diffMeta.badgeClass}`}
                    >
                      {diffMeta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                      +{mod.xpReward} XP
                    </span>
                  </div>

                  <h2 className="text-base md:text-lg font-black text-slate-900">
                    {mod.title}
                  </h2>
                  <p className="text-xs md:text-sm font-semibold text-slate-500 font-hindi">
                    {mod.titleHindi}
                  </p>
                </div>
              </div>

              {/* Action Link */}
              <div className="shrink-0 sm:pl-4">
                <Link
                  href={`/dashboard/lessons/${part.id}/${mod.id}`}
                  className={`inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold transition-[transform,background-color,border-color] duration-150 ${
                    isCompleted
                      ? "bg-white text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-50"
                      : "bg-brand-600 text-white shadow-3d-primary hover:bg-brand-500 hover:-translate-y-0.5 active:translate-y-0.5"
                  }`}
                >
                  <span>{isCompleted ? "Review" : "Start"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
