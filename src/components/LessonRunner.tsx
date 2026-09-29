import { useState, useEffect } from 'react';
import type { GeminiLesson, Level } from '@/types';
import { generateLesson } from '@/lib/gemini';
import { Stage1 } from '@/components/Stage1';
import { Stage2 } from '@/components/Stage2';
import { Stage3 } from '@/components/Stage3';
import { Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';

interface Props {
  topic: string;
  emoji: string;
  lessonIndex: number;
  level: Level;
  onComplete: (score: number, stars: number, xp: number) => void;
  onExit: () => void;
}

type Stage = 'loading' | 'error' | 'stage1' | 'stage2' | 'stage3';

export function LessonRunner({ topic, emoji, lessonIndex, level, onComplete, onExit }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [lesson, setLesson] = useState<GeminiLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage2Score, setStage2Score] = useState(0);

  useEffect(() => {
    loadLesson();
  }, []);

  const loadLesson = async () => {
    setStage('loading');
    setError(null);
    try {
      const data = await generateLesson({ topic, level, lessonIndex });
      setLesson(data);
      setStage('stage1');
    } catch (err) {
      console.error('[LessonRunner] Failed to load lesson:', err);
      setError('Không thể tải bài học từ Gemini AI. Vui lòng thử lại.');
      setStage('error');
    }
  };

  const handleStage1Complete = () => {
    setStage('stage2');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStage2Complete = (score: number) => {
    setStage2Score(score);
    setStage('stage3');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStage3Complete = (score: number) => {
    const finalScore = Math.round((stage2Score + score) / 2);
    const stars = finalScore >= 90 ? 3 : finalScore >= 70 ? 2 : 1;
    const baseXp = level === 'Beginner' ? 50 : level === 'Intermediate' ? 70 : 100;
    const xp = Math.round(baseXp * (finalScore / 100));
    onComplete(finalScore, stars, xp);
  };

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{emoji}</div>
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-black text-white mb-2">Đang tạo bài học...</h2>
          <p className="text-slate-400 text-sm">Gemini AI đang chuẩn bị "{topic}" cho bé</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">{error}</h2>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={loadLesson}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold"
            >
              Thử Lại
            </button>
            <button
              onClick={onExit}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
            >
              Quay Lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Thoát bài học
        </button>
      </div>

      {stage === 'stage1' && <Stage1 lesson={lesson} onComplete={handleStage1Complete} />}
      {stage === 'stage2' && <Stage2 lesson={lesson} onComplete={handleStage2Complete} />}
      {stage === 'stage3' && <Stage3 lesson={lesson} onComplete={handleStage3Complete} />}
    </div>
  );
}
