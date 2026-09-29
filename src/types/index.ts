export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  placement_level: Level | null;
  total_xp: number;
  total_stars: number;
  streak: number;
  last_active_date: string | null;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_key: string;
  score: number;
  stars: number;
  xp_earned: number;
  completed_at: string;
}

export interface VocabItem {
  word: string;
  emoji: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
}

export interface GrammarPoint {
  pattern: string;
  explanation_vi: string;
  example_en: string;
  example_vi: string;
}

export interface MultipleChoiceQuestion {
  question_vi: string;
  question_en: string;
  options: string[];
  correct_index: number;
  explanation_vi: string;
}

export interface SentenceBuilderQuestion {
  instruction_vi: string;
  scrambled_words: string[];
  correct_sentence: string;
  translation_vi: string;
}

export interface ListeningQuestion {
  audio_text: string;
  image_options: { emoji: string; label: string }[];
  correct_index: number;
}

export interface BossChallenge {
  magic_phrase_en: string;
  magic_phrase_vi: string;
  boss_emoji: string;
  boss_name: string;
  boss_hp: number;
}

export interface GeminiLesson {
  lesson_key: string;
  title_vi: string;
  title_en: string;
  topic: string;
  level: Level;
  emoji: string;
  stage1: {
    intro_vi: string;
    intro_en: string;
    vocab: VocabItem[];
    grammar: GrammarPoint;
    magic_phrase: string;
    magic_phrase_vi: string;
  };
  stage2: {
    multiple_choice: MultipleChoiceQuestion[];
    sentence_builder: SentenceBuilderQuestion;
    listening: ListeningQuestion;
  };
  stage3: {
    boss_challenge: BossChallenge;
  };
}

export interface PlacementQuestion {
  id: string;
  question_en: string;
  question_vi: string;
  options: string[];
  correct_index: number;
}
