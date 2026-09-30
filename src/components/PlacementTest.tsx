import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { generatePlacementQuestions } from '@/lib/gemini';
import type { PlacementQuestion, Level } from '@/types';
import { Shield, Check, X, ArrowRight, Sparkles, Trophy } from 'lucide-react';

interface Props {
  onComplete: (level: Level) => void;
}

export function PlacementTest({ onComplete }: Props) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generatePlacementQuestions();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error('No questions returned');
      }
    } catch (err) {
      setError('Không thể tải bài kiểm tra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);
    if (index === questions[current].correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (current === questions.length - 1) {
      determineLevel();
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const determineLevel = () => {
    const total = questions.length;
    const ratio = correctCount / total;
    let level: Level;
    if (ratio <= 0.4) level = 'Beginner';
    else if (ratio <= 0.73) level = 'Intermediate';
    else level = 'Advanced';
    setShowResults(true);
    setTimeout(() => onComplete(level), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg font-bold">Đang tải bài kiểm tra...</p>
          <p className="text-slate-400 text-sm mt-2">Gemini AI đang tạo câu hỏi cho bé</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">{error}</p>
          <button
            onClick={loadQuestions}
            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold"
          >
            Thử Lại
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const total = questions.length;
    const ratio = correctCount / total;
    let level: Level;
    if (ratio <= 0.4) level = 'Beginner';
    else if (ratio <= 0.73) level = 'Intermediate';
    else level = 'Advanced';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-md animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-2">Hoàn Thành!</h2>
          <p className="text-slate-400 mb-6">Bé trả lời đúng {correctCount}/{total} câu</p>
          <div className="rounded-2xl bg-slate-800/80 border border-white/10 p-6">
            <p className="text-sm text-slate-400 mb-2">Cấp độ của bé</p>
            <div className="text-4xl font-black bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
              {level}
            </div>
            <p className="text-sm text-slate-400 mt-3">
              {level === 'Beginner' && 'Bắt đầu học từ những từ cơ bản nhất!'}
              {level === 'Intermediate' && 'Bé đã có nền tảng tốt, tiếp tục phát triển nhé!'}
              {level === 'Advanced' && 'Bé giỏi quá! Sẵn sàng cho thử thách khó hơn!'}
            </p>
          </div>
          <p className="text-slate-500 text-sm mt-4">Đang chuyển sang bài học...</p>
        </div>
      </div>
    );
  }

  const question = questions[current];
  if (!question) return null;

  return (
    <div className="min-h-screen bg-slate-900 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-amber-400" />
          <div>
            <h2 className="text-xl font-black text-white">Bài Kiểm Tra Đầu Vào</h2>
            <p className="text-sm text-slate-400">Xác định cấp độ tiếng Anh của bé</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Câu {current + 1} / {questions.length}</span>
            <span>Đúng: {correctCount}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-500"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div key={current} className="animate-fade-in rounded-2xl bg-slate-800/80 border border-white/10 p-6">
          <p className="text-xl font-bold text-white mb-6">{question.question_en}</p>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selected === index;
              const isCorrect = question.correct_index === index;
              const showCorrect = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center justify-between ${
                    showCorrect
                      ? 'border-green-500 bg-green-500/20 text-green-300'
                      : showWrong
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-white/10 bg-slate-900/60 text-slate-200 hover:border-amber-500/40'
                  }`}
                >
                  <span>{option}</span>
                  {showCorrect && <Check className="w-5 h-5 text-green-400" />}
                  {showWrong && <X className="w-5 h-5 text-red-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {showResult && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold shadow-lg hover:scale-105 transition-all"
            >
              {current === questions.length - 1 ? 'Xem Kết Quả' : 'Câu Tiếp'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
