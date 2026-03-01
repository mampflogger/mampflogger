import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string, isInterim: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  lang?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { resultIndex?: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const TERMINAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null) as SpeechRecognitionConstructor | null;
};

export function useSpeechRecognition({ onResult, onEnd, onError, lang = "de-DE" }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedIndexRef = useRef(0);
  const keepAliveRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  const isSupported = !!getSpeechRecognition();

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const startRecognitionRef = useRef<() => void>(() => {});

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      throw new Error("not-supported");
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : processedIndexRef.current;
      for (let i = startIndex; i < event.results.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (event.results as any)[i];
        if (result.isFinal) {
          let best = "";
          for (let a = 0; a < result.length; a++) {
            const alt = result[a].transcript.trim();
            if (alt.length > best.length) best = alt;
          }
          processedIndexRef.current = i + 1;
          onResultRef.current(best, false);
        } else {
          const interim = result[0].transcript.trim();
          if (interim) onResultRef.current(interim, true);
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("[Speech] error:", event.error);
      onErrorRef.current?.(event.error);

      if (TERMINAL_ERRORS.has(event.error)) {
        keepAliveRef.current = false;
        clearRestartTimeout();
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (!keepAliveRef.current) {
        setIsListening(false);
        onEndRef.current?.();
        return;
      }

      processedIndexRef.current = 0;
      clearRestartTimeout();
      restartTimeoutRef.current = window.setTimeout(() => {
        if (!keepAliveRef.current || recognitionRef.current) return;
        try {
          startRecognitionRef.current();
        } catch (err) {
          console.warn("[Speech] restart failed:", err);
          keepAliveRef.current = false;
          setIsListening(false);
          onErrorRef.current?.("start-failed");
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    processedIndexRef.current = 0;
    recognition.start();
  }, [clearRestartTimeout, lang]);

  startRecognitionRef.current = startRecognition;

  const start = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.("not-supported");
      return;
    }

    if (keepAliveRef.current) return;

    keepAliveRef.current = true;
    setIsListening(true);
    clearRestartTimeout();

    try {
      startRecognitionRef.current();
    } catch (err) {
      console.warn("[Speech] start failed:", err);
      keepAliveRef.current = false;
      recognitionRef.current = null;
      setIsListening(false);
      onErrorRef.current?.("start-failed");
    }
  }, [clearRestartTimeout, isSupported]);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    clearRestartTimeout();

    if (recognitionRef.current) {
      const current = recognitionRef.current;
      recognitionRef.current = null;
      try {
        current.stop();
      } catch {
        // ignore
      }
    }

    setIsListening(false);
  }, [clearRestartTimeout]);

  useEffect(() => {
    return () => {
      keepAliveRef.current = false;
      clearRestartTimeout();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [clearRestartTimeout]);

  return { isListening, start, stop, isSupported };
}
