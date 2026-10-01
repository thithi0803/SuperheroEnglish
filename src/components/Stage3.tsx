import { useState, useEffect } from 'react';
import type { GeminiLesson } from '@/types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Mic, MicOff, Volume2, Swords, Trophy, Star, Sparkles, Heart, Zap } from 'lucide-react';

interface Props {
  lesson: GeminiLesson;
  onComplete: (score: number) => void;
}

export function Stage3({ lesson, onComplete }: Props) {
  const { supported: srSupported, listening, transcript, finalTranscript, needsPermission, startListening, stopListening, reset } = useSpeechRecognition();
  const { speak, supported: ttsSupported } = useSpeechSynthesis();
  const [bossHp, setBossHp] = useState(100);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(3);
  const [phase, setPhase] = useState<'intro' | 'battle' | 'victory' | 'defeat'>('intro');
  const [lastTranscript, setLastTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState(false);

  const boss = lesson.stage3.boss_challenge;
  const magicPhrase = boss.magic_phrase_en;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  useEffect(() => {
    if (transcript && listening) {
      setLastTranscript(transcript);
    }
  }, [transcript, listening]);

  useEffect(() => {
    if (!listening && finalTranscript && phase === 'battle') {
      checkPronunciation(finalTranscript);
    }
  }, [listening, finalTranscript, phase, magicPhrase]);

  const checkPronunciation = (spoken: string) => {
    setAttempts((a) => a + 1);
    const normalizedSpoken = normalize(spoken);
    const normalizedTarget = normalize(magicPhrase);

    const targetWords = normalizedTarget.split(' ').filter(Boolean);
    const spokenWords = normalizedSpoken.split(' ').filter(Boolean);

    if (targetWords.length === 0 || spokenWords.length === 0) {
      setFeedback('Không nghe rõ. Thử lại nhé!');
      return;
    }

    const matched = targetWords.filter(tw => spokenWords.some(sw => sw === tw || (sw.length > 3 && sw.includes(tw)))).length;
    const accuracy = matched / targetWords.length;

    if (accuracy >= 0.6) {
      const damage = Math.round(50 + accuracy * 50);
      const newHp = Math.max(0, bossHp - damage);
      setBossHp(newHp);
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 500);
      setFeedback(`Tuyệt vời! Bé nói đúng ${Math.round(accuracy * 100)}% - Gây ${damage} sát thương!`);

      if (newHp <= 0) {
        setTimeout(() => setPhase('victory'), 800);
      }
    } else {
      setFeedback(`Bé nói: "${spoken}". Thử lại nhé! Nhấn loa để nghe mẫu câu phép thuật.`);
    }
  };

  const handleStartBattle = () => {
    setPhase('battle');
    reset();
  };

  const handleSpeakAndCheck = () => {
    reset();
    setFeedback(null);
    startListening();
  };

  const handleGiveUp = () => {
    setPhase('defeat');
  };

  const calculateScore = (): number => {
    if (phase === 'victory') {
      const attemptBonus = Math.max(0, maxAttempts - attempts) * 10;
      return Math.min(100, 70 + attemptBonus);
    }
    return Math.max(20, Math.round((100 - bossHp) * 0.5));
  };

  if (phase === 'intro') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Chặng 3: Trận Chiến Cuối Cùng</h2>
            <p className="text-xs text-slate-400">Đọc mẫu câu phép thuật để đánh gục Boss</p>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-red-950/80 to-slate-900 border border-red-500/30 p-6 text-center">
          <div className="text-7xl mb-4 animate-bounce-slow">{boss.boss_emoji}</div>
          <h3 className="text-2xl font-black text-red-400 mb-2">{boss.boss_name}</h3>
          <p className="text-slate-400 mb-6">Boss xuất hiện! Bé cần đọc mẫu câu phép thuật để đánh bại nó.</p>

          <div className="rounded-xl bg-slate-900/60 border border-amber-500/30 p-5 mb-6">
            <p className="text-sm text-amber-400 font-bold mb-2">Mẫu Câu Phép Thuật</p>
            <p className="text-2xl font-black text-white mb-2">{magicPhrase}</p>
            <p className="text-sm text-slate-400 italic mb-3">{boss.magic_phrase_vi}</p>
            {ttsSupported && (
              <button
                onClick={() => speak(magicPhrase)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/30 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                Nghe Mẫu Câu
              </button>
            )}
          </div>

          <button
            onClick={handleStartBattle}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-lg shadow-red-500/30 hover:scale-105 transition-all"
          >
            <Swords className="w-5 h-5" />
            Bắt Đầu Trận Chiến
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'victory' || phase === 'defeat') {
    const isVictory = phase === 'victory';
    const score = calculateScore();
    const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1;

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-8 text-center animate-fade-in">
          {isVictory ? (
            <>
              <div className="text-7xl mb-4 animate-bounce-slow">🎉</div>
              <h2 className="text-3xl font-black text-white mb-2">Chiến Thắng!</h2>
              <p className="text-slate-400 mb-6">Bé đã đánh bại {boss.boss_name}!</p>
            </>
          ) : (
            <>
              <div className="text-7xl mb-4">{boss.boss_emoji}</div>
              <h2 className="text-3xl font-black text-white mb-2">Chưa Thắng Được...</h2>
              <p className="text-slate-400 mb-6">Không sao, bé có thể thử lại vào lần sau!</p>
            </>
          )}

          {/* Reward Chest */}
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/30 p-6 mb-6">
            <div className="text-5xl mb-3">{isVictory ? '🪙' : '📦'}</div>
            <p className="text-sm text-amber-400 font-bold mb-3">Phần Thưởng</p>
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-white">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-black">{score}%</span>
              <span className="text-sm text-slate-400">điểm</span>
            </div>
          </div>

          <button
            onClick={() => onComplete(score)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-green-500 text-white font-bold text-lg shadow-lg hover:scale-105 transition-all"
          >
            <Trophy className="w-5 h-5" />
            Nhận Phần Thưởng
          </button>
        </div>
      </div>
    );
  }

  // Battle phase
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500">
          <Swords className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Trận Chiến Cuối Cùng</h2>
          <p className="text-xs text-slate-400">Đọc mẫu câu phép thuật để tấn công Boss</p>
        </div>
      </div>

      {/* Boss Arena */}
      <div className={`relative rounded-2xl bg-gradient-to-br from-red-950/80 to-slate-900 border border-red-500/30 p-8 mb-6 overflow-hidden ${hitFlash ? 'animate-pulse' : ''}`}>
        {hitFlash && (
          <div className="absolute inset-0 bg-red-500/30 animate-pulse" />
        )}

        <div className="relative text-center">
          <div className={`text-7xl mb-3 ${hitFlash ? 'animate-bounce' : ''} ${bossHp <= 0 ? 'opacity-30' : ''}`}>
            {boss.boss_emoji}
          </div>
          <h3 className="text-xl font-black text-red-400 mb-3">{boss.boss_name}</h3>

          {/* HP Bar */}
          <div className="max-w-xs mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-slate-400">Máu Boss</span>
            </div>
            <div className="h-4 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                style={{ width: `${bossHp}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{bossHp} / 100 HP</p>
          </div>
        </div>
      </div>

      {/* Magic Phrase */}
      <div className="rounded-xl bg-slate-900/60 border border-amber-500/30 p-4 mb-4 text-center">
        <p className="text-xs text-amber-400 font-bold mb-1">Mẫu Câu Phép Thuật</p>
        <p className="text-xl font-black text-white">{magicPhrase}</p>
        <p className="text-sm text-slate-400 italic mt-1">{boss.magic_phrase_vi}</p>
        {ttsSupported && (
          <button
            onClick={() => speak(magicPhrase)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 transition-all"
          >
            <Volume2 className="w-4 h-4" /> Nghe lại
          </button>
        )}
      </div>

      {/* Mic Button */}
      <div className="flex flex-col items-center gap-4">
        {srSupported ? (
          <button
            onClick={listening ? stopListening : handleSpeakAndCheck}
            className={`flex items-center gap-3 px-8 py-5 rounded-2xl font-bold text-lg shadow-lg transition-all ${
              listening
                ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse scale-105'
                : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-red-500/30 hover:scale-105'
            }`}
          >
            {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            {listening ? 'Đang Nghe... Bấm để dừng' : 'Bấm Mic Đọc Câu Phép Thuật'}
          </button>
        ) : (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center max-w-sm">
            <p className="text-sm text-amber-400 mb-3">
              Trình duyệt không hỗ trợ micro. Bé có thể bấm nút bên dưới để xác nhận đọc câu.
            </p>
            <button
              onClick={() => {
                setBossHp(0);
                setPhase('victory');
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold"
            >
              Xác Nhận Đã Đọc
            </button>
          </div>
        )}

        {needsPermission && !listening && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-4 py-3 max-w-md text-center animate-fade-in">
            <p className="text-sm text-blue-400">
              Vui lòng cho phép truy cập micro trong trình duyệt để ghi âm. Bấm lại nút mic sau khi cấp quyền.
            </p>
          </div>
        )}

        {lastTranscript && (
          <div className="rounded-xl bg-slate-800/80 border border-white/10 px-4 py-3 max-w-md text-center">
            <p className="text-xs text-slate-400 mb-1">Bé nói:</p>
            <p className="text-white font-medium">"{lastTranscript}"</p>
          </div>
        )}

        {feedback && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 max-w-md text-center animate-fade-in">
            <p className="text-sm text-amber-400">{feedback}</p>
          </div>
        )}

        {attempts >= maxAttempts && bossHp > 0 && phase === 'battle' && (
          <button
            onClick={handleGiveUp}
            className="text-sm text-slate-500 hover:text-slate-300 font-semibold transition-colors"
          >
            Bỏ cuộc và nhận phần thưởng
          </button>
        )}
      </div>
    </div>
  );
}
