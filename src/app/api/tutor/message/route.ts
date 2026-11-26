import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeLearnerSpeechMock,
  getSystemPrompt,
} from "@/lib/ai/prompts";
import {
  CallScenario,
  PedagogicCorrection,
  TutorPersona,
  TutorTurnResponse,
} from "@/types/tutor";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const VALID_PERSONAS = new Set<TutorPersona>([
  "POOJA_FRIENDLY",
  "KAPOOR_STRICT",
  "HR_INTERVIEW",
  "IELTS_EXAMINER",
]);

const VALID_SCENARIOS = new Set<CallScenario>([
  "CASUAL_CHAT",
  "DAILY_ROUTINE",
  "JOB_INTERVIEW",
  "CAFE_TRAVEL",
]);

const VALID_ERROR_CATEGORIES = new Set<PedagogicCorrection["errorCategory"]>([
  "TENSE_ASPECT",
  "PREPOSITION",
  "SUBJECT_VERB_AGREEMENT",
  "ARTICLE",
  "VOCABULARY_CHOICE",
  "WORD_ORDER",
]);

const VALID_CEFR_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"] as const);

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 12;
const MAX_HISTORY_ITEM_CHARS = 1000;
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const FALLBACK_GROQ_MODEL = "openai/gpt-oss-20b";

const CorrectionSchema = z.object({
  userOriginalSegment: z.string().trim().min(1),
  grammaticallyCorrect: z.string().trim().min(1),
  naturalNativePhrasing: z.string().trim().optional(),
  errorCategory: z.string().optional(),
  ruleSignature: z.string().trim().optional(),
  explanationEn: z.string().trim().min(1),
  explanationHi: z.string().trim().optional(),
  practicePrompt: z.string().trim().optional(),
});

const LexicalUpgradeSchema = z.object({
  learnerWord: z.string().trim().min(1),
  upgradedWord: z.string().trim().min(1),
  contextSentence: z.string().trim().min(1),
});

const RawTutorResponseSchema = z.object({
  conversationalReply: z.string().trim().min(1),
  speechTtsText: z.string().trim().optional(),
  pedagogicalAnalysis: z
    .object({
      hasErrors: z.boolean().optional(),
      cefrDemonstrated: z.string().optional(),
      corrections: z.array(CorrectionSchema).max(4).optional(),
      lexicalUpgrade: LexicalUpgradeSchema.nullable().optional(),
      speakingMetricFeedback: z.string().trim().optional(),
    })
    .optional(),
});

function normalizeTutorResponse(rawJson: unknown): TutorTurnResponse | null {
  const parsed = RawTutorResponseSchema.safeParse(rawJson);
  if (!parsed.success) return null;

  const data = parsed.data;
  const rawCorrections = data.pedagogicalAnalysis?.corrections ?? [];
  const corrections: PedagogicCorrection[] = rawCorrections.map((c) => {
    const rawCat = c.errorCategory?.toUpperCase() as
      | PedagogicCorrection["errorCategory"]
      | undefined;
    const errorCategory =
      rawCat && VALID_ERROR_CATEGORIES.has(rawCat)
        ? rawCat
        : "VOCABULARY_CHOICE";

    return {
      userOriginalSegment: c.userOriginalSegment,
      grammaticallyCorrect: c.grammaticallyCorrect,
      naturalNativePhrasing: c.naturalNativePhrasing || c.grammaticallyCorrect,
      errorCategory,
      ruleSignature: c.ruleSignature || "SPOKEN_ACCURACY",
      explanationEn: c.explanationEn,
      explanationHi: c.explanationHi || c.explanationEn,
      practicePrompt:
        c.practicePrompt || `Try saying: "${c.grammaticallyCorrect}"`,
    };
  });

  const rawCefr = data.pedagogicalAnalysis?.cefrDemonstrated?.toUpperCase();
  const cefrDemonstrated = (
    rawCefr && VALID_CEFR_LEVELS.has(rawCefr as "A1" | "A2" | "B1" | "B2" | "C1" | "C2")
      ? rawCefr
      : corrections.length > 0
      ? "A2"
      : "B1"
  ) as TutorTurnResponse["pedagogicalAnalysis"]["cefrDemonstrated"];

  const reply = data.conversationalReply;
  const ttsText = data.speechTtsText?.trim() || reply;

  return {
    conversationalReply: reply,
    speechTtsText: ttsText,
    pedagogicalAnalysis: {
      hasErrors: data.pedagogicalAnalysis?.hasErrors ?? corrections.length > 0,
      cefrDemonstrated,
      corrections,
      lexicalUpgrade: data.pedagogicalAnalysis?.lexicalUpgrade ?? undefined,
      speakingMetricFeedback:
        data.pedagogicalAnalysis?.speakingMetricFeedback ||
        (corrections.length === 0
          ? "Natural pacing and clear expression!"
          : "Great fluency—check the quick grammar tip below."),
    },
  };
}

