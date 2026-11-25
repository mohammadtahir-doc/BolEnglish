"use client";

import React, { useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { MicErrorBanner } from "@/components/tutor/MicErrorBanner";

interface PushToTalkButtonProps {
  onSpeechEnd: (transcript: string) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
  lang?: string;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  onSpeechEnd,
  onListeningChange,
  disabled = false,
  lang = "en-IN",
}) => {
  const {
    isListening,
    isTranscribing,
    liveTranscript,
    micError,
    toggleListening,
  } = useVoiceCapture({
    lang,
    disabled,
    onTranscript: (transcript) => onSpeechEnd(transcript),
  });

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || isTranscribing}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop speaking" : "Tap to speak"}
        className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 cursor-pointer shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? "bg-red-500 text-white scale-110 shadow-red-500/50 animate-pulse ring-4 ring-red-300"
            : "bg-brand-600 text-white shadow-3d-primary hover:bg-brand-500 hover:scale-105 active:scale-95"
        }`}
      >
        {isTranscribing ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : isListening ? (
          <Square className="w-7 h-7 fill-white" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>

      <span className="text-xs font-bold text-slate-600">
        {isTranscribing
          ? "Processing speech..."
          : isListening
          ? "Listening... stops automatically"
          : "Tap to Speak"}
      </span>

      {liveTranscript && (
        <p className="text-xs font-bold text-brand-700 max-w-sm text-center">
          &ldquo;{liveTranscript}&rdquo;
        </p>
      )}

      <MicErrorBanner error={micError} />
    </div>
  );
};
