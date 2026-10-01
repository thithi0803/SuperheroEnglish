import type { GeminiLesson, Level, PlacementQuestion } from '@/types';
import { supabase } from '@/lib/supabase';
interface LessonRequest {
  topic: string;
  level: Level;
  lessonIndex: number;
}

class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new GeminiError('Không thể phân tích phản hồi từ AI. Vui lòng thử lại.');
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      throw new GeminiError('AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
    }
  }
}

async function callGemini(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>('generate-lesson', {
    body: { prompt },
  });

  if (error || !data?.text) {
    throw new GeminiError(data?.error || 'Không thể kết nối tới AI. Vui lòng thử lại.');
  }

  return data.text;
}

export function getTopicList(): { topic: string; emoji: string }[] {
  return [
    { topic: 'Greetings and Introductions', emoji: '👋' },
    { topic: 'Colors and Animals', emoji: '🎨' },
    { topic: 'Numbers and Counting', emoji: '🔢' },
    { topic: 'Family Members', emoji: '👨‍👩‍👧‍👦' },
    { topic: 'Food and Drinks', emoji: '🍔' },
    { topic: 'Daily Routines', emoji: '⏰' },
    { topic: 'Body Parts', emoji: '🧍' },
    { topic: 'Weather and Seasons', emoji: '🌤️' },
    { topic: 'School and Classroom', emoji: '🏫' },
    { topic: 'Hobbies and Sports', emoji: '⚽' },
  ];
}

