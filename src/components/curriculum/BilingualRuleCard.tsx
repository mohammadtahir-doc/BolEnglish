"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { GrammarLesson } from "@/types/curriculum";

interface BilingualRuleCardProps {
  lesson: GrammarLesson;
}

export const BilingualRuleCard: React.FC<BilingualRuleCardProps> = ({ lesson }) => {
  const [showHindi, setShowHindi] = useState(true);

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
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50 mb-8 transition-shadow duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
              Level {lesson.level} Rule
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{lesson.title}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHindi(!showHindi)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <span>🇮🇳 {showHindi ? "हिंदी छुपाएं" : "हिंदी में समझें"}</span>
          {showHindi ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* English Rule */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
        <p className="text-slate-800 font-medium leading-relaxed">{lesson.conceptRuleEn}</p>
      </div>

      {/* Hindi Rule Accordion */}
      {showHindi && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 mb-6 font-hindi leading-relaxed">
          <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5 text-sm">
            <span>💡 आसान हिंदी नियम:</span>
          </p>
          <p className="text-sm md:text-base text-slate-800">{lesson.conceptRuleHi}</p>
        </div>
      )}

      {/* Common Mistake Alert */}
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 mb-6">
        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider mb-2">
          <AlertCircle className="w-4 h-4" />
          <span>अक्सर होने वाली गलती (Common Mistake):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-red-200 text-red-700">
            <XCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
            <div>
              <span className="font-bold block">गलत:</span>
              <span className="line-through">{lesson.commonMistake.wrong}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white p-3 rounded-xl border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
            <div>
              <span className="font-bold block">सही:</span>
              <span>{lesson.commonMistake.right}</span>
            </div>
          </div>
        </div>
        {showHindi && (
          <p className="text-xs text-slate-600 mt-2 font-hindi leading-normal">
            कारण: {lesson.commonMistake.reasonHi}
          </p>
        )}
      </div>

      {/* Conversational Examples */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          दैनिक बातचीत के उदाहरण (Everyday Examples):
        </h4>
        <div className="space-y-2.5">
          {lesson.examples.map((ex, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div>
                <p className="font-semibold text-slate-900 text-sm md:text-base">{ex.en}</p>
                {showHindi && <p className="text-xs text-slate-500 font-hindi mt-0.5">{ex.hi}</p>}
              </div>
              <button
                type="button"
                onClick={() => speakText(ex.en)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors duration-150 shrink-0"
                title="Listen Pronunciation"
                aria-label={`Listen pronunciation: ${ex.en}`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
