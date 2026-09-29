import type { GeminiLesson, Level, PlacementQuestion } from '@/types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

interface LessonRequest {
  topic: string;
  level: Level;
  lessonIndex: number;
}

function cleanResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  return cleaned.trim();
}

function parseJsonResponse<T>(text: string): T {
  const cleaned = cleanResponse(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse response as JSON');
    return JSON.parse(jsonMatch[0]) as T;
  }
}

async function callGemini(prompt: string, maxRetries = 2): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.status === 503 && attempt < maxRetries) {
        console.warn(`[Gemini] 503 Service Unavailable, retrying (${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini API returned no content');
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries && !(err instanceof Error && err.message.includes('API error'))) {
        console.warn(`[Gemini] Attempt ${attempt + 1} failed, retrying...`, lastError.message);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Unknown Gemini API error');
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

  return `You are an English teaching assistant for Vietnamese children. Create a superhero-themed English lesson.

Topic: "${req.topic}"
Level: ${req.level}
${levelGuidance[req.level]}

Generate a JSON object with EXACTLY this structure (respond with ONLY the JSON, no markdown, no code fences):

{
  "lesson_key": "${req.topic}-${req.level}-${req.lessonIndex}",
  "title_vi": "Vietnamese title for the lesson",
  "title_en": "English title for the lesson",
  "topic": "${req.topic}",
  "level": "${req.level}",
  "emoji": "single emoji representing the topic",
  "stage1": {
    "intro_vi": "Vietnamese intro telling the child they will learn vocabulary and a grammar pattern to prepare for battle",
    "intro_en": "English version of the intro",
    "vocab": [
      {"word": "English word", "emoji": "emoji", "meaning_vi": "Vietnamese meaning", "example_en": "Short English example sentence", "example_vi": "Vietnamese translation of example"},
      {"word": "...", "emoji": "...", "meaning_vi": "...", "example_en": "...", "example_vi": "..."},
      {"word": "...", "emoji": "...", "meaning_vi": "...", "example_en": "...", "example_vi": "..."}
    ],
    "grammar": {
      "pattern": "Short grammar pattern (e.g. I am ___)",
      "explanation_vi": "Vietnamese explanation of the pattern",
      "example_en": "English example sentence using the pattern",
      "example_vi": "Vietnamese translation"
    },
    "magic_phrase": "A short English sentence the child will say in Stage 3 to defeat the boss (uses the grammar pattern)",
    "magic_phrase_vi": "Vietnamese translation of the magic phrase"
  },
  "stage2": {
    "multiple_choice": [
      {
        "question_vi": "Vietnamese question asking to choose the correct English word/answer",
        "question_en": "English version",
        "options": ["option1", "option2", "option3", "option4"],
        "correct_index": 0,
        "explanation_vi": "Vietnamese explanation of why the answer is correct"
      },
      {
        "question_vi": "...", "question_en": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_vi": "..."
      },
      {
        "question_vi": "...", "question_en": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_vi": "..."
      }
    ],
    "sentence_builder": {
      "instruction_vi": "Vietnamese instruction asking the child to arrange words into a correct sentence",
      "scrambled_words": ["word1", "word2", "word3", "word4", "word5"],
      "correct_sentence": "The correct sentence formed from the words",
      "translation_vi": "Vietnamese translation of the correct sentence"
    },
    "listening": {
      "audio_text": "An English sentence for the child to listen to and choose the matching image",
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
      "magic_phrase_en": "The English magic phrase the child must speak aloud (same as stage1 magic_phrase)",
      "magic_phrase_vi": "Vietnamese translation",
      "boss_emoji": "emoji for the boss monster",
      "boss_name": "English name for the boss",
      "boss_hp": 100
    }
  }
}

IMPORTANT RULES:
- Generate exactly 3 vocabulary items in stage1.vocab
- Generate exactly 3 multiple choice questions in stage2.multiple_choice
- The sentence_builder.scrambled_words should have 5-6 words to arrange
- The listening.audio_text should be a simple sentence related to the topic
- The listening image_options should have 4 choices with emojis
- The magic_phrase should use the grammar pattern from stage1
- All Vietnamese text should be natural Vietnamese
- All English should be at the appropriate difficulty for the level
- Make it fun and superhero-themed where possible
- Each lesson must be UNIQUE and different from other lessons - use different vocabulary, grammar patterns, and questions for each topic
- Respond with ONLY raw JSON, no markdown formatting`;
}

export async function generateLesson(req: LessonRequest): Promise<GeminiLesson> {
  console.log(`[Gemini] Generating lesson: topic="${req.topic}", level=${req.level}, index=${req.lessonIndex}`);

  const text = await callGemini(buildPrompt(req));
  const lesson = parseJsonResponse<GeminiLesson>(text);
  console.log(`[Gemini] Lesson generated successfully: "${lesson.title_en}" with ${lesson.stage1.vocab.length} vocab items`);
  return lesson;
}

export async function generatePlacementQuestions(): Promise<{ questions: PlacementQuestion[] }> {
  console.log('[Gemini] Generating 30 placement questions...');

  const prompt = `You are an English placement test creator for Vietnamese children learning English.
Create 30 multiple-choice questions that range from very easy to moderately difficult to determine if the child is Beginner, Intermediate, or Advanced level.

Respond with ONLY raw JSON (no markdown, no code fences):
{
  "questions": [
    {
      "id": "p1",
      "question_en": "English question",
      "question_vi": "Vietnamese translation of question",
      "options": ["option1", "option2", "option3", "option4"],
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
- All text in both English and Vietnamese
- Respond with ONLY raw JSON`;

  const text = await callGemini(prompt);
  const result = parseJsonResponse<{ questions: PlacementQuestion[] }>(text);
  console.log(`[Gemini] Placement questions generated: ${result.questions.length} questions`);
  return result;
}
