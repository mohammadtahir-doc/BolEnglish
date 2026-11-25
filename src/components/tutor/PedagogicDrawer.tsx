"use client";

import React from "react";
import { PedagogicCorrection, LexicalUpgrade } from "@/types/tutor";
import { Sparkles, CheckCircle2, ArrowRight, Volume2, Lightbulb } from "lucide-react";

interface PedagogicDrawerProps {
  corrections: PedagogicCorrection[];
  lexicalUpgrade?: LexicalUpgrade;
  onPracticeClick?: (prompt: string) => void;
}

export const PedagogicDrawer: React.FC<PedagogicDrawerProps> = ({
  corrections,
  lexicalUpgrade,
  onPracticeClick,
}) => {
  if (corrections.length === 0 && !lexicalUpgrade) return null;

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-indigo-100 shadow-xl shadow-indigo-100/50 p-4 sm:p-6 md:p-7 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-indigo-50">
        <div className="w-8 h-8 rounded-xl bg-ai-50 flex items-center justify-center text-ai-600 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-ai-700">
          Smart Pedagogical Feedback (AI सुझाव)
        </h4>
      </div>

      {/* Corrections List */}
      <div className="space-y-4">
        {corrections.map((corr, idx) => (
          <div key={idx} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {/* Before vs After */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-semibold line-through break-words">
                {corr.userOriginalSegment}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1 break-words">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {corr.grammaticallyCorrect}
              </span>
              {corr.naturalNativePhrasing && corr.naturalNativePhrasing !== corr.grammaticallyCorrect && (
                <span className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium break-words">
                  Natural: &ldquo;{corr.naturalNativePhrasing}&rdquo;
                </span>
              )}
            </div>

            {/* English & Hindi Explanation */}
            <p className="text-xs text-slate-700 font-medium mb-1.5 break-words">{corr.explanationEn}</p>
            <p className="text-xs text-amber-900 bg-amber-500/10 p-2 rounded-xl font-hindi border border-amber-500/20 break-words">
              💡 {corr.explanationHi}
            </p>

            {/* Practice Repeat Prompt */}
            {corr.practicePrompt && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-brand-700 break-words min-w-0">
                  {corr.practicePrompt}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => speakText(corr.practicePrompt.replace(/Try saying: /i, ""))}
                    className="p-2 sm:p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-brand-600"
                    title="Listen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {onPracticeClick && (
                    <button
                      onClick={() => onPracticeClick(corr.practicePrompt)}
                      className="text-xs font-bold px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200"
                    >
                      Practice
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Lexical Upgrade */}
        {lexicalUpgrade && (
          <div className="p-3.5 rounded-2xl bg-ai-50/70 border border-ai-200 flex items-start gap-2.5 text-xs">
            <Lightbulb className="w-4 h-4 text-ai-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-ai-900 block break-words">
                Vocabulary Boost: &ldquo;{lexicalUpgrade.learnerWord}&rdquo; ➔ &ldquo;{lexicalUpgrade.upgradedWord}&rdquo;
              </span>
              <p className="text-slate-600 mt-0.5 break-words">&ldquo;{lexicalUpgrade.contextSentence}&rdquo;</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
