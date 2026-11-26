import { CallScenario, TutorPersona, TutorTurnResponse } from "@/types/tutor";

export const POOJA_SYSTEM_PROMPT = `
You are Pooja, a warm, encouraging, and empathetic English conversation tutor on BolEnglish.
Your mission is to help Indian learners overcome their fear of speaking English through natural, human-like voice calls and everyday conversations.

BEHAVIORAL DIRECTIVES:
1. Tone: Like a supportive friend talking on a voice call. Warm, upbeat, respectful, and natural.
2. Turn-Taking: Keep your conversational replies concise (1 to 3 sentences maximum), ending with ONE engaging follow-up question so the conversation feels like a real phone call.
3. Error Handling:
   - NEVER tell the learner "You are wrong" in your conversational reply.
   - Use conversational recasts naturally in your reply.
   - In the pedagogical JSON block, identify grammar, preposition, tense, or phrasing errors with precision and simple Hindi explanations.
4. Output Format: Strictly output valid JSON adhering to the required schema.
`;

export const KAPOOR_SYSTEM_PROMPT = `
You are Mr. Vikram Kapoor, a veteran English language instructor with 25 years of teaching experience.
Your objective is grammatical precision, accurate syntax, and building strong foundational discipline during spoken conversations.

BEHAVIORAL DIRECTIVES:
1. Tone: Professional, authoritative yet encouraging, constructive, and clear.
2. Direct Correction: Gently point out what was grammatically imprecise before continuing the conversation.
3. Explicit Drills: Provide a targeted 1-sentence drill for the learner to repeat.
4. Output Format: Strictly output valid JSON adhering to the required schema.
`;

export const HR_INTERVIEW_SYSTEM_PROMPT = `
You are a Senior Hiring Manager & Corporate Interview Coach on BolEnglish.
Conduct realistic spoken mock interviews using the STAR method (Situation, Task, Action, Result), asking concise follow-up questions and upgrading casual Indianisms to corporate English.
Always output valid JSON conforming to the schema.
`;

export const IELTS_SYSTEM_PROMPT = `
You are a polite, objective IELTS Speaking Examiner conducting realistic Parts 1, 2, and 3 speaking practice.
Ask clear follow-up questions and highlight lexical upgrades and grammatical range improvements in the JSON feedback block.
`;

export const TUTOR_JSON_SCHEMA_INSTRUCTION = `
CONVERSATIONAL & PEDAGOGICAL RULES:
1. Respond directly and specifically to what the user just said (never give generic filler that ignores their topic or question).
2. Keep "conversationalReply" and "speechTtsText" concise (1 to 3 short, natural spoken sentences) ending with ONE engaging follow-up question to keep the voice call going.
3. "speechTtsText" must be clean plain text ready for Text-to-Speech (no emojis, markdown, asterisks, or bullet symbols).
4. The learner's message may come from voice Speech-to-Text, so ignore missing punctuation, capitalization, or minor transcript formatting quirks.
5. Only report items in "pedagogicalAnalysis.corrections" (max 2) when there is an actual spoken grammar, tense, preposition, article, word-order, or phrasing error. If their English is natural and acceptable, set "hasErrors": false and "corrections": [].
6. Include "lexicalUpgrade" only when there is a helpful vocabulary upgrade (otherwise set it to null).

REQUIRED RAW JSON OUTPUT SCHEMA:
{
  "conversationalReply": "string",
  "speechTtsText": "string",
  "pedagogicalAnalysis": {
    "hasErrors": boolean,
    "cefrDemonstrated": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "corrections": [
      {
        "userOriginalSegment": "string",
        "grammaticallyCorrect": "string",
        "naturalNativePhrasing": "string",
        "errorCategory": "TENSE_ASPECT" | "PREPOSITION" | "SUBJECT_VERB_AGREEMENT" | "ARTICLE" | "VOCABULARY_CHOICE" | "WORD_ORDER",
        "ruleSignature": "string",
        "explanationEn": "string",
        "explanationHi": "string (clear explanation in Hindi)",
        "practicePrompt": "Try saying: \"<complete, natural corrected sentence with no blanks or parentheses>\""
      }
    ],
    "lexicalUpgrade": {
      "learnerWord": "string",
      "upgradedWord": "string",
      "contextSentence": "string"
    } | null,
    "speakingMetricFeedback": "string"
  }
}

Output strictly a single valid JSON object matching this schema with no markdown code fences or extra text.
`.trim();

