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
  const permissionGrantedRef = useRef(false);

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

  const createAndStart = useCallback(() => {
    const RecognitionClass = getRecognitionClass();
    if (!RecognitionClass) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói');
      return;
    }

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

    try {
      recognition.start();
    } catch (startErr: any) {
      setListening(false);
      if (startErr?.name === 'InvalidStateError') {
        recognitionRef.current = null;
        restartTimerRef.current = setTimeout(() => {
          createAndStart();
        }, 350);
      } else {
        setError('Không thể bắt đầu nghe. Vui lòng thử lại.');
      }
    }
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

    destroyRecognition();
    reset();
    setListening(false);
    setNeedsPermission(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    }

    // Nếu đã được cấp phép trước đó, mở recognition trực tiếp không cần xin lại
    if (permissionGrantedRef.current) {
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        createAndStart();
      }, 300);
      return;
    }

    // Gọi getUserMedia NGAY TRONG CÚ CLICK để trình duyệt điện thoại
    // nhận diện đây là hành động của người dùng và hiện popup cấp phép micro.
    // Không được bọc trong setTimeout vì sẽ mất user-activation context.
    const requestPermission = async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Dừng stream ngay để không chiếm micro — SpeechRecognition sẽ tự mở lại
          stream.getTracks().forEach((t) => t.stop());
          permissionGrantedRef.current = true;
          setNeedsPermission(false);
        } catch (micErr: any) {
          if (micErr?.name === 'NotAllowedError' || micErr?.name === 'PermissionDeniedError') {
            setNeedsPermission(true);
            return;
          }
        }
      }
      // Mở recognition sau khi đã có quyền — độ trễ nhỏ để micro được giải phóng
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        createAndStart();
      }, 300);
    };

    requestPermission();
  }, [destroyRecognition, reset, createAndStart]);

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
