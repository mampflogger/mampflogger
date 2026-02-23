import { useState, useRef, useCallback } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string, isInterim: boolean) => void;
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
  const processedIndexRef = useRef(0);

  const isSupported = !!getSpeechRecognition();

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      for (let i = processedIndexRef.current; i < event.results.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (event.results as any)[i];
        if (result.isFinal) {
          // Collect best transcript from all alternatives
          let best = "";
          for (let a = 0; a < result.length; a++) {
            const alt = result[a].transcript.trim();
            if (alt.length > best.length) best = alt;
          }
          processedIndexRef.current = i + 1;
          onResult(best, false);
        } else {
          // Interim result — send for quick command detection
          const interim = result[0].transcript.trim();
          if (interim) onResult(interim, true);
        }
      }
    };

    recognition.onend = () => {
      // If still supposed to be listening, restart (browser may stop after silence)
      if (recognitionRef.current && recognitionRef.current._keepAlive) {
        processedIndexRef.current = 0;
        try { recognition.start(); } catch { /* ignore */ }
        return;
      }
      setIsListening(false);
      onEnd?.();
    };

    recognition.onerror = (event: { error: string }) => {
      console.warn("[Speech] error:", event.error);
      // Only stop on fatal errors, not on no-speech or aborted
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        if (recognitionRef.current) recognitionRef.current._keepAlive = false;
        setIsListening(false);
      }
      // For "no-speech", "aborted", "network" etc., onend will handle restart
    };

    recognitionRef.current = recognition;
    recognition._keepAlive = true;
    processedIndexRef.current = 0;
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
