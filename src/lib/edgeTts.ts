/**
 * Browser-side Edge TTS client.
 * Connects directly to Microsoft's free neural TTS endpoint via WebSocket.
 * No API key or backend needed.
 */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

function isoNow(): string {
  return new Date().toISOString();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Try Edge TTS via WebSocket, fall back to browser SpeechSynthesis.
 */
export async function synthesizeEdgeTTS(
  text: string,
  voice: string,
  signal?: AbortSignal,
): Promise<Blob | "USE_SPEECH_SYNTHESIS"> {
  try {
    return await edgeTTSWebSocket(text, voice, signal);
  } catch (err: any) {
    if (err.name === "AbortError") throw err;
    console.warn("Edge TTS WebSocket failed, falling back to browser SpeechSynthesis", err.message);
    return "USE_SPEECH_SYNTHESIS";
  }
}

/**
 * Speak text using the browser's built-in SpeechSynthesis API.
 */
export function speakWithBrowserTTS(
  text: string,
  preferFemale: boolean,
  volume: number = 0.5,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.volume = volume;
    utterance.rate = 0.95;

    // Try to pick a German voice
    const voices = synth.getVoices();
    const germanVoices = voices.filter(v => v.lang.startsWith("de"));
    if (germanVoices.length > 0) {
      const preferred = germanVoices.find(v =>
        preferFemale ? /female|frau|katja|anna/i.test(v.name) : /male|mann|conrad|hans/i.test(v.name)
      );
      utterance.voice = preferred || germanVoices[0];
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "canceled") resolve();
      else reject(new Error(`SpeechSynthesis error: ${e.error}`));
    };

    const onAbort = () => {
      synth.cancel();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    synth.speak(utterance);
  });
}

function edgeTTSWebSocket(
  text: string,
  voice: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const connectionId = crypto.randomUUID().replace(/-/g, "");
  const requestId = crypto.randomUUID().replace(/-/g, "");

  const url =
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

  return new Promise<Blob>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    const audioChunks: ArrayBuffer[] = [];
    let done = false;

    const cleanup = () => {
      done = true;
      try { ws.close(); } catch {}
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    ws.onopen = () => {
      ws.send(
        `X-Timestamp:${isoNow()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "false",
                },
                outputFormat: "audio-24khz-96kbitrate-mono-mp3",
              },
            },
          },
        }),
      );

      // Keep SSML minimal – the neural voices handle pacing naturally
      const ssmlText = escapeXml(text);

      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='de-DE'>` +
        `<voice name='${voice}'>` +
        `<prosody rate='-5%' volume='+10%'>${ssmlText}</prosody>` +
        `</voice></speak>`;

      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${isoNow()}Z\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    };

    ws.onmessage = (event) => {
      if (done) return;

      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          cleanup();
          signal?.removeEventListener("abort", onAbort);
          const blob = new Blob(audioChunks, { type: "audio/mpeg" });
          resolve(blob);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const data = new Uint8Array(event.data);
        if (data.length < 2) return;
        const headerLen = (data[0] << 8) | data[1];
        const audioStart = 2 + headerLen;
        if (audioStart < data.length) {
          audioChunks.push(event.data.slice(audioStart));
        }
      }
    };

    ws.onerror = () => {
      if (!done) {
        cleanup();
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("WebSocket error during TTS synthesis"));
      }
    };

    ws.onclose = () => {
      if (!done) {
        signal?.removeEventListener("abort", onAbort);
        const blob = new Blob(audioChunks, { type: "audio/mpeg" });
        resolve(blob);
      }
    };

    setTimeout(() => {
      if (!done) {
        cleanup();
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("TTS synthesis timed out"));
      }
    }, 30_000);
  });
}
