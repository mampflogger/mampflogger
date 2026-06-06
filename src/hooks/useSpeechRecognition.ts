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
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex?: number; results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const TERMINAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);
const NON_ACTIONABLE_ERRORS = new Set(["no-speech", "aborted"]);

const MAX_RAPID_RESTARTS = 5;
const RAPID_RESTART_WINDOW_MS = 5_000;
const HARD_RECREATE_RESTARTS = 3;

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null) as SpeechRecognitionConstructor | null;
};

interface StartRecognitionOptions {
  silent?: boolean;
  forceRestart?: boolean;
}

export function useSpeechRecognition({ onResult, onEnd, onError, lang = "de-DE" }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedIndexRef = useRef(0);
  const keepAliveRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const restartingRef = useRef(false);
  const silentStartRef = useRef(false);
  const restartTimestampsRef = useRef<number[]>([]);
  const restartTimerRef = useRef<number | null>(null);
  const startWatchdogTimerRef = useRef<number | null>(null);
  const startAttemptIdRef = useRef(0);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  const isSupported = !!getSpeechRecognition();

  const clearStartWatchdog = useCallback(() => {
    if (startWatchdogTimerRef.current !== null) {
      window.clearTimeout(startWatchdogTimerRef.current);
      startWatchdogTimerRef.current = null;
    }
  }, []);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SR = getSpeechRecognition();
    if (!SR) {
      throw new Error("not-supported");
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onstart = () => {
      clearStartWatchdog();
      silentStartRef.current = false;
      recognitionActiveRef.current = true;
      restartingRef.current = false;
      setIsListening(true);
    };

    const scheduleRestart = (delayMs: number, recreate = false) => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }

      restartingRef.current = true;
      setIsListening(true);
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!keepAliveRef.current) return;

        try {
          const nextRecognition = recreate ? (() => {
            recognitionRef.current = null;
            recognitionActiveRef.current = false;
            return initRecognition();
          })() : recognition;
          nextRecognition.start();
        } catch (err) {
          console.warn("[Speech] delayed restart failed, retrying:", err);
          scheduleRestart(Math.min(Math.max(delayMs * 2, 500), 5_000), true);
        }
      }, delayMs);
    };

    
    recognition.onresult = (event) => {
      restartTimestampsRef.current = [];
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
          if (interim) {
            onResultRef.current(interim, true);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("[Speech] error:", event.error);

      if (NON_ACTIONABLE_ERRORS.has(event.error)) {
        return;
      }

      const silent = silentStartRef.current;
      if (!silent) {
        onErrorRef.current?.(event.error);
      }

      if (TERMINAL_ERRORS.has(event.error)) {
        silentStartRef.current = false;
        keepAliveRef.current = false;
        restartingRef.current = false;
        if (restartTimerRef.current !== null) {
          window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      clearStartWatchdog();
      recognitionActiveRef.current = false;
      if (!keepAliveRef.current) {
        restartingRef.current = false;
        setIsListening(false);
        onEndRef.current?.();
        return;
      }

      processedIndexRef.current = 0;
      setIsListening(true);

      // Guard against rapid restart loops
      const now = Date.now();
      const timestamps = restartTimestampsRef.current;
      // Prune old timestamps
      restartTimestampsRef.current = timestamps.filter(t => now - t < RAPID_RESTART_WINDOW_MS);
      restartTimestampsRef.current.push(now);

      if (restartTimestampsRef.current.length > MAX_RAPID_RESTARTS) {
        console.warn("[Speech] rapid restart loop detected, backing off");
        scheduleRestart(1_500, true);
        return;
      }

      try {
        if (restartTimestampsRef.current.length >= HARD_RECREATE_RESTARTS) {
          recognitionRef.current = null;
          initRecognition().start();
        } else {
          recognition.start();
        }
      } catch (err) {
        console.warn("[Speech] restart failed, retrying:", err);
        scheduleRestart(750, true);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [clearStartWatchdog, lang]);

  const start = useCallback((options?: StartRecognitionOptions) => {
    if (!isSupported) {
      onErrorRef.current?.("not-supported");
      return;
    }

    keepAliveRef.current = true;
    silentStartRef.current = !!options?.silent;

    try {
      if (options?.forceRestart && recognitionRef.current) {
        clearStartWatchdog();
        const currentRecognition = recognitionRef.current;
        currentRecognition.onstart = null;
        currentRecognition.onresult = null;
        currentRecognition.onerror = null;
        currentRecognition.onend = null;
        try {
          if (currentRecognition.abort) currentRecognition.abort();
          else currentRecognition.stop();
        } catch {
          // ignore stale recognition instances
        }
        recognitionRef.current = null;
        recognitionActiveRef.current = false;
      }

      const recognition = initRecognition();
      recognition.lang = lang;
      processedIndexRef.current = 0;
      restartTimestampsRef.current = [];
      const startAttemptId = ++startAttemptIdRef.current;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      clearStartWatchdog();
      if (recognitionActiveRef.current) {
        setIsListening(true);
        silentStartRef.current = false;
        return;
      }
      const beginStart = () => {
        if (!keepAliveRef.current || recognitionActiveRef.current || startAttemptIdRef.current !== startAttemptId) return;
        recognition.start();
        startWatchdogTimerRef.current = window.setTimeout(() => {
          startWatchdogTimerRef.current = null;
          if (!keepAliveRef.current || recognitionActiveRef.current || startAttemptIdRef.current !== startAttemptId) return;
          console.warn("[Speech] start watchdog: recognition did not enter active state");
          recognitionRef.current = null;
          recognitionActiveRef.current = false;
          try {
            recognition.abort?.();
          } catch {
            // ignore stale recognition instances
          }
          const silent = silentStartRef.current;
          silentStartRef.current = false;
          if (!silent) {
            onErrorRef.current?.("start-failed");
          }
          keepAliveRef.current = false;
          setIsListening(false);
        }, 2_500);
      };
      beginStart();
    } catch (err) {
      console.warn("[Speech] start failed:", err);
      const silent = silentStartRef.current;
      silentStartRef.current = false;
      if (keepAliveRef.current) {
        const recognition = recognitionRef.current;
        if (recognition) {
          const retryDelay = silent ? 1_000 : 500;
          if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            if (!keepAliveRef.current || recognitionActiveRef.current) return;
            try {
              clearStartWatchdog();
              recognition.start();
            } catch (retryErr) {
              console.warn("[Speech] start retry failed:", retryErr);
              onErrorRef.current?.("start-failed");
              keepAliveRef.current = false;
              setIsListening(false);
            }
          }, retryDelay);
          return;
        }
      }
      keepAliveRef.current = false;
      setIsListening(false);
      if (!silent) {
        onErrorRef.current?.("start-failed");
      }
    }
  }, [clearStartWatchdog, initRecognition, isSupported, lang]);

  const stop = useCallback(() => {
    keepAliveRef.current = false;
    restartingRef.current = false;
    startAttemptIdRef.current++;
    processedIndexRef.current = 0;
    restartTimestampsRef.current = [];
    clearStartWatchdog();
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    recognitionActiveRef.current = false;
    setIsListening(false);
  }, [clearStartWatchdog]);

  useEffect(() => {
    return () => {
      keepAliveRef.current = false;
      restartingRef.current = false;
      startAttemptIdRef.current++;
      processedIndexRef.current = 0;
      restartTimestampsRef.current = [];
      clearStartWatchdog();
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      recognitionActiveRef.current = false;
    };
  }, [clearStartWatchdog]);

  return { isListening, start, stop, isSupported };
}

