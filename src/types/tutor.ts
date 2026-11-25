export type TutorPersona =
  | "POOJA_FRIENDLY"
  | "KAPOOR_STRICT"
  | "HR_INTERVIEW"
  | "IELTS_EXAMINER";

export type VoiceAccent = "en-IN" | "en-US" | "en-GB";

export type CallScenario =
  | "CASUAL_CHAT"
  | "DAILY_ROUTINE"
  | "JOB_INTERVIEW"
  | "CAFE_TRAVEL";

export interface PedagogicCorrection {
  userOriginalSegment: string;
  grammaticallyCorrect: string;
  naturalNativePhrasing: string;
  errorCategory:
    | "TENSE_ASPECT"
    | "PREPOSITION"
    | "SUBJECT_VERB_AGREEMENT"
    | "ARTICLE"
    | "VOCABULARY_CHOICE"
    | "WORD_ORDER";
  ruleSignature: string;
  explanationEn: string;
  explanationHi: string;
  practicePrompt: string;
}

export interface LexicalUpgrade {
  learnerWord: string;
  upgradedWord: string;
  contextSentence: string;
}

export interface PedagogicalAnalysis {
  hasErrors: boolean;
  cefrDemonstrated: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  corrections: PedagogicCorrection[];
  lexicalUpgrade?: LexicalUpgrade;
  speakingMetricFeedback?: string;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pedagogicalAnalysis?: PedagogicalAnalysis;
  timestamp: string;
}

export interface TutorTurnResponse {
  conversationalReply: string;
  speechTtsText: string;
  pedagogicalAnalysis: PedagogicalAnalysis;
}
