"use client";

import React, { useState, useEffect } from "react";
import { SentenceBuilderExercise, WordToken } from "@/types/curriculum";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Eye,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SentenceBuilderCanvasProps {
  exercise: SentenceBuilderExercise;
  onComplete: () => void;
}

interface ErrorDiagnostic {
  title: string;
  messageEn: string;
  messageHi: string;
}

function normalizeSentence(sentence: string): string {
  return sentence.trim().replace(/\s+/g, " ").toLowerCase();
}

function diagnoseSentenceError(
  selectedTokens: WordToken[],
  exercise: SentenceBuilderExercise
): ErrorDiagnostic {
  const distractorIds = new Set(exercise.distractors.map((d) => d.id));
  const pickedDistractor = selectedTokens.find((t) => distractorIds.has(t.id));

  if (pickedDistractor) {
    return {
      title: `Incorrect Word: "${pickedDistractor.text}"`,
      messageEn:
        exercise.hintEn ||
        `With 'did' or 'didn't', always use the base verb (V1) instead of "${pickedDistractor.text}".`,
      messageHi:
        exercise.hintHi ||
        `'did' या 'didn't' के साथ हमेशा verb की 1st form आती है, "${pickedDistractor.text}" नहीं।`,
    };
  }

  const selectedTexts = selectedTokens.map((t) => t.text.toLowerCase());
  const missingTokens = exercise.tokens.filter(
    (t) => !selectedTexts.includes(t.text.toLowerCase())
  );

  if (
    missingTokens.some((t) => t.text.toLowerCase() === "to") &&
    selectedTexts.includes("go")
  ) {
    return {
      title: "Missing Preposition ('to')",
      messageEn:
        "Always use 'to' after 'go' when mentioning a place (e.g., 'go to office').",
      messageHi:
        "'go' के बाद जगह बताने के लिए 'to' लगाना ज़रूरी है (जैसे 'go to office')।",
    };
  }

  if (missingTokens.length > 0 && selectedTokens.length < exercise.tokens.length) {
    return {
      title: `Missing ${missingTokens.length} Word${missingTokens.length > 1 ? "s" : ""}`,
      messageEn:
        exercise.hintEn ||
        "Your sentence is incomplete. Tap the missing word(s) from the bank below.",
      messageHi:
        exercise.hintHi ||
        `वाक्य पूरा करने के लिए ${missingTokens.length} शब्द और जोड़ें।`,
    };
  }

  if (missingTokens.length === 0 && selectedTokens.length === exercise.tokens.length) {
    return {
      title: "Check Word Order",
      messageEn: "All the words are right — just adjust their order!",
      messageHi: "आपने बिल्कुल सही शब्द चुने हैं, बस उनका क्रम (order) सुधारें।",
    };
  }

  return {
    title: "Let's Adjust That",
    messageEn:
      exercise.hintEn || "Review the grammar rule and adjust your word selection.",
    messageHi:
      exercise.hintHi || "नियम को याद करें और शब्दों को फिर से जांचें।",
  };
}

