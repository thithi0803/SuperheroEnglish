import { useAuth } from '@/context/AuthContext';
import { fetchLessonCompletions } from '@/lib/lessonService';
import type { LessonCompletion } from '@/types';
import { useEffect, useState } from 'react';
import { Zap, Star, Flame, BookOpen, ArrowRight, Trophy, Sparkles } from 'lucide-react';

interface Props {
  onStartLesson: () => void;
  onViewProgress: () => void;
}

export function HomeDashboard({ onStartLesson, onViewProgress }: Props) {
  const { profile } = useAuth();
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchLessonCompletions(profile.id).then(setCompletions).catch(() => {});
  }, [profile?.id]);

  const level = profile?.placement_level || 'Beginner';
  const levelLabel = { Beginner: 'Cơ Bản', Intermediate: 'Trung Cấp', Advanced: 'Nâng Cao' };
  const levelColor = { Beginner: 'text-green-400', Intermediate: 'text-amber-400', Advanced: 'text-red-400' };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-500 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-10">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="text-6xl">{profile?.avatar_emoji || '🦸'}</div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              Xin chào, {profile?.display_name || 'Siêu Nhân'}!
            </h1>
            <p className="text-slate-400 mt-1">Sẵn sàng học tiếng Anh hôm nay?</p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cấp độ: </span>
            <span className={`font-bold ${levelColor[level]}`}>{levelLabel[level]}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4">
            <StatCard icon={<Zap className="w-5 h-5" />} label="XP" value={profile?.total_xp || 0} color="text-amber-400" />
            <StatCard icon={<Star className="w-5 h-5" />} label="Sao" value={profile?.total_stars || 0} color="text-yellow-400" />
            <StatCard icon={<Flame className="w-5 h-5" />} label="Chuỗi" value={`${profile?.streak || 0} ngày`} color="text-orange-400" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={onStartLesson}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:scale-105 transition-all"
            >
              <BookOpen className="w-5 h-5" />
              Bắt Đầu Học
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onViewProgress}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-lg hover:bg-white/20 hover:scale-105 transition-all"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              Tiến Độ
            </button>
          </div>

          {completions.length > 0 && (
            <div className="w-full max-w-lg mt-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Bài gần đây</h3>
              <div className="space-y-2">
                {completions.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < c.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-slate-300 flex-1 truncate">{c.lesson_key}</span>
                    <span className="text-xs text-amber-400 font-bold">{c.xp_earned} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 flex flex-col items-center gap-1">
      <div className={color}>{icon}</div>
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}
