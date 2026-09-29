import { useState, useCallback, useRef, useEffect } from 'react';

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

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const combined = (final + ' ' + interim).trim();
      setTranscript(combined);
      if (final) {
        setFinalTranscript(final.trim());
      }
    };

    recognition.onerror = (event: any) => {
      setError(event.error || 'Speech recognition error');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, [supported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setFinalTranscript('');
    setError(null);
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      setListening(false);
      setError('Could not start speech recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

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
