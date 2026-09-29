import { useState, useEffect, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(typeof window !== 'undefined' && 'speechSynthesis' in window);

  useEffect(() => {
    if (!supported) return;
    const handleEnd = () => setSpeaking(false);
    speechSynthesis.addEventListener('end', handleEnd);
    return () => speechSynthesis.removeEventListener('end', handleEnd);
  }, [supported]);

  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!supported) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, cancel, speaking, supported };
}
