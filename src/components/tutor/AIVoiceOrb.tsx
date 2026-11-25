"use client";

import React from "react";
import { Mic } from "lucide-react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

interface AIVoiceOrbProps {
  state: OrbState;
  onClick?: () => void;
  disabled?: boolean;
}

export const AIVoiceOrb: React.FC<AIVoiceOrbProps> = ({
  state,
  onClick,
  disabled = false,
}) => {
  const isInteractive = Boolean(onClick) && !disabled;

  const coreClasses = `w-32 h-32 sm:w-36 sm:h-36 rounded-full relative z-10 flex flex-col items-center justify-center gap-1.5 shadow-2xl transition-[transform,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/70 focus-visible:ring-offset-4 ${
    isInteractive ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"
  } ${
    state === "listening"
      ? "bg-gradient-to-tr from-red-500 via-rose-500 to-amber-500 scale-110 shadow-red-500/40 ring-4 ring-red-200"
      : state === "thinking"
      ? "bg-gradient-to-tr from-ai-700 via-indigo-500 to-purple-400 scale-105 shadow-ai-500/50"
      : state === "speaking"
      ? "bg-gradient-to-tr from-emerald-600 via-brand-500 to-teal-300 scale-110 shadow-emerald-500/50"
      : "bg-gradient-to-tr from-ai-600 via-brand-500 to-indigo-400 scale-100 shadow-ai-500/30"
  }`;

  const label =
    state === "listening"
      ? "Listening"
      : state === "thinking"
      ? "Thinking..."
      : state === "speaking"
      ? "Speaking"
      : "Ready";

  const content = (
    <>
      {state === "idle" && <Mic className="w-6 h-6 text-white/95" />}
      <span className="text-white text-xs font-black tracking-widest uppercase opacity-95 select-none">
        {label}
      </span>
    </>
  );

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center my-2 sm:my-4">
      {/* Outer Glow Halo */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-2 rounded-full blur-2xl transition-[transform,opacity] duration-700 ${
          state === "listening"
            ? "bg-red-400/40 scale-125 animate-pulse"
            : state === "thinking"
            ? "bg-ai-500/40 scale-110"
            : state === "speaking"
            ? "bg-emerald-400/50 scale-125 animate-pulse"
            : "bg-ai-400/20 scale-100"
        }`}
      />

      {/* Ripple Rings for Speaking / Listening */}
      {(state === "listening" || state === "speaking") && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-full border-2 animate-ping ${
              state === "listening" ? "border-red-400/40" : "border-brand-400/40"
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-3 rounded-full border animate-pulse ${
              state === "listening" ? "border-red-300/30" : "border-brand-300/25"
            }`}
          />
        </>
      )}

      {/* Orbiting Particles for Thinking */}
      {state === "thinking" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 animate-spin"
          style={{ animationDuration: "2s" }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-ai-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-lg shadow-ai-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-400 absolute bottom-0 left-1/2 -translate-x-1/2 shadow-md shadow-brand-400" />
        </div>
      )}

      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={
            state === "idle"
              ? "Ready, tap to speak"
              : state === "listening"
              ? "Listening, tap to stop"
              : state === "speaking"
              ? "Speaking, tap to stop"
              : "Thinking"
          }
          className={coreClasses}
        >
          {content}
        </button>
      ) : (
        <div className={coreClasses}>{content}</div>
      )}
    </div>
  );
};
