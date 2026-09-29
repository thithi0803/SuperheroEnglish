import { supabase } from '@/lib/supabase';
import type { Level, LessonCompletion } from '@/types';

export async function fetchLessonCompletions(userId: string): Promise<LessonCompletion[]> {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return (data || []) as LessonCompletion[];
}

export async function saveLessonCompletion(
  userId: string,
  lessonKey: string,
  score: number,
  stars: number,
  xpEarned: number
): Promise<void> {
  const { error } = await supabase
    .from('lesson_completions')
    .insert({
      user_id: userId,
      lesson_key: lessonKey,
      score,
      stars,
      xp_earned: xpEarned,
    });

  if (error) throw error;

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, total_stars')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    await supabase
      .from('profiles')
      .update({
        total_xp: (profile.total_xp || 0) + xpEarned,
        total_stars: (profile.total_stars || 0) + stars,
      })
      .eq('id', userId);
  }
}

export function calculateStars(score: number): number {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  return 1;
}

export function calculateXp(score: number, level: Level): number {
  const base = level === 'Beginner' ? 50 : level === 'Intermediate' ? 70 : 100;
  return Math.round(base * (score / 100));
}