function buildPrompt(req: LessonRequest): string {
  const levelGuidance = {
    Beginner: 'Use very simple words suitable for ages 5-7. Basic 3-4 letter words. Present tense only.',
    Intermediate: 'Use simple words suitable for ages 8-10. Include simple past tense and basic adjectives.',
    Advanced: 'Use richer vocabulary suitable for ages 11-13. Include past tense, comparatives, and short complex sentences.',
  };

  return `You are an expert English Linguist, fact-checker, and teaching assistant for Vietnamese children. As an English Linguist, you MUST ensure every English sentence you produce is 100% grammatically correct and sounds completely natural to a native English speaker. NEVER produce mechanically assembled word strings, illogical combinations, or sentences with basic grammar errors (e.g. adjective order, subject-verb agreement, article usage). Every "correct_sentence", "example_en", "magic_phrase", "audio_text", and all answer options must pass a native-speaker grammar check before being included. You are also responsible for basic real-world accuracy. Create a superhero-themed English lesson.

Topic: "${req.topic}"
Level: ${req.level}
${levelGuidance[req.level]}

CRITICAL LANGUAGE AND CONTENT RULES:
- ALL English text fields MUST contain ONLY English. NEVER mix Vietnamese into English fields.
- ALL Vietnamese text fields MUST contain ONLY Vietnamese. NEVER mix English into Vietnamese fields.
- The "translation" or "_vi" fields are SEPARATE translations, not mixed-language text.
- Fill-in-the-blank sentences MUST use three underscores "___" at the missing word position.
- Every exercise must be factually sensible for a child and consistent with ordinary real life.
- Do not state that an ordinary animal, object, food, or person has an unusual property as a fact. For example, NEVER make "blue" the correct answer to "What color is the dog?" or say that a normal dog is blue.
- For common animals and objects, use typical recognizable properties: a dog is commonly shown as brown, black, white, or spotted; grass is green; the sky is blue; bananas are usually yellow. Do not treat these examples as absolute rules when the sentence explicitly says "a blue toy dog" or describes a fictional character.
- If you use superheroes, monsters, magic, or imaginary characters, clearly identify them as fictional or name the imaginary character. Do not present fantasy details as facts about ordinary real-world objects.
- Before returning JSON, fact-check every question, correct answer, example, image label, and Vietnamese explanation against basic everyday knowledge. Each question must have one unambiguous answer.
- Never write an explanation that merely repeats an impossible premise; replace the question with a realistic one instead.
- Explanations must teach the real answer naturally. Never write "In this lesson, the dog is blue" to justify an ordinary real-world fact.

Generate a JSON object with EXACTLY this structure (respond with ONLY the JSON, no markdown, no code fences):

{
  "lesson_key": "${req.topic}-${req.level}-${req.lessonIndex}",
  "title_vi": "Vietnamese title for the lesson (Vietnamese only)",
  "title_en": "English title for the lesson (English only)",
  "topic": "${req.topic}",
  "level": "${req.level}",
  "emoji": "single emoji representing the topic",
  "stage1": {
    "intro_vi": "Vietnamese intro (Vietnamese only)",
    "intro_en": "English intro (English only)",
    "vocab": [
      {"word": "English word", "emoji": "emoji", "meaning_vi": "Vietnamese meaning (Vietnamese only)", "example_en": "English example sentence (English only)", "example_vi": "Vietnamese translation (Vietnamese only)"},
      {"word": "...", "emoji": "...", "meaning_vi": "...", "example_en": "...", "example_vi": "..."},
      {"word": "...", "emoji": "...", "meaning_vi": "...", "example_en": "...", "example_vi": "..."}
    ],
    "grammar": {
      "pattern": "Short grammar pattern in English (e.g. I am ___)",
      "explanation_vi": "Vietnamese explanation (Vietnamese only)",
      "example_en": "English example sentence (English only)",
      "example_vi": "Vietnamese translation (Vietnamese only)"
    },
    "magic_phrase": "Short English sentence (English only)",
    "magic_phrase_vi": "Vietnamese translation (Vietnamese only)"
  },
  "stage2": {
    "multiple_choice": [
      {
        "question_en": "English question with the complete noun and an optional emoji beside it (e.g. 'What color is the dog 🐶?' NOT a question that uses only an emoji)",
        "question_vi": "Vietnamese translation of the question (Vietnamese only)",
        "options": ["English option 1", "English option 2", "English option 3", "English option 4"],
        "correct_index": 0,
        "explanation_vi": "Vietnamese explanation (Vietnamese only)"
      },
      {
        "question_en": "...", "question_vi": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_vi": "..."
      },
      {
        "question_en": "...", "question_vi": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_vi": "..."
      }
    ],
    "fill_in_blank": {
      "sentence": "English sentence with ___ at the missing word position (English only, MUST contain ___)",
      "translation_vi": "Vietnamese translation of the full sentence (Vietnamese only)",
      "options": ["English word 1", "English word 2", "English word 3", "English word 4"],
      "correct_index": 0,
      "explanation_vi": "Vietnamese explanation (Vietnamese only)"
    },
    "sentence_builder": {
      "instruction_vi": "Vietnamese instruction (Vietnamese only)",
      "scrambled_words": ["English word 1", "English word 2", "English word 3", "English word 4", "English word 5"],
      "correct_sentence": "The correct English sentence (English only)",
      "translation_vi": "Vietnamese translation (Vietnamese only)"
    },
    "listening": {
      "audio_text": "English sentence for listening (English only)",
      "image_options": [
        {"emoji": "emoji1", "label": "English label 1"},
        {"emoji": "emoji2", "label": "English label 2"},
        {"emoji": "emoji3", "label": "English label 3"},
        {"emoji": "emoji4", "label": "English label 4"}
      ],
      "correct_index": 0
    }
  },
  "stage3": {
    "boss_challenge": {
      "magic_phrase_en": "English magic phrase (English only)",
      "magic_phrase_vi": "Vietnamese translation (Vietnamese only)",
      "boss_emoji": "emoji for the boss monster",
      "boss_name": "English name for the boss (English only)",
      "boss_hp": 100
    }
  }
}

IMPORTANT RULES:
- Generate exactly 3 vocabulary items in stage1.vocab
- Generate exactly 3 multiple choice questions in stage2.multiple_choice
- CRITICAL for multiple_choice: The question MUST NOT reveal the answer. NEVER replace an English noun, character name, or vocabulary word with an emoji alone. Always include the complete English word and optionally place an emoji beside it: "What color is the dog 🐶?" or "What does the superhero 🦸‍♂️ say to a friend?". Do not use "What color is 🐶?" or "What does 🦸‍♂️ say?".
- For real-world knowledge questions, the correct answer must describe the ordinary real-world subject, not an unusual fantasy version. Do not use a blue dog, purple sun, square ball, or similar impossible premise unless the sentence explicitly describes a toy, drawing, costume, or fictional character.
- The fill_in_blank.sentence MUST contain "___" (three underscores) at the missing word position
- The fill_in_blank.options must have exactly 4 English word choices
- The sentence_builder.scrambled_words must contain exactly the same words as correct_sentence, only shuffled
- The sentence_builder.correct_sentence MUST be a complete, natural, grammatically correct English sentence. Check word order, adjective order, articles, subject-verb agreement, and punctuation before returning it. Never create fragments such as "The cat is big red"; use natural grammar such as "The cat is big and red" or "The big red cat".
- The listening.audio_text should be a simple English sentence related to the topic
- The listening image_options should have 4 choices with emojis
- The magic_phrase should use the grammar pattern from stage1
- All "_vi" fields contain ONLY Vietnamese text, never English
- All "_en" fields and non-"_vi" fields contain ONLY English text, never Vietnamese
- Final content review: reject and rewrite any item that is grammatically correct but semantically absurd or misleading for a child, especially questions about colors, animal features, food, body parts, numbers, or everyday objects.
- Each lesson must be UNIQUE - use different vocabulary, grammar patterns, and questions for each topic
- Make it fun and superhero-themed where possible
- Respond with ONLY raw JSON, no markdown formatting
- GRAMMAR RULE: Every English sentence must be 100% grammatically correct and natural. Adjective order must follow English rules (opinion → size → color, e.g. "a big red cat" NOT "a red big cat"). Never produce word-salad sentences`;
}

