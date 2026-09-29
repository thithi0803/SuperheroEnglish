import { useAuth } from '@/context/AuthContext';
import { fetchLessonCompletions } from '@/lib/lessonService';
import type { LessonCompletion } from '@/types';
import { useEffect, useState } from 'react';
import { Zap, Star, Flame, BookOpen, Trophy, Award, LogOut } from 'lucide-react';

interface Props {
  onSignOut: () => void;
}

export function ProgressDashboard({ onSignOut }: Props) {
  const { profile } = useAuth();
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchLessonCompletions(profile.id).then(setCompletions).catch(() => {});
  }, [profile?.id]);

  const level = profile?.placement_level || 'Beginner';
  const levelLabel = { Beginner: 'Cơ Bản', Intermediate: 'Trung Cấp', Advanced: 'Nâng Cao' };
  const levelColor = {
    Beginner: 'from-green-500 to-emerald-500',
    Intermediate: 'from-amber-500 to-yellow-500',
    Advanced: 'from-red-500 to-orange-500',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-24 md:pb-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-red-500 mb-4 shadow-lg shadow-amber-500/30">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Tiến Độ Của Bé</h2>
        <p className="text-slate-400">Hành trình trở thành siêu nhân tiếng Anh</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{profile?.avatar_emoji || '🦸'}</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-white">{profile?.display_name}</h3>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${levelColor[level]} text-white text-xs font-bold mt-1`}>
              <Award className="w-3.5 h-3.5" />
              {levelLabel[level]}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Zap className="w-6 h-6" />} label="Tổng XP" value={profile?.total_xp || 0} color="from-amber-500 to-yellow-500" />
        <StatCard icon={<Star className="w-6 h-6" />} label="Tổng Sao" value={profile?.total_stars || 0} color="from-yellow-400 to-orange-500" />
        <StatCard icon={<BookOpen className="w-6 h-6" />} label="Bài Hoàn Thành" value={completions.length} color="from-green-500 to-emerald-500" />
        <StatCard icon={<Flame className="w-6 h-6" />} label="Chuỗi Ngày" value={profile?.streak || 0} color="from-orange-500 to-red-500" />
      </div>

      {/* Lesson History */}
      <div className="mb-8">
        <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Lịch Sử Bài Học
        </h3>
        {completions.length === 0 ? (
          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-8 text-center">
            <p className="text-slate-400">Chưa có bài học nào hoàn thành. Bắt đầu bài đầu tiên nhé!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completions.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-xl bg-slate-800/80 border border-white/10 p-4 hover:border-amber-500/20 transition-colors">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < c.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{c.lesson_key}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(c.completed_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-amber-400">{c.score}%</div>
                  <div className="text-xs text-slate-400">+{c.xp_earned} XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/20 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Đăng Xuất
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-slate-800/80 border border-white/10 p-4 text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${color} mb-2`}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}