export const SentenceBuilderCanvas: React.FC<SentenceBuilderCanvasProps> = ({
  exercise,
  onComplete,
}) => {
  const [selectedTokens, setSelectedTokens] = useState<WordToken[]>([]);
  const [availableTokens, setAvailableTokens] = useState<WordToken[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [isShaking, setIsShaking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [diagnostic, setDiagnostic] = useState<ErrorDiagnostic | null>(null);

  useEffect(() => {
    const all = [...exercise.tokens, ...exercise.distractors];
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setAvailableTokens(shuffled);
    setSelectedTokens([]);
    setStatus("idle");
    setShowHint(false);
    setAttempts(0);
    setDiagnostic(null);
  }, [exercise]);

  const handleSelectToken = (token: WordToken) => {
    if (status === "correct") return;
    if (status === "incorrect") {
      setStatus("idle");
      setDiagnostic(null);
    }
    setSelectedTokens((prev) => [...prev, token]);
    setAvailableTokens((prev) => prev.filter((t) => t.id !== token.id));
  };

  const handleRemoveToken = (token: WordToken) => {
    if (status === "correct") return;
    if (status === "incorrect") {
      setStatus("idle");
      setDiagnostic(null);
    }
    setSelectedTokens((prev) => prev.filter((t) => t.id !== token.id));
    setAvailableTokens((prev) => [...prev, token]);
  };

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheck = () => {
    const constructed = normalizeSentence(
      selectedTokens.map((t) => t.text).join(" ")
    );
    const validTargets = [
      exercise.expectedEnglish,
      ...(exercise.acceptedAlternatives ?? []),
    ].map(normalizeSentence);

    const isMatch = validTargets.includes(constructed);

    if (isMatch) {
      setStatus("correct");
      setDiagnostic(null);
      speakText(exercise.expectedEnglish);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } else {
      setStatus("incorrect");
      setAttempts((prev) => prev + 1);
      setDiagnostic(diagnoseSentenceError(selectedTokens, exercise));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }
  };

  const handleReset = () => {
    setSelectedTokens([]);
    const all = [...exercise.tokens, ...exercise.distractors];
    setAvailableTokens(all.sort(() => Math.random() - 0.5));
    setStatus("idle");
    setDiagnostic(null);
  };

  const handleRevealAnswer = () => {
    setSelectedTokens(exercise.tokens);
    setAvailableTokens(exercise.distractors);
    setStatus("idle");
    setDiagnostic(null);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50 mb-8 transition-shadow duration-200">
      {/* Exercise Question Prompt */}
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sentence Builder Drill
          </span>
          {(exercise.hintEn || exercise.hintHi) && status !== "correct" && (
            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showHint ? "Hide Hint" : "संकेत (Hint)"}</span>
            </button>
          )}
        </div>
        <div className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-3 mt-1">
          <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-hindi break-words min-w-0">
            {exercise.promptHindi}
          </h3>
          <button
            type="button"
            onClick={() => speakText(exercise.expectedEnglish)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors duration-150 shrink-0 text-xs font-bold cursor-pointer"
            title="Listen to English Audio Hint"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Audio Hint</span>
          </button>
        </div>
      </div>

      {/* Optional Hint Banner */}
      {showHint && status !== "correct" && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          {exercise.hintEn && <p className="font-semibold break-words">{exercise.hintEn}</p>}
          {exercise.hintHi && <p className="font-hindi text-amber-800 break-words">{exercise.hintHi}</p>}
        </div>
      )}

      {/* Assembly Zone / Drop Slots */}
      <div
        className={`min-h-[76px] sm:min-h-[90px] p-3 sm:p-4 rounded-2xl border-2 transition-colors duration-150 flex flex-wrap gap-2 sm:gap-2.5 items-center mb-4 ${
          isShaking ? "animate-wiggle" : ""
        } ${
          status === "correct"
            ? "border-emerald-500 bg-emerald-50/30"
            : status === "incorrect"
            ? "border-red-400 bg-red-50/30"
            : "border-dashed border-slate-300 bg-slate-50/70"
        }`}
      >
        {selectedTokens.length === 0 ? (
          <span className="text-slate-400 text-xs sm:text-sm font-medium select-none mx-auto text-center font-hindi">
            नीचे दिए गए शब्दों पर टैप करके सही क्रम में वाक्य बनाएं...
          </span>
        ) : (
          selectedTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => handleRemoveToken(token)}
              disabled={status === "correct"}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white border-2 border-brand-500 text-brand-900 font-bold text-sm sm:text-base shadow-sm hover:border-red-400 hover:text-red-600 transition-colors duration-150 cursor-pointer disabled:cursor-default disabled:hover:border-brand-500 disabled:hover:text-brand-900"
            >
              {token.text}
            </button>
          ))
        )}
      </div>

      {/* Smart Diagnostic Feedback when Incorrect */}
      {status === "incorrect" && diagnostic && (
        <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 font-black text-sm text-red-700">
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{diagnostic.title}</span>
            </div>
            <span className="text-[11px] font-semibold text-red-500">
              Tap any word above to remove it
            </span>
          </div>
          <p className="text-xs font-medium text-red-800 break-words">{diagnostic.messageEn}</p>
          <p className="text-xs font-hindi text-red-700 mt-1 break-words">{diagnostic.messageHi}</p>
        </div>
      )}

      {/* Available Word Bank (Chips) */}
      <div className="mb-6 sm:mb-8 mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Available Words:
        </h4>
        <div className="flex flex-wrap gap-2 sm:gap-2.5 min-h-[48px]">
          {availableTokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => handleSelectToken(token)}
              disabled={status === "correct"}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold text-sm sm:text-base hover:bg-white hover:border-brand-400 hover:text-brand-700 hover:translate-y-[-1px] active:translate-y-[1px] transition-[transform,border-color,background-color,color] duration-150 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {token.text}
            </button>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={status === "correct"}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          {attempts >= 2 && status !== "correct" && (
            <Button variant="outline" size="sm" onClick={handleRevealAnswer}>
              <Eye className="w-4 h-4 mr-1.5" />
              Show Answer
            </Button>
          )}
        </div>

        {status !== "correct" ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleCheck}
            disabled={selectedTokens.length === 0}
            className="w-full sm:w-auto justify-center"
          >
            {status === "incorrect" ? "Check Again" : "Check Answer"}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={onComplete}
            className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-500"
          >
            Continue <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Feedback Sheet on Success */}
      {status === "correct" && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 font-black text-sm mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>शाबाश! बिल्कुल सही वाक्य!</span>
          </div>
          <p className="text-xs font-medium text-emerald-800">{exercise.explanationEn}</p>
          <p className="text-xs text-emerald-800 font-hindi mt-1">{exercise.explanationHi}</p>
        </div>
      )}
    </div>
  );
};
