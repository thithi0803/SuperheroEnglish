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

const topicScope: Record<string, { focus: string; answerExamples: string; forbidden: string }> = {
  'Greetings and Introductions': {
    focus: 'greetings, names, introductions, and polite leave-taking',
    answerExamples: 'hello, hi, goodbye, name, friend',
    forbidden: 'animal names, colors, food, numbers, body parts, sports',
  },
  'Colors and Animals': {
    focus: 'common animal names and the colors shown by the lesson emojis',
    answerExamples: 'cat, dog, bird, fish, blue, red, green, yellow',
    forbidden: 'counting questions, family roles, food, classroom objects, sports',
  },
  'Numbers and Counting': {
    focus: 'counting objects, number words, and simple addition or subtraction',
    answerExamples: 'one, two, three, four, five, six, seven, eight, nine, ten',
    forbidden: 'animal names, colors, food, family roles, body parts, sports, classroom objects',
  },
  'Family Members': {
    focus: 'family roles and simple family relationships',
    answerExamples: 'mother, father, sister, brother, grandmother, grandfather',
    forbidden: 'animal names, colors, counting, food, sports, classroom objects',
  },
  'Food and Drinks': {
    focus: 'common foods, drinks, tastes, and meals',
    answerExamples: 'apple, bread, rice, milk, water, juice',
    forbidden: 'animal names, colors as the main target, counting, family roles, sports',
  },
  'Daily Routines': {
    focus: 'everyday actions and times of day',
    answerExamples: 'wake up, eat, study, play, sleep, morning, evening',
    forbidden: 'animal names, colors, food vocabulary as the main target, family roles, sports',
  },
  'Body Parts': {
    focus: 'common body parts and simple actions using them',
    answerExamples: 'head, hand, eye, ear, nose, mouth, foot',
    forbidden: 'animal names, colors, counting, food, family roles, sports',
  },
  'Weather and Seasons': {
    focus: 'weather conditions and the four seasons',
    answerExamples: 'sunny, rainy, cloudy, windy, hot, cold, spring, summer',
    forbidden: 'animal names, counting, food, family roles, classroom objects',
  },
  'School and Classroom': {
    focus: 'classroom objects, school actions, and simple instructions',
    answerExamples: 'book, pen, desk, chair, teacher, read, write',
    forbidden: 'animal names, colors as the main target, counting, food, family roles',
  },
  'Hobbies and Sports': {
    focus: 'hobbies, games, and sports actions',
    answerExamples: 'football, swim, run, draw, sing, read, dance',
    forbidden: 'animal names, colors, counting, food, family roles, classroom objects',
  },
};

