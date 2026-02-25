import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Fleisch&Wurst",
  "Fisch&Meeresfrüchte",
  "Käse",
  "Nüsse&Samen",
  "Gemüse",
  "Brot&Teigwaren",
  "Öle&Fette",
  "Getränke",
  "Obst",
  "Milchprodukte",
  "Süßwaren",
  "Sonstiges",
  "Eigene",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Kein Bild übermittelt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du bist ein Ernährungs-Experte. Du analysierst Fotos von Mahlzeiten und identifizierst alle sichtbaren Lebensmittel.

Für jedes erkannte Lebensmittel gibst du zurück:
- name: Deutscher Name des Lebensmittels
- amount: Geschätzte Menge in Gramm (oder ml bei Getränken)
- unit: "g" oder "ml"
- calories: Geschätzte Kalorien für die geschätzte Menge
- protein: Protein in Gramm
- fat: Fett in Gramm
- carbs: Kohlenhydrate in Gramm
- fiber: Ballaststoffe in Gramm
- category: Eine der folgenden Kategorien: ${CATEGORIES.join(", ")}

Antworte NUR mit dem JSON-Array. Kein zusätzlicher Text.
Wenn du nichts erkennst, antworte mit einem leeren Array [].

Beispiel:
[
  {"name": "Semmel", "amount": 60, "unit": "g", "calories": 156, "protein": 5, "fat": 1, "carbs": 30, "fiber": 2, "category": "Brot&Teigwaren"},
  {"name": "Butter", "amount": 10, "unit": "g", "calories": 74, "protein": 0, "fat": 8, "carbs": 0, "fiber": 0, "category": "Öle&Fette"}
]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analysiere dieses Foto und identifiziere alle Lebensmittel mit geschätzten Nährwerten.",
                },
                {
                  type: "image_url",
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen, bitte versuche es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Guthaben aufgebraucht. Bitte lade Credits nach." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "KI-Analyse fehlgeschlagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let items;
    try {
      items = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("photo-to-log error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
