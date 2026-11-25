"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Sparkles,
  User,
  Settings,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { useLearnerStore } from "@/lib/learner-store";
import { StreakFlameBadge } from "@/components/dashboard/StreakFlameBadge";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isAI?: boolean;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home,
    isActive: (pathname) =>
      pathname === "/dashboard" ||
      pathname === "/dashboard/lessons" ||
      pathname.startsWith("/dashboard/lessons/"),
  },
  {
    label: "Practice",
    href: "/dashboard/practice",
    icon: BookOpen,
    isActive: (pathname) => pathname === "/dashboard/practice",
  },
  {
    label: "AI",
    href: "/dashboard/ai",
    icon: Sparkles,
    isAI: true,
    isActive: (pathname) => pathname === "/dashboard/ai",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
    isActive: (pathname) => pathname === "/dashboard/profile",
  },
  {
    label: "Setting",
    href: "/dashboard/settings",
    icon: Settings,
    isActive: (pathname) => pathname === "/dashboard/settings",
  },
];

export interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  const { state } = useLearnerStore();

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col overflow-x-clip selection:bg-brand-500/20">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:font-bold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Top Dashboard Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-3d-primary font-black text-base sm:text-xl transition-transform group-hover:scale-[1.03]">
              B
            </div>
            <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight truncate">
              Bol<span className="text-brand-600">English</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 font-bold text-[11px] sm:text-sm select-none shadow-sm whitespace-nowrap"
              title="Total Experience Points"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500 shrink-0" />
              <span>{state.xp} XP</span>
            </div>
            <StreakFlameBadge streak={state.streak} />
          </div>
        </div>
      </header>

      {/* Body: Desktop Sidebar + Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 shrink-0 bg-white border-r border-slate-200/80 sticky top-16 h-[calc(100vh-4rem)]">
          <nav
            aria-label="Dashboard navigation"
            className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-colors duration-150",
                    active
                      ? item.isAI
                        ? "bg-ai-50 text-ai-700 border-ai-500/30 shadow-sm"
                        : "bg-brand-50 text-brand-700 border-brand-200 shadow-sm"
                      : "border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      active
                        ? item.isAI
                          ? "text-ai-600"
                          : "text-brand-600"
                        : item.isAI
                        ? "text-ai-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-100">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Welcome</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8 focus:outline-none"
        >
          <div className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Mobile dashboard navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1 text-[11px] font-bold transition-colors",
                  active
                    ? item.isAI
                      ? "text-ai-600 bg-ai-50/80"
                      : "text-brand-600 bg-brand-50/80"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-0 w-8 h-0.5 rounded-full",
                      item.isAI ? "bg-ai-600" : "bg-brand-600"
                    )}
                  />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    active
                      ? item.isAI
                        ? "text-ai-600"
                        : "text-brand-600"
                      : item.isAI
                      ? "text-ai-500"
                      : "text-slate-400"
                  )}
                />
                <span className="leading-none truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default DashboardShell;