function extractJsonContent(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function requestGroqCompletion(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: HistoryMessage[]
): Promise<{ status: number; turn?: TutorTurnResponse; errorText?: string }> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_completion_tokens: 1500,
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return { status: response.status, errorText: errorText.slice(0, 300) };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return { status: 502, errorText: "Empty completion content from Groq." };
  }

  try {
    const parsedJson = extractJsonContent(content);
    const normalized = normalizeTutorResponse(parsedJson);
    if (!normalized) {
      return { status: 502, errorText: "Unexpected JSON shape from Groq." };
    }
    return { status: 200, turn: normalized };
  } catch {
    return { status: 502, errorText: "Invalid JSON returned by Groq." };
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  try {
    const raw = body as Record<string, unknown>;
    const rawMessage = raw.message;

    if (typeof rawMessage !== "string" || !rawMessage.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const message = rawMessage.trim();
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Message exceeds ${MAX_MESSAGE_CHARS} characters.` },
        { status: 400 }
      );
    }

    const persona: TutorPersona =
      typeof raw.persona === "string" &&
      VALID_PERSONAS.has(raw.persona as TutorPersona)
        ? (raw.persona as TutorPersona)
        : "POOJA_FRIENDLY";

    const scenario: CallScenario =
      typeof raw.scenario === "string" &&
      VALID_SCENARIOS.has(raw.scenario as CallScenario)
        ? (raw.scenario as CallScenario)
        : "CASUAL_CHAT";

    const learnerName =
      typeof raw.learnerName === "string"
        ? raw.learnerName.replace(/[\r\n\t]+/g, " ").trim().slice(0, 40)
        : undefined;

    const recentHistory: HistoryMessage[] = Array.isArray(raw.history)
      ? raw.history
          .filter(
            (item): item is HistoryMessage =>
              Boolean(item) &&
              typeof item === "object" &&
              ((item as HistoryMessage).role === "user" ||
                (item as HistoryMessage).role === "assistant") &&
              typeof (item as HistoryMessage).content === "string" &&
              (item as HistoryMessage).content.trim().length > 0
          )
          .slice(-MAX_HISTORY_ITEMS)
          .map((m) => ({
            role: m.role,
            content: m.content.trim().slice(0, MAX_HISTORY_ITEM_CHARS),
          }))
      : [];

    // Avoid duplicating the current utterance if the caller already appended it to history
    const lastHistoryItem = recentHistory[recentHistory.length - 1];
    const priorHistory =
      lastHistoryItem &&
      lastHistoryItem.role === "user" &&
      lastHistoryItem.content === message
        ? recentHistory.slice(0, -1)
        : recentHistory;

    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (groqApiKey) {
      const systemPrompt = getSystemPrompt(persona, scenario, learnerName);
      const conversationMessages: HistoryMessage[] = [
        ...priorHistory,
        { role: "user", content: message },
      ];
      const primaryModel = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;

      try {
        let result = await requestGroqCompletion(
          groqApiKey,
          primaryModel,
          systemPrompt,
          conversationMessages
        );

        if (
          !result.turn &&
          primaryModel !== FALLBACK_GROQ_MODEL &&
          (result.status === 429 ||
            result.status >= 500 ||
            result.status === 404 ||
            result.status === 400)
        ) {
          console.warn(
            `Groq primary model (${primaryModel}) failed with status ${result.status}; retrying with ${FALLBACK_GROQ_MODEL}.`
          );
          result = await requestGroqCompletion(
            groqApiKey,
            FALLBACK_GROQ_MODEL,
            systemPrompt,
            conversationMessages
          );
        }

        if (result.turn) {
          return NextResponse.json(result.turn);
        }

        console.warn("Groq API call failed:", result.status, result.errorText);

        if (result.status === 401 || result.status === 403) {
          return NextResponse.json(
            {
              error:
                "Groq API authentication failed. Please check GROQ_API_KEY in .env.local.",
            },
            { status: 502 }
          );
        }

        if (result.status === 429) {
          return NextResponse.json(
            {
              error:
                "Groq rate limit reached. Please wait a few seconds and speak again.",
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error:
              "Unable to reach the AI tutor right now. Please try speaking again.",
          },
          { status: 502 }
        );
      } catch (err) {
        const isTimeout =
          err instanceof Error &&
          (err.name === "TimeoutError" || err.name === "AbortError");
        console.warn("Groq request error:", err);
        return NextResponse.json(
          {
            error: isTimeout
              ? "AI tutor response timed out. Please try again."
              : "Network error contacting the AI tutor. Please try again.",
          },
          { status: isTimeout ? 504 : 502 }
        );
      }
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (anthropicApiKey) {
      try {
        const systemPrompt = getSystemPrompt(persona, scenario, learnerName);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 800,
            system: systemPrompt,
            messages: [...priorHistory, { role: "user", content: message }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0]?.text;
          if (typeof content === "string") {
            const parsedJson = extractJsonContent(content);
            const normalized = normalizeTutorResponse(parsedJson);
            if (normalized) {
              return NextResponse.json(normalized);
            }
          }
        }
      } catch (err) {
        console.warn("Claude API call failed, falling back to local SLA engine:", err);
      }
    }

    const feedback = analyzeLearnerSpeechMock(
      message,
      persona,
      scenario,
      priorHistory.length
    );
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Tutor message API error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
