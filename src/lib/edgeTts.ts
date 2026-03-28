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

export async function synthesizeEdgeTTS(
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
      // 1) speech config
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
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        }),
      );

      // 2) SSML
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='de-DE'>` +
        `<voice name='${voice}'>` +
        `<prosody rate='-5%' pitch='+0Hz'>${escapeXml(text)}</prosody>` +
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

    // Safety timeout 30s
    setTimeout(() => {
      if (!done) {
        cleanup();
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("TTS synthesis timed out"));
      }
    }, 30_000);
  });
}
