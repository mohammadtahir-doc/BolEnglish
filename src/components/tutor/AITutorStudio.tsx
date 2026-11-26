"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  CallScenario,
  TutorPersona,
  TutorMessage,
  PedagogicCorrection,
  LexicalUpgrade,
} from "@/types/tutor";
import { AIVoiceOrb, OrbState } from "@/components/tutor/AIVoiceOrb";
import { PushToTalkButton } from "@/components/tutor/PushToTalkButton";
import { PedagogicDrawer } from "@/components/tutor/PedagogicDrawer";
import { MicErrorBanner } from "@/components/tutor/MicErrorBanner";
import { Button } from "@/components/ui/button";
import { useLearnerStore } from "@/lib/learner-store";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import {
  Send,
  Sparkles,
  User,
  Bot,
  Volume2,
  RotateCcw,
  Phone,
  MessageSquare,
} from "lucide-react";

const SCENARIO_OPTIONS: Array<{
  id: CallScenario;
  shortLabel: string;
}> = [
  { id: "CASUAL_CHAT", shortLabel: "Casual Call" },
  { id: "DAILY_ROUTINE", shortLabel: "Daily Life" },
  { id: "JOB_INTERVIEW", shortLabel: "Job Interview" },
  { id: "CAFE_TRAVEL", shortLabel: "Cafe & Travel" },
];

const PERSONA_OPTIONS: Array<{
  id: TutorPersona;
  label: string;
  callerName: string;
}> = [
  { id: "POOJA_FRIENDLY", label: "👩‍🏫 Pooja (Friendly)", callerName: "Pooja" },
  { id: "KAPOOR_STRICT", label: "👨‍🏫 Mr. Kapoor", callerName: "Mr. Kapoor" },
  { id: "HR_INTERVIEW", label: "💼 HR Coach", callerName: "HR Coach" },
  { id: "IELTS_EXAMINER", label: "🎓 IELTS Examiner", callerName: "IELTS Examiner" },
];

function getInitialGreeting(
  persona: TutorPersona,
  scenario: CallScenario,
  learnerName: string
): string {
  const nameSuffix = learnerName && learnerName !== "Learner" ? `, ${learnerName}` : "";

  if (scenario === "JOB_INTERVIEW" || persona === "HR_INTERVIEW") {
    return `Hello${nameSuffix}! Tell me a bit about yourself and what role you're preparing for.`;
  }
  if (scenario === "CAFE_TRAVEL") {
    return `Hi${nameSuffix}! Welcome to Bol Cafe. What can I get started for you today?`;
  }
  if (scenario === "DAILY_ROUTINE") {
    return `Hey${nameSuffix}! Tell me about your morning routine today—what time did you wake up?`;
  }
  if (persona === "KAPOOR_STRICT") {
    return `Good day${nameSuffix}. I am Mr. Kapoor. Let us speak with accurate English today. How was your morning?`;
  }
  if (persona === "IELTS_EXAMINER") {
    return `Good day${nameSuffix}. Could you describe your hometown and what you enjoy about living there?`;
  }
  return `Hey${nameSuffix}! I'm Pooja. How is your day going so far?`;
}

function createInitialMessages(
  persona: TutorPersona,
  scenario: CallScenario,
  learnerName: string
): TutorMessage[] {
  return [
    {
      id: "m-0",
      role: "assistant",
      content: getInitialGreeting(persona, scenario, learnerName),
      timestamp: "Just now",
    },
  ];
}

