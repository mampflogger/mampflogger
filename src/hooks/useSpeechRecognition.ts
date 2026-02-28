import { useState, useRef, useCallback, useEffect } from "react";

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
    if (recognitionRef.current?._keepAlive || isListening) return;

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
          let best = "";
          for (let a = 0; a < result.length; a++) {
            const alt = result[a].transcript.trim();
            if (alt.length > best.length) best = alt;
          }
          processedIndexRef.current = i + 1;
          onResult(best, false);
        } else {
          const interim = result[0].transcript.trim();
          if (interim) onResult(interim, true);
        }
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current && recognitionRef.current._keepAlive) {
        processedIndexRef.current = 0;
        try {
          recognition.start();
          return;
        } catch {
          recognitionRef.current._keepAlive = false;
        }
      }
      recognitionRef.current = null;
      setIsListening(false);
      onEnd?.();
    };

    recognition.onerror = (event: { error: string }) => {
      console.warn("[Speech] error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        if (recognitionRef.current) recognitionRef.current._keepAlive = false;
        recognitionRef.current = null;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition._keepAlive = true;
    processedIndexRef.current = 0;

    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn("[Speech] start failed:", err);
      recognition._keepAlive = false;
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isListening, lang, onResult, onEnd]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._keepAlive = false;
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current._keepAlive = false;
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isListening, start, stop, isSupported };
}
