import { useAuth } from '@/context/AuthContext';
import { getTopicList } from '@/lib/gemini';
import { fetchLessonCompletions } from '@/lib/lessonService';
import type { LessonCompletion, Level } from '@/types';
import { useEffect, useState } from 'react';
import { Star, Lock, CheckCircle2, ArrowRight, Sparkles, Zap } from 'lucide-react';

interface Props {
  onStartLesson: (topic: string, emoji: string, lessonIndex: number) => void;
}

export function LessonHub({ onStartLesson }: Props) {
  const { profile } = useAuth();
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const level = profile?.placement_level || 'Beginner';
  const topics = getTopicList();

  useEffect(() => {
    if (!profile?.id) return;
    fetchLessonCompletions(profile.id)
      .then(setCompletions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const getCompletionFor = (lessonKey: string) => {
    return completions.find((c) => c.lesson_key === lessonKey);
  };

  const levelLabel = {
    Beginner: 'Cơ Bản',
    Intermediate: 'Trung Cấp',
    Advanced: 'Nâng Cao',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-24 md:pb-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <h2 className="text-3xl font-black text-white">Chọn Nhiệm Vụ</h2>
        </div>
        <p className="text-slate-400">
          Cấp độ hiện tại: <span className="font-bold text-amber-400">{levelLabel[level]}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((item, index) => {
          const lessonKey = `${item.topic}-${level}-${index}`;
          const completion = getCompletionFor(lessonKey);
          const isCompleted = !!completion;
          const isLocked = index > 0 && !getCompletionFor(`${topics[index - 1].topic}-${level}-${index - 1}`);

          return (
            <button
              key={index}
              onClick={() => !isLocked && onStartLesson(item.topic, item.emoji, index)}
              disabled={isLocked}
              className={`group relative text-left rounded-2xl p-5 border transition-all duration-300 ${
                isLocked
                  ? 'bg-slate-800/30 border-slate-700/30 cursor-not-allowed opacity-50'
                  : isCompleted
                  ? 'bg-slate-800/80 border-green-500/30 hover:border-green-500/60 hover:scale-[1.02]'
                  : 'bg-slate-800/80 border-white/10 hover:border-amber-500/40 hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{item.emoji}</span>
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                {isLocked && <Lock className="w-5 h-5 text-slate-500" />}
              </div>

              <h3 className="text-base font-bold text-white mb-1">{item.topic}</h3>
              <p className="text-xs text-slate-400 mb-3">Bài {index + 1} - {levelLabel[level]}</p>

              {isCompleted && (
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < completion.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                  <span className="text-xs text-slate-400 ml-2">{completion.xp_earned} XP</span>
                </div>
              )}

              {!isLocked && (
                <div className="flex items-center gap-1 text-sm font-bold text-amber-400 group-hover:gap-2 transition-all">
                  {isCompleted ? 'Học lại' : 'Bắt đầu'}
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8">
          <Sparkles className="w-6 h-6 text-amber-400 mx-auto animate-spin" />
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20 p-5">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-amber-400" />
          <div>
            <h4 className="font-bold text-white">Mỗi bài học có 3 chặng</h4>
            <p className="text-sm text-slate-400">
              Chặng 1: Nạp năng lượng - Chặng 2: Vượt chướng ngại - Chặng 3: Trận chiến cuối cùng
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