export function AITutorStudio() {
  const searchParams = useSearchParams();
  const {
    state,
    isLoaded,
    recordAISpeakingTurn,
    recordAICallEnded,
  } = useLearnerStore();

  const urlMode = searchParams.get("mode");
  const urlScenario = searchParams.get("scenario") as CallScenario | null;

  const [interactionMode, setInteractionMode] = useState<"call" | "chat">(
    urlMode === "chat" ? "chat" : "call"
  );
  const [persona, setPersona] = useState<TutorPersona>(state.defaultPersona);
  const [scenario, setScenario] = useState<CallScenario>(
    urlScenario && SCENARIO_OPTIONS.some((s) => s.id === urlScenario)
      ? urlScenario
      : state.defaultCallScenario
  );
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [isChatListening, setIsChatListening] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>(() =>
    createInitialMessages(state.defaultPersona, scenario, state.learnerName)
  );
  const [textInput, setTextInput] = useState("");
  const [activeCorrections, setActiveCorrections] = useState<PedagogicCorrection[]>([]);
  const [activeLexicalUpgrade, setActiveLexicalUpgrade] = useState<
    LexicalUpgrade | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const hasManualPersonaChangeRef = useRef(false);
  const hasManualScenarioChangeRef = useRef(Boolean(urlScenario));
  const chatEndRef = useRef<HTMLDivElement>(null);

  const speakText = useCallback(
    (text: string) => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = state.voiceAccent || "en-IN";
        utterance.rate = state.audioRate === 0.75 ? 0.75 : 0.96;
        setIsSpeakingVoice(true);

        utterance.onend = () => setIsSpeakingVoice(false);
        utterance.onerror = () => setIsSpeakingVoice(false);

        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeakingVoice(false);
      }
    },
    [state.audioRate, state.voiceAccent]
  );

  const sendTurnRef = useRef<(text: string) => Promise<void>>(async () => {});

  const {
    isListening: isOrbListening,
    isTranscribing: isOrbTranscribing,
    liveTranscript,
    micError,
    startListening: startOrbListening,
    stopListening: stopOrbListening,
    clearError,
    cancelAll,
  } = useVoiceCapture({
    lang: state.voiceAccent || "en-IN",
    disabled: isLoading,
    onTranscript: (transcript, elapsedSecs) => {
      if (elapsedSecs > 0) {
        recordAICallEnded(elapsedSecs);
      }
      void sendTurnRef.current(transcript);
    },
  });

  const handleSendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      const userMsg: TutorMessage = {
        id: `usr-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: "Just now",
      };

      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg]);
      setTextInput("");
      setApiError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/tutor/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            persona,
            scenario,
            learnerName: state.learnerName,
            history: historyPayload,
          }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && typeof data.conversationalReply === "string") {
          const aiMsg: TutorMessage = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.conversationalReply,
            pedagogicalAnalysis: data.pedagogicalAnalysis,
            timestamp: "Just now",
          };

          setMessages((prev) => [...prev, aiMsg]);
          recordAISpeakingTurn(5);

          setActiveCorrections(
            Array.isArray(data.pedagogicalAnalysis?.corrections)
              ? data.pedagogicalAnalysis.corrections
              : []
          );
          setActiveLexicalUpgrade(
            data.pedagogicalAnalysis?.lexicalUpgrade ?? undefined
          );

          speakText(data.speechTtsText || data.conversationalReply);
        } else {
          const message =
            data && typeof data.error === "string"
              ? data.error
              : "Could not get a response from the AI tutor. Please try again.";
          setApiError(message);
        }
      } catch {
        setApiError("Network error while contacting AI tutor. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      messages,
      persona,
      scenario,
      state.learnerName,
      recordAISpeakingTurn,
      speakText,
    ]
  );

  useEffect(() => {
    sendTurnRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Sync defaults from persisted learner settings once loaded
  useEffect(() => {
    if (!isLoaded) return;

    const nextPersona = hasManualPersonaChangeRef.current
      ? persona
      : state.defaultPersona;
    const nextScenario = hasManualScenarioChangeRef.current
      ? scenario
      : state.defaultCallScenario;

    if (!hasManualPersonaChangeRef.current) setPersona(nextPersona);
    if (!hasManualScenarioChangeRef.current) setScenario(nextScenario);

    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "m-0") {
        return createInitialMessages(nextPersona, nextScenario, state.learnerName);
      }
      return prev;
    });
  }, [
    isLoaded,
    state.defaultPersona,
    state.defaultCallScenario,
    state.learnerName,
    persona,
    scenario,
  ]);

  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      cancelAll();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cancelAll]);

  const orbState: OrbState =
    isOrbListening || isChatListening
      ? "listening"
      : isLoading || isOrbTranscribing
      ? "thinking"
      : isSpeakingVoice
      ? "speaking"
      : "idle";

  const handleOrbClick = () => {
    if (orbState === "thinking") return;

    if (isOrbListening) {
      stopOrbListening();
      return;
    }

    if (isSpeakingVoice) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingVoice(false);
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    void startOrbListening();
  };

  const handleSelectPersona = (nextPersona: TutorPersona) => {
    hasManualPersonaChangeRef.current = true;
    setPersona(nextPersona);
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "m-0") {
        return createInitialMessages(nextPersona, scenario, state.learnerName);
      }
      return prev;
    });
  };

  const handleSelectScenario = (nextScenario: CallScenario) => {
    hasManualScenarioChangeRef.current = true;
    setScenario(nextScenario);
    setMessages(createInitialMessages(persona, nextScenario, state.learnerName));
    setActiveCorrections([]);
    setActiveLexicalUpgrade(undefined);
    setApiError(null);
  };

  const handleResetSession = () => {
    cancelAll();
    clearError();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingVoice(false);
    setMessages(createInitialMessages(persona, scenario, state.learnerName));
    setActiveCorrections([]);
    setActiveLexicalUpgrade(undefined);
    setApiError(null);
    setTextInput("");
  };

  const handlePracticeClick = (promptText: string) => {
    const clean = promptText.replace(/Try saying: /i, "").replace(/"/g, "");
    setTextInput(clean);
  };

  const activePersonaMeta =
    PERSONA_OPTIONS.find((p) => p.id === persona) ?? PERSONA_OPTIONS[0];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5">
      {/* Studio Header & Mode Switcher */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-sm p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-ai-50 border border-ai-100 text-ai-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                AI Voice Studio
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Live speaking partner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mode Switcher */}
            <div className="flex flex-1 sm:flex-initial items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setInteractionMode("call")}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  interactionMode === "call"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Live Voice Call</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelAll();
                  setInteractionMode("chat");
                }}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  interactionMode === "chat"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Push-to-Talk &amp; Chat</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetSession}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer shrink-0"
              title="Restart conversation"
              aria-label="Restart conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Partner & Topic Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Partner:
            </span>
            {PERSONA_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPersona(p.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors duration-150 cursor-pointer ${
                  persona === p.id
                    ? "bg-ai-50 text-ai-700 border-ai-300"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Topic:
            </span>
            {SCENARIO_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectScenario(s.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors duration-150 cursor-pointer ${
                  scenario === s.id
                    ? "bg-brand-50 text-brand-700 border-brand-300"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                }`}
              >
                {s.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Single Clickable Ready Orb Stage */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-sm p-4 sm:p-6 flex flex-col items-center justify-center text-center">
        <AIVoiceOrb
          state={orbState}
          onClick={handleOrbClick}
          disabled={orbState === "thinking"}
        />

        <div className="min-h-[24px] max-w-lg mt-1 px-2">
          {liveTranscript ? (
            <p className="text-sm font-bold text-brand-700 animate-pulse break-words">
              You: &ldquo;{liveTranscript}&rdquo;
            </p>
          ) : (
            <p className="text-xs font-bold text-slate-500">
              {orbState === "idle" && "Tap Ready to speak"}
              {orbState === "listening" && "Listening... stops automatically"}
              {orbState === "thinking" && `${activePersonaMeta.callerName} thinking...`}
              {orbState === "speaking" && `${activePersonaMeta.callerName} speaking`}
            </p>
          )}
        </div>

        <MicErrorBanner error={micError} />
      </div>

      {apiError && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-semibold text-red-800 flex items-center justify-between gap-3"
        >
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-100 transition-colors shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real-Time Pedagogical Drawer */}
      {(activeCorrections.length > 0 || Boolean(activeLexicalUpgrade)) && (
        <PedagogicDrawer
          corrections={activeCorrections}
          lexicalUpgrade={activeLexicalUpgrade}
          onPracticeClick={handlePracticeClick}
        />
      )}

      {/* Rolling Transcript */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-sm p-3.5 sm:p-4 md:p-5">
        <div className="overflow-y-auto space-y-3.5 sm:space-y-4 max-h-[45vh] sm:max-h-[340px] pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 sm:gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-ai-600 text-white"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 shadow-sm text-sm leading-relaxed break-words ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white font-medium"
                    : "bg-slate-50 text-slate-800 border border-slate-200"
                }`}
              >
                <p className="break-words">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => speakText(msg.content)}
                    className="mt-2 text-xs text-slate-400 hover:text-brand-600 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Replay Voice
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Push-to-Talk & Text Input Control Bar */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 md:p-6 border-2 border-slate-200 shadow-xl shadow-slate-200/50">
        {interactionMode === "chat" && (
          <div className="flex items-center justify-center mb-4">
            <PushToTalkButton
              onSpeechEnd={handleSendMessage}
              onListeningChange={setIsChatListening}
              disabled={isLoading || isOrbTranscribing}
              lang={state.voiceAccent}
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(textInput);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="tutor-message-input" className="sr-only">
            Message to AI Tutor
          </label>
          <input
            id="tutor-message-input"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            className="min-w-0 flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 font-medium"
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!textInput.trim() || isLoading}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default AITutorStudio;
