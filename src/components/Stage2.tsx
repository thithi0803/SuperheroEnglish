import { useState, useMemo } from 'react';
import type { GeminiLesson } from '@/types';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Check, X, ArrowRight, Volume2, Shuffle, ArrowLeft, Zap, PenLine } from 'lucide-react';
import { sanitizeQuestionText } from '@/lib/questionText';

interface Props {
  lesson: GeminiLesson;
  onComplete: (score: number) => void;
}

type ExerciseType = 'mc' | 'fill' | 'sentence' | 'listening';

function normalizeSentence(sentence: string): string {
  return sentence.replace(
    /\b(is|are|was|were)\s+(big|small|large|little|long|short|beautiful|cute|old|young)\s+(red|blue|green|yellow|black|white|brown|orange|pink|purple)\b/gi,
    '$1 $2 and $3',
  );
}

export function Stage2({ lesson, onComplete }: Props) {
  const { speak, supported: ttsSupported } = useSpeechSynthesis();
  const { multiple_choice, sentence_builder, listening, fill_in_blank } = lesson.stage2;

  const correctSentence = useMemo(
    () => normalizeSentence(sentence_builder.correct_sentence),
    [sentence_builder.correct_sentence],
  );

  const scrambledWords = useMemo(() => {
    const words = correctSentence.split(/\s+/).filter(Boolean);
    const shuffled = [...words];
    let seed = sentence_builder.correct_sentence.length + 1;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.join(' ').toLowerCase() === correctSentence.toLowerCase().trim() && shuffled.length > 1) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
  }, [correctSentence]);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [sentenceOrder, setSentenceOrder] = useState<number[]>([]);
  const [sentenceSubmitted, setSentenceSubmitted] = useState(false);
  const [sentenceCorrect, setSentenceCorrect] = useState(false);

  const [listeningAnswer, setListeningAnswer] = useState<number | null>(null);
  const [listeningSubmitted, setListeningSubmitted] = useState(false);

  const [fillAnswer, setFillAnswer] = useState<number | null>(null);
  const [fillSubmitted, setFillSubmitted] = useState(false);

  const exercises: ExerciseType[] = ['mc', 'mc', 'mc', 'fill', 'sentence', 'listening'];
  const totalExercises = exercises.length;
  const currentType = exercises[exerciseIndex];

  const mcIndex = exerciseIndex <= 2 ? exerciseIndex : 0;

  const handleFillAnswer = (index: number) => {
    if (fillSubmitted) return;
    setFillAnswer(index);
    setFillSubmitted(true);
    if (index === fill_in_blank.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleMCAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === multiple_choice[mcIndex].correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (exerciseIndex === totalExercises - 1) {
      const totalCorrect = correctCount +
        (fillAnswer === fill_in_blank.correct_index ? 1 : 0) +
        (sentenceCorrect ? 1 : 0) +
        (listeningAnswer === listening.correct_index ? 1 : 0);
      const score = Math.round((totalCorrect / totalExercises) * 100);
      onComplete(score);
      return;
    }
    setExerciseIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setSentenceOrder([]);
    setSentenceSubmitted(false);
    setSentenceCorrect(false);
    setListeningAnswer(null);
    setListeningSubmitted(false);
    setFillAnswer(null);
    setFillSubmitted(false);
  };

  const toggleWord = (wordIndex: number) => {
    if (sentenceSubmitted) return;
    if (sentenceOrder.includes(wordIndex)) {
      setSentenceOrder((prev) => prev.filter((w) => w !== wordIndex));
    } else {
      setSentenceOrder((prev) => [...prev, wordIndex]);
    }
  };

  const submitSentence = () => {
    const constructed = sentenceOrder.map((i) => scrambledWords[i]).join(' ');
    const correct = constructed.toLowerCase().trim() === correctSentence.toLowerCase().trim();
    setSentenceCorrect(correct);
    setSentenceSubmitted(true);
    if (correct) setCorrectCount((c) => c + 1);
  };

  const resetSentence = () => {
    setSentenceOrder([]);
    setSentenceSubmitted(false);
    setSentenceCorrect(false);
  };

  const handleListeningAnswer = (index: number) => {
    if (listeningSubmitted) return;
    setListeningAnswer(index);
    setListeningSubmitted(true);
    if (index === listening.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const progress = ((exerciseIndex + 1) / totalExercises) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Chặng 2: Vượt Chướng Ngại</h2>
          <p className="text-xs text-slate-400">Trắc nghiệm, ghép câu, và nghe chọn hình</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Bài {exerciseIndex + 1} / {totalExercises}</span>
          <span>Đúng: {correctCount}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Multiple Choice */}
      {currentType === 'mc' && multiple_choice[mcIndex] && (
        <div key={`mc-${exerciseIndex}`} className="animate-fade-in rounded-2xl bg-slate-800/80 border border-white/10 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 block">Trắc Nghiệm</span>
          <p className="text-lg font-bold text-white mb-5">{sanitizeQuestionText(multiple_choice[mcIndex].question_en, multiple_choice[mcIndex].options, multiple_choice[mcIndex].correct_index)}</p>

          <div className="space-y-3">
            {multiple_choice[mcIndex].options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = multiple_choice[mcIndex].correct_index === index;
              const showCorrect = showResult && isCorrect;
              const showWrong = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleMCAnswer(index)}
                  disabled={showResult}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center justify-between ${
                    showCorrect ? 'border-green-500 bg-green-500/20 text-green-300'
                    : showWrong ? 'border-red-500 bg-red-500/20 text-red-300'
                    : 'border-white/10 bg-slate-900/60 text-slate-200 hover:border-cyan-500/40'
                  }`}
                >
                  <span>{option}</span>
                  {showCorrect && <Check className="w-5 h-5 text-green-400" />}
                  {showWrong && <X className="w-5 h-5 text-red-400" />}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mt-4">
              <p className="text-sm text-slate-300">{multiple_choice[mcIndex].explanation_vi}</p>
            </div>
          )}
        </div>
      )}

      {/* Fill in the Blank */}
      {currentType === 'fill' && (
        <div key="fill" className="animate-fade-in rounded-2xl bg-slate-800/80 border border-white/10 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2 block">Điền Từ</span>
          <p className="text-lg font-bold text-white mb-5">Chọn từ đúng điền vào chỗ trống</p>

          <div className="rounded-xl bg-slate-900/60 border border-teal-500/20 p-5 mb-5">
            <p className="text-xl font-bold text-white leading-relaxed">
              {fill_in_blank.sentence.split('___').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className={`inline-block min-w-[80px] mx-1 px-3 py-0.5 rounded-lg border-2 text-center font-bold ${
                      fillSubmitted
                        ? fillAnswer === fill_in_blank.correct_index
                          ? 'border-green-500 bg-green-500/20 text-green-300'
                          : 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-teal-500/40 bg-teal-500/10 text-teal-400'
                    }`}>
                      {fillSubmitted ? fill_in_blank.options[fillAnswer ?? 0] : '___'}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fill_in_blank.options.map((option, index) => {
              const isSelected = fillAnswer === index;
              const isCorrect = fill_in_blank.correct_index === index;
              const showCorrect = fillSubmitted && isCorrect;
              const showWrong = fillSubmitted && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleFillAnswer(index)}
                  disabled={fillSubmitted}
                  className={`px-5 py-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    showCorrect ? 'border-green-500 bg-green-500/20 text-green-300'
                    : showWrong ? 'border-red-500 bg-red-500/20 text-red-300'
                    : 'border-white/10 bg-slate-900/60 text-slate-200 hover:border-teal-500/40'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5 opacity-50" />
                  {option}
                  {showCorrect && <Check className="w-4 h-4" />}
                  {showWrong && <X className="w-4 h-4" />}
                </button>
              );
            })}
          </div>

          {fillSubmitted && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mt-4">
              <p className="text-sm text-slate-300">{fill_in_blank.explanation_vi}</p>
            </div>
          )}
        </div>
      )}

      {/* Sentence Builder */}
      {currentType === 'sentence' && (
        <div key="sentence" className="animate-fade-in rounded-2xl bg-slate-800/80 border border-white/10 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 block">Ghép Câu Ngữ Pháp</span>
          <p className="text-lg font-bold text-white mb-1">{sentence_builder.instruction_vi}</p>
          <p className="text-sm text-slate-400 mb-5">Sắp xếp các từ để tạo câu đúng</p>

          {/* Constructed sentence display */}
          <div className="min-h-[60px] rounded-xl bg-slate-900/60 border-2 border-dashed border-white/10 p-4 mb-4 flex flex-wrap gap-2 items-center">
            {sentenceOrder.length === 0 && (
              <span className="text-slate-500 text-sm">Bấm vào từ bên dưới để xếp câu...</span>
            )}
            {sentenceOrder.map((wordIdx) => (
              <span
                key={wordIdx}
                onClick={() => toggleWord(wordIdx)}
                className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-white font-bold text-sm cursor-pointer hover:bg-purple-500/30 transition-all"
              >
                {scrambledWords[wordIdx]}
              </span>
            ))}
          </div>

          {/* Scrambled words */}
          {!sentenceSubmitted && (
            <div className="flex flex-wrap gap-2 mb-4">
              {scrambledWords.map((word, index) => {
                const used = sentenceOrder.includes(index);
                return (
                  <button
                    key={index}
                    onClick={() => toggleWord(index)}
                    disabled={used}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                      used
                        ? 'bg-slate-800/50 text-slate-600 border border-slate-700/50 opacity-40'
                        : 'bg-slate-900/60 text-slate-200 border border-white/10 hover:border-purple-500/40 hover:bg-slate-900'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          )}

          {sentenceSubmitted && (
            <div className={`rounded-xl p-4 mb-4 ${
              sentenceCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {sentenceCorrect ? (
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Chính xác! "{correctSentence}"
                </p>
              ) : (
                <div>
                  <p className="text-sm text-red-400 flex items-center gap-2 mb-1">
                    <X className="w-4 h-4" /> Chưa đúng. Đáp án: "{correctSentence}"
                  </p>
                </div>
              )}
            </div>
          )}

          {!sentenceSubmitted && sentenceOrder.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={submitSentence}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:scale-105 transition-all"
              >
                <Check className="w-4 h-4" /> Kiểm Tra
              </button>
              <button
                onClick={resetSentence}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:bg-white/10 transition-all"
              >
                <Shuffle className="w-4 h-4" /> Xóa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Listening Quiz */}
      {currentType === 'listening' && (
        <div key="listening" className="animate-fade-in rounded-2xl bg-slate-800/80 border border-white/10 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2 block">Bài Tập Nghe</span>
          <p className="text-lg font-bold text-white mb-1">Nghe và chọn hình đúng</p>
          <p className="text-sm text-slate-400 mb-5">Bấm vào nút loa để nghe câu tiếng Anh, rồi chọn hình phù hợp</p>

          <div className="flex justify-center mb-6">
            <button
              onClick={() => speak(listening.audio_text)}
              disabled={!ttsSupported}
              className="flex items-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:scale-105 transition-all disabled:opacity-50"
            >
              <Volume2 className="w-8 h-8" />
              Nghe Câu Tiếng Anh
            </button>
          </div>

          {!ttsSupported && (
            <p className="text-center text-sm text-amber-400 mb-4">
              Trình duyệt không hỗ trợ đọc to. Câu cần nghe: "{listening.audio_text}"
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {listening.image_options.map((option, index) => {
              const isSelected = listeningAnswer === index;
              const isCorrect = listening.correct_index === index;
              const showCorrect = listeningSubmitted && isCorrect;
              const showWrong = listeningSubmitted && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleListeningAnswer(index)}
                  disabled={listeningSubmitted}
                  className={`rounded-xl border-2 p-5 flex flex-col items-center gap-2 transition-all ${
                    showCorrect ? 'border-green-500 bg-green-500/20'
                    : showWrong ? 'border-red-500 bg-red-500/20'
                    : 'border-white/10 bg-slate-900/60 hover:border-orange-500/40'
                  }`}
                >
                  <span className="text-5xl">{option.emoji}</span>
                  <span className="text-sm font-bold text-slate-200">{option.label}</span>
                  {showCorrect && <Check className="w-5 h-5 text-green-400" />}
                  {showWrong && <X className="w-5 h-5 text-red-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-slate-500 font-semibold">
          {currentType === 'mc' && !showResult && 'Chọn đáp án để tiếp tục'}
          {currentType === 'fill' && !fillSubmitted && 'Chọn từ để điền vào chỗ trống'}
          {currentType === 'sentence' && !sentenceSubmitted && 'Ghép câu để tiếp tục'}
          {currentType === 'listening' && !listeningSubmitted && 'Chọn hình để tiếp tục'}
        </div>
        {((currentType === 'mc' && showResult) ||
          (currentType === 'fill' && fillSubmitted) ||
          (currentType === 'sentence' && sentenceSubmitted) ||
          (currentType === 'listening' && listeningSubmitted)) && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg hover:scale-105 transition-all"
          >
            {exerciseIndex === totalExercises - 1 ? (
              <>Sang Chặng 3 <ArrowRight className="w-5 h-5" /></>
            ) : (
              <>Tiếp Tục <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