export function getSystemPrompt(
  persona: TutorPersona,
  scenario: CallScenario,
  learnerName?: string
): string {
  const base =
    persona === "KAPOOR_STRICT"
      ? KAPOOR_SYSTEM_PROMPT
      : persona === "HR_INTERVIEW"
      ? HR_INTERVIEW_SYSTEM_PROMPT
      : persona === "IELTS_EXAMINER"
      ? IELTS_SYSTEM_PROMPT
      : POOJA_SYSTEM_PROMPT;

  const scenarioContext: Record<CallScenario, string> = {
    CASUAL_CHAT: "Current Call Topic: Friendly everyday catch-up call.",
    DAILY_ROUTINE: "Current Call Topic: Talking about daily habits, morning routine, and plans.",
    JOB_INTERVIEW: "Current Call Topic: Realistic HR & behavioral job interview phone screen.",
    CAFE_TRAVEL: "Current Call Topic: Ordering at a cafe, travel, or airport conversation roleplay.",
  };

  const cleanName = learnerName?.replace(/[\r\n\t]+/g, " ").trim().slice(0, 40);
  const learnerContext =
    cleanName && cleanName !== "Learner"
      ? `Learner Name: ${cleanName}`
      : "";

  return [base.trim(), scenarioContext[scenario], learnerContext, TUTOR_JSON_SCHEMA_INSTRUCTION]
    .filter(Boolean)
    .join("\n\n");
}

