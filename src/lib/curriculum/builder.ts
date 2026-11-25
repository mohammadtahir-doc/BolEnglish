import {
  DifficultyLevel,
  LearningModule,
  LessonPartId,
} from "@/types/curriculum";

export interface RawModuleSpec {
  moduleNumber: number;
  difficulty: DifficultyLevel;
  title: string;
  titleHindi: string;
  summaryEn: string;
  summaryHi: string;
  examples: Array<{ en: string; hi: string }>;
  promptHindi: string;
  expectedEnglish: string;
  acceptedAlternatives?: string[];
  distractors: string[];
  hintEn: string;
  hintHi: string;
  explanationEn: string;
  explanationHi: string;
  quizQuestionEn: string;
  quizQuestionHi?: string;
  quizOptions: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  quizExplanationEn: string;
  quizExplanationHi: string;
}

const OPTION_IDS = ["a", "b", "c", "d"] as const;

export function buildModulesForPart(
  partId: LessonPartId,
  specs: RawModuleSpec[]
): LearningModule[] {
  return specs.map((spec) => {
    const modId = `${partId}-${spec.moduleNumber}`;
    const words = spec.expectedEnglish.trim().split(/\s+/);

    const tokens = words.map((text, idx) => ({
      id: `${modId}-t${idx + 1}`,
      text,
    }));

    const distractorTokens = spec.distractors.map((text, idx) => ({
      id: `${modId}-d${idx + 1}`,
      text,
    }));

    const xpMap: Record<DifficultyLevel, number> = {
      easy: 20,
      medium: 35,
      hard: 50,
    };

    return {
      id: modId,
      partId,
      moduleNumber: spec.moduleNumber,
      difficulty: spec.difficulty,
      title: spec.title,
      titleHindi: spec.titleHindi,
      summaryEn: spec.summaryEn,
      summaryHi: spec.summaryHi,
      examples: spec.examples,
      exercise: {
        id: `${modId}-ex`,
        promptHindi: spec.promptHindi,
        expectedEnglish: spec.expectedEnglish,
        acceptedAlternatives: spec.acceptedAlternatives ?? [spec.expectedEnglish],
        tokens,
        distractors: distractorTokens,
        hintEn: spec.hintEn,
        hintHi: spec.hintHi,
        explanationEn: spec.explanationEn,
        explanationHi: spec.explanationHi,
      },
      quiz: {
        id: `${modId}-quiz`,
        questionEn: spec.quizQuestionEn,
        questionHi: spec.quizQuestionHi,
        options: spec.quizOptions.map((text, idx) => ({
          id: OPTION_IDS[idx],
          text,
        })),
        correctOptionId: OPTION_IDS[spec.correctIndex],
        explanationEn: spec.quizExplanationEn,
        explanationHi: spec.quizExplanationHi,
      },
      xpReward: xpMap[spec.difficulty],
    };
  });
}
