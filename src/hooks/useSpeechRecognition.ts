import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  lang?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSpeechRecognition = (): any | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export function useSpeechRecognition({ onResult, onEnd, lang = "de-DE" }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const isSupported = !!getSpeechRecognition();

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      // Process only the latest final result
      for (let i = 0; i < event.results.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (event.results as any)[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          onResult(transcript);
        }
      }
    };

    recognition.onend = () => {
      // If still supposed to be listening, restart (browser may stop after silence)
      if (recognitionRef.current && recognitionRef.current._keepAlive) {
        try { recognition.start(); } catch { /* ignore */ }
        return;
      }
      setIsListening(false);
      onEnd?.();
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition._keepAlive = true;
    recognition.start();
    setIsListening(true);
  }, [lang, onResult, onEnd]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._keepAlive = false;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return { isListening, start, stop, isSupported };
}
