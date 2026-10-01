import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionHook {
  supported: boolean;
  listening: boolean;
  transcript: string;
  finalTranscript: string;
  error: string | null;
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

    // Hủy timer restart đang chờ nếu có
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Dọn phiên cũ
    destroyRecognition();
    reset();
    setListening(false);

    // Giải phóng kênh loa — chỉ cancel khi đang phát để tránh xung đột âm thanh
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    }

    const createAndStart = () => {
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
        if (err !== 'aborted' && err !== 'no-speech') {
          setError(err);
        }
        // 'no-speech' không hiển thị lỗi nhưng vẫn cần reset trạng thái
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      setListening(true);

      try {
        recognition.start();
      } catch (startErr: any) {
        setListening(false);
        // InvalidStateError: recognition đang chạy, thử lại sau một chút
        if (startErr?.name === 'InvalidStateError') {
          recognitionRef.current = null;
          restartTimerRef.current = setTimeout(() => {
            createAndStart();
          }, 350);
        } else {
          setError('Không thể bắt đầu nghe. Vui lòng thử lại.');
        }
      }
    };

    // Trên điện thoại, cần một khoảng trễ nhỏ sau khi abort phiên cũ
    // để trình duyệt giải phóng micro trước khi mở phiên mới
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      createAndStart();
    }, 300);
  }, [destroyRecognition, reset]);

  return {
    supported,
    listening,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    reset,
  };
}
