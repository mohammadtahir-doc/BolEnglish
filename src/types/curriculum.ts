export type LessonPartId = "tenses" | "grammar" | "vocabulary" | "phrases";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface WordToken {
  id: string;
  text: string;
}

export interface SentenceBuilderExercise {
  id: string;
  promptHindi: string;
  promptAudioHindi?: string;
  expectedEnglish: string;
  acceptedAlternatives?: string[];
  tokens: WordToken[];
  distractors: WordToken[];
  hintEn?: string;
  hintHi?: string;
  explanationEn: string;
  explanationHi: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionEn: string;
  questionHi?: string;
  options: QuizOption[];
  correctOptionId: string;
  explanationEn: string;
  explanationHi: string;
}

export interface LessonPartMeta {
  id: LessonPartId;
  order: 1 | 2 | 3 | 4;
  title: string;
  titleHindi: string;
  description: string;
  moduleCount: number;
}

export interface LearningModule {
  id: string;
  partId: LessonPartId;
  moduleNumber: number;
  difficulty: DifficultyLevel;
  title: string;
  titleHindi: string;
  summaryEn: string;
  summaryHi: string;
  examples: Array<{
    en: string;
    hi: string;
  }>;
  exercise: SentenceBuilderExercise;
  quiz: QuizQuestion;
  xpReward: number;
}

export interface GrammarLesson {
  id: string;
  slug: string;
  title: string;
  titleHindi: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  conceptRuleEn: string;
  conceptRuleHi: string;
  commonMistake: {
    wrong: string;
    right: string;
    reasonHi: string;
  };
  examples: Array<{
    en: string;
    hi: string;
  }>;
  exercises: SentenceBuilderExercise[];
  quizzes: QuizQuestion[];
  xpReward: number;
}
