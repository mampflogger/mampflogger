import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function synthesize(text: string, voice: string): Promise<Uint8Array> {
  const connectionId = crypto.randomUUID().replace(/-/g, "");
  const requestId = crypto.randomUUID().replace(/-/g, "");

  const url =
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const audioChunks: Uint8Array[] = [];
    let resolved = false;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      // 1) Send speech config
      const configMsg =
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
        });
      ws.send(configMsg);

      // 2) Send SSML
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='de-DE'>` +
        `<voice name='${voice}'>` +
        `<prosody rate='-5%' pitch='+0Hz'>${escapeXml(text)}</prosody>` +
        `</voice></speak>`;

      const ssmlMsg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${isoNow()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          resolved = true;
          ws.close();
        }
      } else {
        // Binary frame – could be ArrayBuffer or Blob depending on runtime
        let buf: ArrayBuffer;
        if (event.data instanceof ArrayBuffer) {
          buf = event.data;
        } else if (event.data instanceof Blob) {
          buf = await event.data.arrayBuffer();
        } else {
          return;
        }

        const data = new Uint8Array(buf);
        if (data.length < 2) return;

        // First 2 bytes = header length (big-endian)
        const headerLen = (data[0] << 8) | data[1];
        const audioStart = 2 + headerLen;
        if (audioStart < data.length) {
          audioChunks.push(data.slice(audioStart));
        }
      }
    };

    ws.onclose = () => {
      const totalLen = audioChunks.reduce((a, c) => a + c.length, 0);
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of audioChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(result);
    };

    ws.onerror = () => {
      if (!resolved) reject(new Error("WebSocket error during TTS synthesis"));
    };

    setTimeout(() => {
      if (!resolved) {
        ws.close();
        reject(new Error("TTS synthesis timed out"));
      }
    }, 30_000);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice } = await req.json();

    if (!text || typeof text !== "string" || text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "text is required (max 5000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const selectedVoice = voice || "de-DE-KatjaNeural";
    const audio = await synthesize(text, selectedVoice);

    if (audio.length === 0) {
      return new Response(
        JSON.stringify({ error: "No audio generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(audio, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("Edge TTS error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "TTS synthesis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