function buildHumanConversationalReply(
  userInput: string,
  persona: TutorPersona,
  scenario: CallScenario,
  turnCount: number,
  firstCorrection: { userOriginalSegment: string; explanationEn: string } | undefined
): string {
  const lower = userInput.toLowerCase();

  if (persona === "KAPOOR_STRICT" && firstCorrection) {
    return `Good effort! Just notice "${firstCorrection.userOriginalSegment}". ${firstCorrection.explanationEn} Now tell me more—what happened after that?`;
  }

  // Natural conversational matchers so talking to the AI feels like a real person on a call
  if (/\b(how are you|how r u|how do you do|what about you)\b/i.test(lower)) {
    return persona === "HR_INTERVIEW"
      ? "I'm doing great, thank you for asking! Let's dive right in—could you walk me through a recent project or achievement you are proud of?"
      : "I'm doing wonderful, thanks for asking! It's always great catching up with you. How has your week been going so far?";
  }

  if (/^\s*(hi|hello|hey|namaste|good morning|good evening|good afternoon)\b/i.test(lower)) {
    if (scenario === "JOB_INTERVIEW" || persona === "HR_INTERVIEW") {
      return "Hello! Thanks for hopping on this call today. To start off, could you introduce yourself and tell me what role you're aiming for?";
    }
    if (scenario === "CAFE_TRAVEL") {
      return "Hello and welcome! What would you like to order today, or where are you traveling to?";
    }
    return "Hey! So good to hear your voice! How is your day going so far—anything interesting happen today?";
  }

  if (/\b(job|interview|office|work|project|manager|company|boss|career|salary)\b/i.test(lower)) {
    const workReplies = [
      "Work life can get really busy! What is the most challenging part of your work or preparation right now?",
      "That sounds like a solid focus. How do you usually communicate with your teammates or managers during the day?",
      "Got it! And if an interviewer asked you about your biggest strength tomorrow, how would you describe it?",
    ];
    return workReplies[turnCount % workReplies.length];
  }

  if (/\b(tired|exhausted|sleep|busy|stress|headache|sick|fever)\b/i.test(lower)) {
    return "Oh no, make sure you get enough rest tonight! Aside from feeling tired, did you manage to finish everything you planned for today?";
  }

  if (/\b(tea|coffee|food|breakfast|lunch|dinner|eat|hungry|order|cafe|restaurant)\b/i.test(lower)) {
    return "That sounds delicious! Do you usually prefer cooking at home, or eating out with friends on weekends?";
  }

  if (/\b(movie|cricket|music|book|game|friend|family|weekend|travel|trip)\b/i.test(lower)) {
    const socialReplies = [
      "Nice! Spending time on things you enjoy really refreshes the mind. Who do you usually hang out with on weekends?",
      "Oh, I love that! Tell me a little more about it—what made it so memorable for you?",
    ];
    return socialReplies[turnCount % socialReplies.length];
  }

  if (/\b(thank|thanks|bye|goodbye|see you)\b/i.test(lower)) {
    return "You're most welcome! You spoke with great confidence today. Do you want to practice one more question before we hang up?";
  }

  // Scenario-specific varied follow-ups
  if (scenario === "JOB_INTERVIEW" || persona === "HR_INTERVIEW") {
    const hrFollowUps = [
      "Thank you for sharing that. Can you give me a specific example of a situation where you solved a difficult problem?",
      "That makes sense. How do you handle tight deadlines when multiple tasks come up at once?",
      "Interesting! Where do you see yourself growing over the next two years?",
    ];
    return hrFollowUps[turnCount % hrFollowUps.length];
  }

  if (scenario === "CAFE_TRAVEL") {
    const travelFollowUps = [
      "Sure thing! Would you like anything else on the side, or any help finding your gate or hotel?",
      "Got it! Have you traveled to any new cities recently, or is there a place on your wishlist?",
    ];
    return travelFollowUps[turnCount % travelFollowUps.length];
  }

  if (persona === "IELTS_EXAMINER") {
    const ieltsFollowUps = [
      "Thank you. Let's explore that a bit further—why do you think this has become so common among young people today?",
      "That's an interesting point. How has that changed compared to ten years ago in your country?",
    ];
    return ieltsFollowUps[turnCount % ieltsFollowUps.length];
  }

  const casualFollowUps = [
    "I completely understand! That's really interesting—what happened next?",
    "Haha, fair enough! And what are you planning to do for the rest of the evening?",
    "That sounds great! Tell me, what is one thing you're looking forward to this week?",
    "Got you! You're expressing yourself so smoothly. What else is on your mind today?",
  ];
  return casualFollowUps[turnCount % casualFollowUps.length];
}

/**
 * Intelligent SLA pedagogical engine.
 * Handles multi-turn human-like voice call replies + Indian English grammar diagnosis.
 */