function hasBasicContentError(lesson: GeminiLesson): boolean {
  const realWorldColorRules: Array<{ subject: RegExp; allowed: string[] }> = [
    { subject: /what color is (the )?dog\b/i, allowed: ['brown', 'black', 'white', 'spotted'] },
    { subject: /what color is (the )?grass\b/i, allowed: ['green'] },
    { subject: /what color is (the )?sky\b/i, allowed: ['blue'] },
    { subject: /what color is (the )?banana\b/i, allowed: ['yellow'] },
  ];

  return lesson.stage2.multiple_choice.some((question) => {
    const questionText = question.question_en.trim();
    const correctAnswer = question.options[question.correct_index]?.trim().toLowerCase();
    const isExplicitlyImaginary = /toy|drawing|cartoon|fictional|imaginary|magic/i.test(questionText);
    if (isExplicitlyImaginary) return false;

    return realWorldColorRules.some(({ subject, allowed }) => (
      subject.test(questionText) && !allowed.includes(correctAnswer)
    ));
  });
}

export async function generateLesson(req: LessonRequest): Promise<GeminiLesson> {
  console.log(`[Gemini] Generating lesson: topic="${req.topic}", level=${req.level}, index=${req.lessonIndex}`);

  try {
    const qualityReminder = '\n\nQUALITY CHECK: The previous attempt contained an everyday-knowledge error. Recheck every real-world fact before returning JSON. Do not ask about an ordinary dog, grass, sky, or banana with an unusual color as the correct answer. If unsure, replace the question with a simple, realistic question.';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const text = await callGemini(buildPrompt(req) + (attempt > 0 ? qualityReminder : ''));
      const lesson = parseJsonResponse<GeminiLesson>(text);
      if (!hasBasicContentError(lesson)) {
        console.log(`[Gemini] Lesson generated successfully: "${lesson.title_en}" with ${lesson.stage1.vocab.length} vocab items`);
        return lesson;
      }
      console.warn('[Gemini] Rejected lesson with an everyday-knowledge error; requesting a corrected lesson.');
    }

    throw new GeminiError('Bài học tạo ra có nội dung chưa chính xác. Vui lòng thử lại.');
  } catch (err) {
    console.error('[Gemini] Failed to generate lesson:', err);
    throw err;
  }
}

export async function generatePlacementQuestions(): Promise<{ questions: PlacementQuestion[] }> {
  console.log('[Gemini] Generating 30 placement questions...');

  const prompt = `You are an expert English Linguist and placement test creator for Vietnamese children learning English. Every English sentence and option you write MUST be 100% grammatically correct and natural to a native English speaker.
Create 30 multiple-choice questions that range from very easy to moderately difficult to determine if the child is Beginner, Intermediate, or Advanced level.

CRITICAL LANGUAGE RULES:
- The "question_en" field MUST contain ONLY English text, never Vietnamese.
- The "question_vi" field MUST contain ONLY Vietnamese text, never English.
- The "options" MUST be in English only.

Respond with ONLY raw JSON (no markdown, no code fences):
{
  "questions": [
    {
      "id": "p1",
      "question_en": "English question (English only)",
      "question_vi": "Vietnamese translation of the question (Vietnamese only)",
      "options": ["English option 1", "English option 2", "English option 3", "English option 4"],
      "correct_index": 0
    },
    ... (30 questions total, p1 through p30)
  ]
}

Rules:
- Questions 1-10: Very easy (colors, numbers, simple greetings, animals, basic nouns) -> Beginner level
- Questions 11-22: Medium (simple grammar, family, daily routines, food, present continuous) -> Intermediate level
- Questions 23-30: Harder (past tense, comparatives, longer sentences, prepositions) -> Advanced level
- Each question has exactly 4 options
- All options must be in English only
- Every English sentence and answer option must be 100% grammatically correct and natural to a native English speaker.
- Never use an emoji as a replacement for an English word.
- Before returning JSON, proofread every English sentence and correct any unnatural or mechanically assembled wording.
- Respond with ONLY raw JSON`;

  try {
    const text = await callGemini(prompt);
    const result = parseJsonResponse<{ questions: PlacementQuestion[] }>(text);
    console.log(`[Gemini] Placement questions generated: ${result.questions.length} questions`);
    return result;
  } catch (err) {
    console.error('[Gemini] Failed to generate placement questions:', err);
    throw err;
  }
}
