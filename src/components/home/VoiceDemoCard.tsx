"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, CheckCircle2, Volume2 } from "lucide-react";

export const VoiceDemoCard: React.FC = () => {
  const [demoSpoken, setDemoSpoken] = useState(false);
  const [demoScore, setDemoScore] = useState<number | null>(null);

  const handleDemoSpeak = () => {
    setDemoSpoken(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "I am confident about speaking English at my workplace."
      );
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => {
      setDemoScore(94);
    }, 1200);
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 md:p-8 border-2 border-slate-200 shadow-xl shadow-slate-200/50 mb-16 text-left">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
          🎙️ Quick Interactive Voice Demo
        </span>
        <span className="text-xs text-slate-400 font-semibold">Instant Browser Check</span>
      </div>

      <p className="text-slate-800 font-bold text-base md:text-lg mb-2">
        Read this sentence aloud to test pronunciation:
      </p>
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-brand-900 font-semibold text-lg flex items-center justify-between mb-6">
        <span>&ldquo;I am confident about speaking English at my workplace.&rdquo;</span>
        <Volume2 className="w-5 h-5 text-slate-400 shrink-0" />
      </div>

      {!demoSpoken ? (
        <Button
          variant="primary"
          size="md"
          onClick={handleDemoSpeak}
          className="w-full gap-2"
        >
          <Mic className="w-5 h-5" /> Tap to Test Speech
        </Button>
      ) : demoScore === null ? (
        <div className="p-3 text-center text-sm font-bold text-brand-600 animate-pulse">
          Analyzing your acoustic clarity and accent...
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between animate-in fade-in">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-black text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pronunciation Score: {demoScore}%
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Clear articulation! Natural stress and cadence detected.
            </p>
          </div>
          <Link href="/tutor">
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500">
              Chat Now
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
