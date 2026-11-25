import {
  LearningModule,
  LessonPartId,
  LessonPartMeta,
} from "@/types/curriculum";
import { TENSES_MODULES } from "./tenses";
import { GRAMMAR_MODULES } from "./grammar";
import { VOCABULARY_MODULES } from "./vocabulary";
import { PHRASES_MODULES } from "./phrases";

export const LESSON_PARTS: LessonPartMeta[] = [
  {
    id: "tenses",
    order: 1,
    title: "Tenses",
    titleHindi: "काल (Tenses)",
    description:
      "Master Present, Past, and Future structures from basics to advanced storytelling.",
    moduleCount: TENSES_MODULES.length,
  },
  {
    id: "grammar",
    order: 2,
    title: "Grammar",
    titleHindi: "व्याकरण (Grammar)",
    description:
      "Fix articles, prepositions, subject-verb agreement, modals, and conditionals.",
    moduleCount: GRAMMAR_MODULES.length,
  },
  {
    id: "vocabulary",
    order: 3,
    title: "Vocabulary",
    titleHindi: "शब्दावली (Vocabulary)",
    description:
      "Build practical everyday words up to corporate, interview, and IELTS vocabulary.",
    moduleCount: VOCABULARY_MODULES.length,
  },
  {
    id: "phrases",
    order: 4,
    title: "Phrases",
    titleHindi: "वाक्यांश (Phrases)",
    description:
      "Speak fluently with real-life expressions, phrasal verbs, and natural idioms.",
    moduleCount: PHRASES_MODULES.length,
  },
];

export const MODULES_BY_PART: Record<LessonPartId, LearningModule[]> = {
  tenses: TENSES_MODULES,
  grammar: GRAMMAR_MODULES,
  vocabulary: VOCABULARY_MODULES,
  phrases: PHRASES_MODULES,
};

export const ALL_MODULES: LearningModule[] = [
  ...TENSES_MODULES,
  ...GRAMMAR_MODULES,
  ...VOCABULARY_MODULES,
  ...PHRASES_MODULES,
];

export function isLessonPartId(value: string): value is LessonPartId {
  return (
    value === "tenses" ||
    value === "grammar" ||
    value === "vocabulary" ||
    value === "phrases"
  );
}

export function getLessonPart(partId: string): LessonPartMeta | undefined {
  return LESSON_PARTS.find((p) => p.id === partId);
}

export function getModulesByPart(partId: string): LearningModule[] {
  if (!isLessonPartId(partId)) return [];
  return MODULES_BY_PART[partId];
}

export function getModuleById(
  partId: string,
  moduleId: string
): LearningModule | undefined {
  const list = getModulesByPart(partId);
  return list.find((m) => m.id === moduleId);
}

export function getNextModule(
  partId: string,
  moduleId: string
): LearningModule | undefined {
  const list = getModulesByPart(partId);
  const idx = list.findIndex((m) => m.id === moduleId);
  if (idx === -1 || idx + 1 >= list.length) return undefined;
  return list[idx + 1];
}
