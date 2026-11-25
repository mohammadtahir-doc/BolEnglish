import { GrammarLesson } from "@/types/curriculum";

export const SAMPLE_GRAMMAR_LESSON: GrammarLesson = {
  id: "lesson-did-past-tense",
  slug: "past-tense-did",
  title: "Mastering 'Did' in Past Simple Questions & Negatives",
  titleHindi: "Past Simple में 'Did' का सही प्रयोग (प्रश्न और नकारात्मक वाक्य)",
  level: "A2",
  conceptRuleEn:
    "When using 'did' or 'didn't' in English questions and negative sentences, the main verb MUST ALWAYS remain in its base form (V1), NEVER in the past form (V2).",
  conceptRuleHi:
    "अंग्रेजी में जब भी वाक्य में 'Did' या 'Didn't' आ जाता है, तो मुख्य Verb हमेशा अपनी पहली फॉर्म (Base Form / V1) में रहती है। कभी भी 'did + went' या 'did + played' न कहें!",
  commonMistake: {
    wrong: "I didn't went to the market yesterday.",
    right: "I didn't go to the market yesterday.",
    reasonHi:
      "चूँकि 'Did' पहले से ही Past Tense को दर्शा रहा है, इसलिए 'went' लगाने से Past Tense का दोहराव (Double Past) हो जाता है जो कि गलत है। सही रूप: did + go.",
  },
  examples: [
    {
      en: "Did you call him last night?",
      hi: "क्या आपने कल रात उसे फोन किया था?",
    },
    {
      en: "She didn't tell me about the meeting.",
      hi: "उसने मुझे मीटिंग के बारे में नहीं बताया।",
    },
    {
      en: "Where did you buy this shirt?",
      hi: "आपने यह शर्ट कहाँ से खरीदी?",
    },
  ],
  exercises: [
    {
      id: "ex-1",
      promptHindi: "क्या आपने कल रात अपना होमवर्क पूरा किया?",
      expectedEnglish: "Did you finish your homework last night?",
      acceptedAlternatives: ["Did you finish your homework last night?"],
      tokens: [
        { id: "t1", text: "Did" },
        { id: "t2", text: "you" },
        { id: "t3", text: "finish" },
        { id: "t4", text: "your" },
        { id: "t5", text: "homework" },
        { id: "t6", text: "last night?" },
      ],
      distractors: [
        { id: "d1", text: "finished" },
        { id: "d2", text: "do" },
        { id: "d3", text: "has" },
      ],
      hintEn: "Start with 'Did', followed by 'you' and the base verb 'finish'.",
      hintHi: "प्रश्न 'Did' से शुरू करें, फिर 'you' और verb की 1st form 'finish' लगाएं।",
      explanationEn: "Correct! After 'Did', we use the base verb 'finish', not 'finished'.",
      explanationHi: "शाबाश! 'Did' वाले प्रश्न में base verb 'finish' आएगा, 'finished' नहीं।",
    },
    {
      id: "ex-2",
      promptHindi: "मैं कल ऑफिस नहीं गया।",
      expectedEnglish: "I didn't go to office yesterday.",
      acceptedAlternatives: [
        "I didn't go to office yesterday.",
        "I didn't go to the office yesterday.",
      ],
      tokens: [
        { id: "t1", text: "I" },
        { id: "t2", text: "didn't" },
        { id: "t3", text: "go" },
        { id: "t4", text: "to" },
        { id: "t5", text: "office" },
        { id: "t6", text: "yesterday." },
      ],
      distractors: [
        { id: "d1", text: "went" },
        { id: "d2", text: "gone" },
        { id: "d3", text: "wasn't" },
      ],
      hintEn: "Make sure to include the preposition 'to' after 'go' ('go to office').",
      hintHi: "संकेत: 'go' के बाद जगह का नाम बताने के लिए 'to' जोड़ना न भूलें (जैसे 'go to office')।",
      explanationEn: "Excellent! 'didn't go to office' is the correct negative past form.",
      explanationHi: "बिल्कुल सही! 'didn't' के साथ base verb 'go' और दिशा के लिए 'to' का प्रयोग होता है।",
    },
  ],
  quizzes: [
    {
      id: "q-1",
      questionEn: "Why ______ to the manager about the delay?",
      questionHi: "आपने देरी के बारे में मैनेजर से बात क्यों नहीं की?",
      options: [
        { id: "a", text: "didn't you spoke" },
        { id: "b", text: "didn't you speak" },
        { id: "c", text: "don't you spoke" },
        { id: "d", text: "you didn't spoke" },
      ],
      correctOptionId: "b",
      explanationEn: "We say 'didn't you speak' because 'did' takes the base verb 'speak'.",
      explanationHi: "'didn't' के साथ हमेशा base verb 'speak' आती है, 'spoke' नहीं।",
    },
    {
      id: "q-2",
      questionEn: "Find the incorrect sentence:",
      options: [
        { id: "a", text: "She didn't know the answer." },
        { id: "b", text: "Did they arrive on time?" },
        { id: "c", text: "We didn't understood what he said." },
        { id: "d", text: "What did you eat for lunch?" },
      ],
      correctOptionId: "c",
      explanationEn: "'We didn't understood' is incorrect. It must be 'We didn't understand'.",
      explanationHi: "'didn't understood' गलत है, सही वाक्य 'We didn't understand' होगा।",
    },
  ],
  xpReward: 50,
};
