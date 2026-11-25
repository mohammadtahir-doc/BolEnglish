"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StreakFlameBadge } from "@/components/dashboard/StreakFlameBadge";

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Welcome" },
    { href: "/home", label: "Explore" },
    { href: "/learn/grammar/past-tense-did", label: "Lesson" },
    { href: "/tutor", label: "AI Tutor" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-3d-primary font-black text-xl">
            B
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight">
            Bol<span className="text-brand-600">English</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:block">
            <StreakFlameBadge streak={7} />
          </div>
          <Link href="/learn/grammar/past-tense-did">
            <Button variant="primary" size="sm">
              Start Lesson
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