function buildPrompt(req: LessonRequest): string { 
  const scope = topicScope[req.topic] ?? {
    focus: req.topic,
    answerExamples: req.topic,
    forbidden: 'all unrelated topics',
  };
  const levelGuidance = {
    Beginner: 'Use very simple words suitable for ages 5-7. Basic 3-4 letter words. Present tense only.',
    Intermediate: 'Use simple words suitable for ages 8-10. Include simple past tense and basic adjectives.',
    Advanced: 'Use richer vocabulary suitable for ages 11-13. Include past tense, comparatives, and short complex sentences.',
  };

  return `You are an expert English Linguist, fact-checker, and teaching assistant for Vietnamese children. As an English Linguist, you MUST ensure every English sentence you produce is 100% grammatically correct and sounds completely natural to a native English speaker. NEVER produce mechanically assembled word strings, illogical combinations, or sentences with basic grammar errors (e.g. adjective order, subject-verb agreement, article usage). Every "correct_sentence", "example_en", "magic_phrase", "audio_text", and all answer options must pass a native-speaker grammar check before being included. You are also responsible for basic real-world accuracy. Create a superhero-themed English lesson.

Topic: "${req.topic}"
Level: ${req.level}
${levelGuidance[req.level]}

STRICT LESSON SCOPE:
- This lesson is isolated to the topic above: ${scope.focus}.
- Every vocabulary item, example, grammar sentence, multiple-choice question, fill-in-the-blank, sentence builder, listening sentence, image label, and answer option must teach or directly practice this topic.
- Valid answer examples for this topic include: ${scope.answerExamples}.
- Do not use material from these unrelated topics: ${scope.forbidden}.
- Do not fill missing questions with examples from another lesson. If a subtopic needs variety, create another example within this same topic.

CRITICAL LANGUAGE AND CONTENT RULES:
- ALL English text fields MUST contain ONLY English. NEVER mix Vietnamese into English fields.
- ALL Vietnamese text fields MUST contain ONLY Vietnamese. NEVER mix English into Vietnamese fields.
- The "translation" or "_vi" fields are SEPARATE translations, not mixed-language text.
- Fill-in-the-blank sentences MUST use three underscores "___" at the missing word position.
- Every exercise must be factually sensible for a child and consistent with ordinary real life.
- Do not make a color claim about an ordinary animal as if all animals of that kind have one fixed color. A real dog or bird can have many different colors.
- A color question about an animal is allowed ONLY when the question includes a specific visual cue made from emoji. The answer must match that visible cue. For example: "What color is the bird 🐦🔵?" with "blue" as the correct answer. Never ask "What color is the bird?" and invent a color without a visual cue.
- Do not use a stock photo or external image in the lesson data. Use emoji only. For a blue bird color question, use 🐦🔵 and use "blue" as the correct answer. The word "blue" must not appear in the question stem.
- If the emoji does not show one clear color, do not create a color question; choose another question type.
- If you use superheroes, monsters, magic, or imaginary characters, clearly identify them as fictional or name the imaginary character. Do not present fantasy details as facts about ordinary real-world objects.
- Before returning JSON, fact-check every question, correct answer, example, image label, and Vietnamese explanation against the actual visual cue. Each question must have one unambiguous answer.
- Never write an explanation that merely repeats an impossible premise; replace the question with a realistic one instead.
- Explanations must teach the visual cue naturally, for example "Con chim trong hình có màu xanh dương." Never write "Trong bài học này, con chim có màu đỏ" when the image shows blue.

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
        "question_en": "English question that does not reveal the answer in words; use a blank when the target word would otherwise appear in the stem",
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
- CRITICAL for multiple_choice: The question MUST NOT reveal the answer in words. Never put the target answer in the question and then ask "What is it?". For example, NEVER write "The superhero has a small cat 🐱. What is it?" with "cat" as an option.
- If the target word is an animal, use a blank: "The superhero has a small ___ 🐱. What animal is it?" with four animal options. The emoji is a visual cue, not a written answer. The word "cat" must not appear in the question stem.
- Every multiple-choice question must have exactly four options from the same answer category. Do not mix animals, colors, adjectives, numbers, or unrelated words in one set. For example, "cat, red, dog, fast" is forbidden.
- For visual color questions, include an emoji plus a clear color marker, such as "What color is the bird 🐦🔵?" The color must be represented visually, not written as a word in the question. The correct option must match the visual marker. Do not use a different color just because it is possible for that animal in real life.
- Do not ask a generic animal color question without a visual color marker. A real bird can be blue, red, green, white, black, or many other colors; the lesson must not pretend otherwise.
- Before returning JSON, verify the topic, the question wording, every option category, and every correct index. No answer may already appear as a written word in its question.
- The fill_in_blank.sentence MUST contain "___" (three underscores) at the missing word position.
- The fill_in_blank.options must have exactly 4 English word choices ALL from the same semantic category (all colors, all animals, all numbers, all actions, etc). NEVER mix categories. For example, "green, cat, bird, dog" is FORBIDDEN because it mixes a color with animals.
- The fill_in_blank correct answer must make a factually true and real-world sensible sentence when inserted. NEVER produce "The dog is ___" with "green" as the answer because dogs are not green. If the subject is an animal and the blank describes a property, use a realistic one (e.g. "big", "small", "fast", "happy") or restructure the sentence. If the blank is for a color, the subject must be something that genuinely comes in that color.
- The fill_in_blank.options must not contain a word that already appears in the sentence stem. For example, if the sentence is "The dog is ___", the word "dog" must not appear in options.
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

const answerCategories: Record<string, Set<string>> = {
  animals: new Set(['cat', 'dog', 'bird', 'fish', 'rabbit', 'mouse', 'cow', 'pig', 'frog', 'lion', 'tiger']),
  colors: new Set(['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'orange', 'pink', 'purple']),
  numbers: new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']),
  family: new Set(['mother', 'father', 'mom', 'dad', 'sister', 'brother', 'grandmother', 'grandfather']),
  food: new Set(['apple', 'bread', 'rice', 'milk', 'water', 'juice', 'banana', 'egg', 'cake']),
  body: new Set(['head', 'hand', 'eye', 'ear', 'nose', 'mouth', 'foot', 'leg', 'arm']),
};

const topicForbiddenTerms: Record<string, string[]> = {
  'Numbers and Counting': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.food, ...answerCategories.family],
  'Greetings and Introductions': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.numbers, ...answerCategories.food],
  'Colors and Animals': [...answerCategories.numbers, ...answerCategories.family, ...answerCategories.food, ...answerCategories.body],
  'Family Members': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.numbers, ...answerCategories.food],
  'Food and Drinks': [...answerCategories.animals, ...answerCategories.family, ...answerCategories.body],
  'Daily Routines': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.numbers, ...answerCategories.food, ...answerCategories.family, ...answerCategories.body],
  'Body Parts': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.numbers, ...answerCategories.food],
  'Weather and Seasons': [...answerCategories.animals, ...answerCategories.numbers, ...answerCategories.food, ...answerCategories.family, ...answerCategories.body],
  'School and Classroom': [...answerCategories.animals, ...answerCategories.family, ...answerCategories.food],
  'Hobbies and Sports': [...answerCategories.animals, ...answerCategories.colors, ...answerCategories.numbers, ...answerCategories.food, ...answerCategories.family, ...answerCategories.body],
};

function classifyAnswer(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return Object.entries(answerCategories).find(([, values]) => values.has(normalized))?.[0] ?? null;
}

function containsWholeAnswer(text: string, answer: string): boolean {
  const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  const normalizedAnswer = answer.toLowerCase().trim().replace(/[^a-z\s]/g, ' ');
  if (!normalizedAnswer) return false;
  const answerPattern = normalizedAnswer.replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${answerPattern}($|\\s)`).test(normalizedText);
}

