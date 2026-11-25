"use client";

import { useState, useEffect, useCallback } from "react";
import { CallScenario, TutorPersona, VoiceAccent } from "@/types/tutor";

export type LearningGoal =
  | "Daily Conversation"
  | "Job Interview"
  | "IELTS"
  | "Travel";

export interface LearnerState {
  learnerName: string;
  learnerGoal: LearningGoal;
  xp: number;
  streak: number;
  completedModuleIds: string[];
  showHindiHints: boolean;
  audioRate: 0.75 | 1;
  defaultPersona: TutorPersona;
  dailyGoalMinutes: 10 | 15 | 30;
  autoCallMode: boolean;
  voiceAccent: VoiceAccent;
  defaultCallScenario: CallScenario;
  aiCallSeconds: number;
  aiCallSessions: number;
  aiTurnsSpoken: number;
}

const STORAGE_KEY = "bolenglish_learner_state_v1";

export const DEFAULT_LEARNER_STATE: LearnerState = {
  learnerName: "Learner",
  learnerGoal: "Daily Conversation",
  xp: 0,
  streak: 1,
  completedModuleIds: [],
  showHindiHints: true,
  audioRate: 1,
  defaultPersona: "POOJA_FRIENDLY",
  dailyGoalMinutes: 15,
  autoCallMode: true,
  voiceAccent: "en-IN",
  defaultCallScenario: "CASUAL_CHAT",
  aiCallSeconds: 0,
  aiCallSessions: 0,
  aiTurnsSpoken: 0,
};

function readStoredState(): LearnerState {
  if (typeof window === "undefined") return DEFAULT_LEARNER_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LEARNER_STATE;
    const parsed = JSON.parse(raw) as Partial<LearnerState>;
    return {
      ...DEFAULT_LEARNER_STATE,
      ...parsed,
      completedModuleIds: Array.isArray(parsed.completedModuleIds)
        ? parsed.completedModuleIds
        : [],
    };
  } catch {
    return DEFAULT_LEARNER_STATE;
  }
}

export function useLearnerStore() {
  const [state, setState] = useState<LearnerState>(DEFAULT_LEARNER_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setIsLoaded(true);
  }, []);

  const persist = useCallback((next: LearnerState) => {
    setState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, []);

  const markModuleComplete = useCallback(
    (moduleId: string, xpReward: number) => {
      setState((prev) => {
        const alreadyCompleted = prev.completedModuleIds.includes(moduleId);
        const next: LearnerState = {
          ...prev,
          completedModuleIds: alreadyCompleted
            ? prev.completedModuleIds
            : [...prev.completedModuleIds, moduleId],
          xp: alreadyCompleted ? prev.xp : prev.xp + xpReward,
        };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage quota errors
          }
        }
        return next;
      });
    },
    []
  );

  const recordAISpeakingTurn = useCallback((xpReward = 5) => {
    setState((prev) => {
      const next: LearnerState = {
        ...prev,
        aiTurnsSpoken: prev.aiTurnsSpoken + 1,
        xp: prev.xp + xpReward,
      };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
      }
      return next;
    });
  }, []);

  const recordAICallEnded = useCallback((durationSeconds: number) => {
    setState((prev) => {
      const next: LearnerState = {
        ...prev,
        aiCallSessions: prev.aiCallSessions + 1,
        aiCallSeconds: prev.aiCallSeconds + Math.max(0, durationSeconds),
      };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
      }
      return next;
    });
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<LearnerState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage quota errors
          }
        }
        return next;
      });
    },
    []
  );

  const resetProgress = useCallback(() => {
    persist(DEFAULT_LEARNER_STATE);
  }, [persist]);

  return {
    state,
    isLoaded,
    markModuleComplete,
    recordAISpeakingTurn,
    recordAICallEnded,
    updateSettings,
    resetProgress,
  };
}
