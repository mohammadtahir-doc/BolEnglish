import { NextRequest, NextResponse } from "next/server";
import {
  analyzeLearnerSpeechMock,
  getSystemPrompt,
} from "@/lib/ai/prompts";
import { CallScenario, TutorPersona } from "@/types/tutor";

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

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_ITEM_CHARS = 1000;

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

    const recentHistory: HistoryMessage[] = Array.isArray(raw.history)
      ? raw.history
          .filter(
            (item): item is HistoryMessage =>
              Boolean(item) &&
              typeof item === "object" &&
              ((item as HistoryMessage).role === "user" ||
                (item as HistoryMessage).role === "assistant") &&
              typeof (item as HistoryMessage).content === "string"
          )
          .slice(-MAX_HISTORY_ITEMS)
          .map((m) => ({
            role: m.role,
            content: m.content.trim().slice(0, MAX_HISTORY_ITEM_CHARS),
          }))
      : [];

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = getSystemPrompt(persona, scenario);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 800,
            system: `${systemPrompt}\nAlways respond with valid raw JSON conforming to the schema without markdown codeblocks.`,
            messages: [...recentHistory, { role: "user", content: message }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0]?.text;
          if (typeof content === "string") {
            const cleaned = content
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            return NextResponse.json(parsed);
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
      recentHistory.length
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