function hasBasicContentError(lesson: GeminiLesson, topic: string, level: Level): boolean {
  if (lesson.topic !== topic || lesson.level !== level) return true;
  if (lesson.stage2.multiple_choice.length !== 3) return true;

  const lessonText = JSON.stringify({
    vocab: lesson.stage1.vocab,
    multiple_choice: lesson.stage2.multiple_choice,
    fill_in_blank: lesson.stage2.fill_in_blank,
    sentence_builder: lesson.stage2.sentence_builder,
    listening: lesson.stage2.listening,
  }).toLowerCase();
  const forbiddenTerms = topicForbiddenTerms[topic] ?? [];
  if (forbiddenTerms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(lessonText))) return true;

  const mcError = lesson.stage2.multiple_choice.some((question) => {
    const questionText = question.question_en.trim();
    const correctAnswer = question.options[question.correct_index]?.trim().toLowerCase();
    const asksColor = /what color|which color/i.test(questionText);
    const hasVisualCue = /🐦|🦜|🐶|🐕|🐱|🐈|🐰|🐭|🐮|🐷|🐸|🦁|🐯|🐻|🐼|🐨|🐵|🦊|🐺|🐴|🦄|🐔|🦆|🦉|🦋|🐝|🐠|🐟|🦈/.test(questionText)
      || /drawing|picture|image|toy|cartoon/i.test(questionText);
    const optionCategories = new Set(question.options.map(classifyAnswer).filter((c): c is string => c !== null));

    if (asksColor && !hasVisualCue) return true;
    if (optionCategories.size > 1) return true;
    if (containsWholeAnswer(questionText, correctAnswer)) return true;
    if (/\b(bird|the bird)\b/i.test(questionText) && /🐦|🐤|🐥|🦜|🦆/.test(questionText) && correctAnswer !== 'blue') return true;
    if (/\b(dog|the dog)\b/i.test(questionText) && /🐶|🐕/.test(questionText) && correctAnswer === 'blue') return true;

    return false;
  });
  if (mcError) return true;

  const fill = lesson.stage2.fill_in_blank;
  const fillAnswer = fill.options[fill.correct_index]?.trim().toLowerCase() ?? '';
  const fillSentencePlain = fill.sentence.replace(/___/g, ' ').replace(/[^a-z\s]/gi, ' ').toLowerCase();
  const fillOptionCategories = new Set(fill.options.map(classifyAnswer).filter((c): c is string => c !== null));

  if (fillOptionCategories.size > 1) return true;
  if (containsWholeAnswer(fillSentencePlain, fillAnswer)) return true;
  if (!fill.sentence.includes('___')) return true;

  const subjectAnimal = /\b(dog|cat|bird|fish|rabbit|cow|pig|frog|lion|tiger)\b/i.exec(fill.sentence)?.[1]?.toLowerCase();
  if (subjectAnimal && classifyAnswer(fillAnswer) === 'colors') return true;

  return false;
}

export async function generateLesson(req: LessonRequest): Promise<GeminiLesson> {
  console.log(`[Gemini] Generating lesson: topic="${req.topic}", level=${req.level}, index=${req.lessonIndex}`);

  try {
    const qualityReminder = '\n\nQUALITY CHECK: The previous attempt violated lesson isolation or revealed an answer. Rebuild every exercise using only the requested topic. Keep all four options in one semantic category, remove any written answer from the question stem, and never borrow examples from another lesson.';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const text = await callGemini(buildPrompt(req) + (attempt > 0 ? qualityReminder : ''));
      const lesson = parseJsonResponse<GeminiLesson>(text);
      if (!hasBasicContentError(lesson, req.topic, req.level)) {
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
