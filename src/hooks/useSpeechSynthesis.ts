import { useState, useEffect, useCallback, useRef } from 'react';

const preferredVoiceNames = ['Samantha', 'Daniel', 'Google US English', 'Aaron'];

function getEnglishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter((voice) => {
    const language = voice.lang.toLowerCase();
    return language.startsWith('en-us') || language.startsWith('en-gb');
  });

  return preferredVoiceNames.reduce<SpeechSynthesisVoice | undefined>((selected, name) => {
    if (selected) return selected;
    return englishVoices.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase()));
  }, undefined) ?? englishVoices[0];
}

function waitForEnglishVoice(timeoutMs: number): Promise<SpeechSynthesisVoice | undefined> {
  const existingVoice = getEnglishVoice();
  if (existingVoice) return Promise.resolve(existingVoice);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.clearTimeout(timeout);
      resolve(getEnglishVoice());
    };
    const handleVoicesChanged = () => finish();
    const timeout = window.setTimeout(finish, timeoutMs);

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged, { once: true });
  });
}

async function getDictionaryAudioUrl(text: string): Promise<string | undefined> {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
  if (!response.ok) return undefined;

  const entries: Array<{ phonetics?: Array<{ audio?: string }> }> = await response.json();
  return entries.flatMap((entry) => entry.phonetics ?? []).find((phonetic) => phonetic.audio)?.audio;
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const audioSupported = typeof window !== 'undefined' && 'Audio' in window;
  const supported = speechSupported || audioSupported;

  useEffect(() => {
    if (!speechSupported) return;

    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, [speechSupported]);

  useEffect(() => {
    if (!speechSupported) return;
    const handleEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener('end', handleEnd);
    return () => window.speechSynthesis.removeEventListener('end', handleEnd);
  }, [speechSupported]);

  const playFallbackAudio = useCallback(async (text: string) => {
    if (!audioSupported) {
      setSpeaking(false);
      return;
    }

    try {
      const audioUrl = await getDictionaryAudioUrl(text);
      if (!audioUrl) {
        setSpeaking(false);
        return;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [audioSupported]);

  const speak = useCallback(async (text: string) => {
    const normalizedText = text.toLowerCase().trim();
    if (!normalizedText || !supported) return;

    audioRef.current?.pause();
    audioRef.current = null;
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(true);

    const voice = speechSupported
      ? voices.find((candidate) => candidate.voiceURI === getEnglishVoice()?.voiceURI) ?? await waitForEnglishVoice(1200)
      : undefined;

    if (!voice) {
      await playFallbackAudio(normalizedText);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.voice = voice;
    utterance.lang = voice.lang.startsWith('en-GB') ? 'en-GB' : 'en-US';
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      void playFallbackAudio(normalizedText);
    };
    window.speechSynthesis.speak(utterance);
  }, [playFallbackAudio, speechSupported, supported, voices]);

  const cancel = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  }, [speechSupported]);

  return { speak, cancel, speaking, supported };
}