export function analyzeLearnerSpeechMock(
  userInput: string,
  persona: TutorPersona = "POOJA_FRIENDLY",
  scenario: CallScenario = "CASUAL_CHAT",
  turnCount = 0
): TutorTurnResponse {
  const lower = userInput.toLowerCase();
  const corrections = [];

  // 1. "didn't + V2"
  const didPastMatch = lower.match(
    /\b(didn't|didnt|did not)\s+(went|saw|took|came|told|called|played|finished|bought|ate|spoke)\b/i
  );
  if (didPastMatch) {
    const wrongWord = didPastMatch[2].toLowerCase();
    const baseMap: Record<string, string> = {
      went: "go",
      saw: "see",
      took: "take",
      came: "come",
      told: "tell",
      called: "call",
      played: "play",
      finished: "finish",
      bought: "buy",
      ate: "eat",
      spoke: "speak",
    };
    const baseWord = baseMap[wrongWord] || "base verb";

    corrections.push({
      userOriginalSegment: didPastMatch[0],
      grammaticallyCorrect: `didn't ${baseWord}`,
      naturalNativePhrasing: `didn't ${baseWord}`,
      errorCategory: "TENSE_ASPECT" as const,
      ruleSignature: "DID_PLUS_PAST_TENSE",
      explanationEn: `Always use the base form of the verb (${baseWord}) after 'did' or 'didn't'.`,
      explanationHi: `'Did' या 'didn't' के साथ हमेशा verb की first form (${baseWord}) आती है, past form (${wrongWord}) नहीं।`,
      practicePrompt: `Try saying: "I didn't ${baseWord} yesterday."`,
    });
  }

  // 2. "angry on"
  if (lower.includes("angry on")) {
    corrections.push({
      userOriginalSegment: "angry on",
      grammaticallyCorrect: "angry with / upset with",
      naturalNativePhrasing: "upset with me",
      errorCategory: "PREPOSITION" as const,
      ruleSignature: "PREPOSITION_ANGRY_WITH",
      explanationEn: "In English, we get angry WITH a person, not 'on' a person.",
      explanationHi:
        "किसी व्यक्ति से नाराज़ होने पर English में 'angry with' का प्रयोग होता है, 'on' का नहीं।",
      practicePrompt: "Try saying: 'My manager was angry with me.'",
    });
  }

  // 3. "myself [Name]"
  const myselfMatch = lower.match(/\bmyself\s+(is\s+)?([a-z]+)/i);
  if (myselfMatch && /\bmyself\b/i.test(lower)) {
    corrections.push({
      userOriginalSegment: myselfMatch[0],
      grammaticallyCorrect: `I am ${myselfMatch[2]} / My name is ${myselfMatch[2]}`,
      naturalNativePhrasing: `Hi, I'm ${myselfMatch[2]}`,
      errorCategory: "WORD_ORDER" as const,
      ruleSignature: "INTRO_MYSELF",
      explanationEn: "Never start an introduction with 'Myself'; always say 'I am...' or 'My name is...'.",
      explanationHi: "अपना परिचय 'Myself' से शुरू न करें; हमेशा 'I am...' या 'My name is...' बोलें।",
      practicePrompt: `Try saying: "Hi, I am ${myselfMatch[2]}."`,
    });
  }

  // 4. "did the needful"
  if (lower.includes("did the needful") || lower.includes("do the needful")) {
    corrections.push({
      userOriginalSegment: "did the needful",
      grammaticallyCorrect: "took the necessary action",
      naturalNativePhrasing: "handled the matter promptly",
      errorCategory: "VOCABULARY_CHOICE" as const,
      ruleSignature: "INDIANISM_NEEDFUL",
      explanationEn:
        "'Did the needful' is outdated. In modern English, specify your exact action.",
      explanationHi:
        "Modern English में 'did the needful' की जगह 'took action' या 'resolved it' बोलें।",
      practicePrompt: "Try saying: 'I took the necessary steps to resolve the issue.'",
    });
  }

  // 5. "everyone are"
  if (lower.includes("everyone are") || lower.includes("everybody are")) {
    corrections.push({
      userOriginalSegment: "everyone are",
      grammaticallyCorrect: "everyone is",
      naturalNativePhrasing: "everyone is",
      errorCategory: "SUBJECT_VERB_AGREEMENT" as const,
      ruleSignature: "EVERYONE_SINGULAR",
      explanationEn: "'Everyone' is grammatically singular in English and takes 'is' or 'has'.",
      explanationHi:
        "'Everyone' व्याकरण की दृष्टि से singular माना जाता है, इसलिए इसके साथ 'is' आता है।",
      practicePrompt: "Try saying: 'Everyone is ready for the meeting.'",
    });
  }

  const reply = buildHumanConversationalReply(
    userInput,
    persona,
    scenario,
    turnCount,
    corrections[0]
  );

  return {
    conversationalReply: reply,
    speechTtsText: reply,
    pedagogicalAnalysis: {
      hasErrors: corrections.length > 0,
      cefrDemonstrated: corrections.length > 0 ? "A2" : "B1",
      corrections,
      lexicalUpgrade:
        lower.includes("very good") || lower.includes("very tired")
          ? {
              learnerWord: lower.includes("very tired") ? "very tired" : "very good",
              upgradedWord: lower.includes("very tired") ? "exhausted" : "fantastic",
              contextSentence: lower.includes("very tired")
                ? "I am completely exhausted today."
                : "That was a fantastic experience!",
            }
          : undefined,
      speakingMetricFeedback:
        corrections.length === 0
          ? "Natural pacing and clear expression!"
          : "Great fluency—check the quick grammar tip below.",
    },
  };
}
