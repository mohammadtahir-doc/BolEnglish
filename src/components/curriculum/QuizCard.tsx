"use client";

import React, { useState } from "react";
import { QuizQuestion } from "@/types/curriculum";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

interface QuizCardProps {
  quiz: QuizQuestion;
  onNext: () => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, onNext }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selectedId === quiz.correctOptionId;

  const handleSubmit = () => {
    if (!selectedId) return;
    setIsSubmitted(true);
    if (selectedId === quiz.correctOptionId) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50 mb-8 transition-shadow duration-200">
      <div className="mb-5 sm:mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Knowledge Check Quiz
        </span>
        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 mt-1 break-words">
          {quiz.questionEn}
        </h3>
        {quiz.questionHi && (
          <p className="text-sm text-slate-500 font-hindi mt-1 break-words">{quiz.questionHi}</p>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
        {quiz.options.map((option) => {
          let optionStyles =
            "border-2 border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100";

          if (selectedId === option.id) {
            optionStyles = "border-brand-500 bg-brand-50/50 text-brand-900 font-bold";
          }

          if (isSubmitted) {
            if (option.id === quiz.correctOptionId) {
              optionStyles = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
            } else if (selectedId === option.id) {
              optionStyles = "border-red-500 bg-red-50 text-red-900 font-bold";
            } else {
              optionStyles = "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !isSubmitted && setSelectedId(option.id)}
              disabled={isSubmitted}
              className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors duration-150 cursor-pointer ${optionStyles}`}
            >
              <span className="text-sm sm:text-base font-semibold break-words min-w-0">{option.text}</span>
              {isSubmitted && option.id === quiz.correctOptionId && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              {isSubmitted && selectedId === option.id && option.id !== quiz.correctOptionId && (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Feedback & Next Button */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        {!isSubmitted ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!selectedId}
            className="w-full sm:w-auto sm:ml-auto justify-center"
          >
            Submit Answer
          </Button>
        ) : (
          <div className="w-full">
            <div
              className={`p-3.5 sm:p-4 rounded-2xl mb-4 ${
                isCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <p className={`text-sm font-bold break-words ${isCorrect ? "text-emerald-900" : "text-red-900"}`}>
                {isCorrect ? "Correct!" : "Incorrect."} {quiz.explanationEn}
              </p>
              <p className="text-xs text-slate-600 font-hindi mt-1 break-words">{quiz.explanationHi}</p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onNext}
              className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-1.5"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
