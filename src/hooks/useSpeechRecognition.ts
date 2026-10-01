import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionHook {
  supported: boolean;
  listening: boolean;
  transcript: string;
  finalTranscript: string;
  error: string | null;
  needsPermission: boolean;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

function getRecognitionClass(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const destroyRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    if (!rec) {
      setListening(false);
      return;
    }
    try {
      rec.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback(() => {
    const RecognitionClass = getRecognitionClass();
    if (!RecognitionClass) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói');
      return;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Dọn phiên cũ
    destroyRecognition();
    reset();
    setListening(false);
    setNeedsPermission(false);

    // Giải phóng kênh loa
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    }

    // Tạo recognition mới và gán handlers
    const recognition = new RecognitionClass();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        }
      }
      const text = final.trim();
      if (text) {
        setTranscript(text);
        setFinalTranscript(text);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || 'Speech recognition error';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setNeedsPermission(true);
        setError(null);
      } else if (err !== 'aborted' && err !== 'no-speech') {
        setError(err);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);

    // Gọi .start() ĐỒNG BỘ ngay trong cú click của người dùng.
    // Trên điện thoại, chính .start() là lệnh kích hoạt popup xin quyền micro.
    // Nếu bọc trong setTimeout/asynce, trình duyệt sẽ mất ngữ cảnh user-gesture
    // và không hiện popup, chỉ báo lỗi "not-allowed" thầm lặng.
    try {
      recognition.start();
    } catch (startErr: any) {
      setListening(false);
      if (startErr?.name === 'InvalidStateError') {
        // Recognition cũ chưa kịp dừng — thử lại sau một chút
        recognitionRef.current = null;
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          try {
            recognition.start();
            recognitionRef.current = recognition;
            setListening(true);
          } catch {
            setError('Không thể bắt đầu nghe. Vui lòng thử lại.');
          }
        }, 350);
      } else {
        setError('Không thể bắt đầu nghe. Vui lòng thử lại.');
      }
    }
  }, [destroyRecognition, reset]);

  return {
    supported,
    listening,
    transcript,
    finalTranscript,
    error,
    needsPermission,
    startListening,
    stopListening,
    reset,
  };
}
