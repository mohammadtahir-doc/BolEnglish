import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function WelcomePage() {
  return (
    <main
      className="min-h-dvh bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 py-10 sm:py-12 selection:bg-brand-500/20"
      style={{ backgroundImage: "url('/images/welcome-bg.png')" }}
    >
      <div className="w-full max-w-xl text-center flex flex-col items-center">
        {/* BolEnglish Emblem */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-brand-600 text-white shadow-3d-primary flex items-center justify-center font-black text-3xl sm:text-4xl mb-5 sm:mb-7">
          B
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-7 sm:mb-9 drop-shadow-[0_2px_12px_rgba(255,255,255,0.95)]">
          Welcome to <span className="text-brand-600">BolEnglish</span>
        </h1>

        {/* Single Primary CTA */}
        <Link href="/dashboard" className="w-full max-w-xs sm:w-auto">
          <Button variant="primary" size="lg" className="w-full sm:w-auto justify-center gap-2.5 text-base px-8">
            Enter Dashboard <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
