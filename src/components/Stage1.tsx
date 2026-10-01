import { useState, useEffect } from 'react';
import type { GeminiLesson } from '@/types';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Volume2, Mic, MicOff, Check, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

interface Props {
  lesson: GeminiLesson;
  onComplete: () => void;
}

export function Stage1({ lesson, onComplete }: Props) {
  const { speak, speaking, supported: ttsSupported } = useSpeechSynthesis();
  const { supported: srSupported, listening, transcript, finalTranscript, error: srError, startListening, stopListening, reset } = useSpeechRecognition();
  const [practiceTarget, setPracticeTarget] = useState<string | null>(null);
  const [practiceMatched, setPracticeMatched] = useState(false);

  const { vocab, grammar, intro_vi, intro_en } = lesson.stage1;

  const handleSpeak = (text: string) => {
    speak(text);
  };

  const handlePractice = (text: string) => {
    if (listening && practiceTarget === text) {
      stopListening();
      return;
    }
    setPracticeTarget(text);
    setPracticeMatched(false);
    reset();
    startListening();
  };

  useEffect(() => {
    if (!finalTranscript || !practiceTarget || practiceMatched) return;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const targetWords = normalize(practiceTarget).split(/\s+/).filter(Boolean);
    const spokenWords = normalize(finalTranscript).split(/\s+/).filter(Boolean);

    if (targetWords.length === 0 || spokenWords.length === 0) return;

    const allTargetInSpoken = targetWords.every(tw => spokenWords.some(sw => sw === tw || (sw.length > 3 && sw.includes(tw))));
    const allSpokenInTarget = spokenWords.every(sw => targetWords.some(tw => tw === sw || (tw.length > 3 && tw.includes(sw))));
    const isMatch = allTargetInSpoken && spokenWords.length >= Math.ceil(targetWords.length * 0.8);

    if (isMatch) {
      setPracticeMatched(true);
    }
  }, [finalTranscript, practiceTarget, practiceMatched]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Chặng 1: Nạp Năng Lượng</h2>
          <p className="text-xs text-slate-400">Học từ vựng và mẫu câu ngữ pháp</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-5 mb-6">
        <p className="text-white font-medium">{intro_vi}</p>
        <p className="text-sm text-slate-400 mt-2 italic">{intro_en}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-400" />
          Từ Vựng
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {vocab.map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-800/80 border border-white/10 p-4 hover:border-green-500/30 transition-colors"
            >
              <div className="text-3xl mb-2">{item.emoji}</div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-lg font-bold text-green-300">{item.word}</h4>
                {ttsSupported && (
                  <button
                    onClick={() => handleSpeak(item.word)}
                    className="text-slate-400 hover:text-green-400 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-300 mb-1">{item.meaning_vi}</p>
              <p className="text-xs text-slate-400 italic mb-2">"{item.example_en}"</p>
              <p className="text-xs text-slate-500">{item.example_vi}</p>

              {srSupported && (
                <button
                  onClick={() => handlePractice(item.word)}
                  disabled={listening && practiceTarget !== item.word}
                  className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    listening && practiceTarget === item.word
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                  }`}
                >
                  {listening && practiceTarget === item.word ? (
                    <><MicOff className="w-3.5 h-3.5" /> Đang nghe...</>
                  ) : (
                    <><Mic className="w-3.5 h-3.5" /> Đọc lại</>
                  )}
                </button>
              )}

              {practiceTarget === item.word && transcript && (
                <div className={`mt-2 text-xs px-2 py-1.5 rounded-lg ${
                  practiceMatched ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {practiceMatched ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Rất tốt!</span>
                  ) : (
                    <span>Bé nói: "{transcript}"</span>
                  )}
                </div>
              )}

              {practiceTarget === item.word && srError && !listening && (
                <div className="mt-2 text-xs px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400">
                  Lỗi micro: {srError}. Bấm lại để thử.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          Mẫu Câu Ngữ Pháp
        </h3>
        <div className="rounded-xl bg-slate-800/80 border border-amber-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xl font-bold text-amber-300">{grammar.pattern}</h4>
            {ttsSupported && (
              <button
                onClick={() => handleSpeak(grammar.example_en)}
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-300 mb-3">{grammar.explanation_vi}</p>
          <div className="rounded-lg bg-slate-900/60 p-3 mb-2">
            <p className="text-white font-medium">{grammar.example_en}</p>
            <p className="text-sm text-slate-400 italic">{grammar.example_vi}</p>
          </div>

          {srSupported && (
            <button
              onClick={() => handlePractice(grammar.example_en)}
              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                listening && practiceTarget === grammar.example_en
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {listening && practiceTarget === grammar.example_en ? (
                <><MicOff className="w-4 h-4" /> Đang nghe... Bấm để dừng</>
              ) : (
                <><Mic className="w-4 h-4" /> Đọc mẫu câu</>
              )}
            </button>
          )}

          {practiceTarget === grammar.example_en && transcript && (
            <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${
              practiceMatched ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {practiceMatched ? (
                <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Xuất sắc! Bé đọc đúng rồi!</span>
              ) : (
                <span>Bé nói: "{transcript}"</span>
              )}
            </div>
          )}
        </div>
      </div>

      {!srSupported && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
          <p className="text-sm text-amber-400">
            Trình duyệt không hỗ trợ micro. Bé vẫn có thể học bằng cách bấm nút loa để nghe.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg hover:scale-105 transition-all"
        >
          Sang Chặng 2
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
