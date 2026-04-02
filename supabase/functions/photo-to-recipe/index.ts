import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { imageBase64, servings } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Kein Bild übermittelt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const portionen = servings || 2;

    const systemPrompt = `Du bist ein Ernährungs-Experte und Koch. Du analysierst Fotos von Gerichten und erstellst daraus ein vollständiges Rezept.

Analysiere das Foto und erstelle ein Rezept mit:
1. Erkenne das Gericht und gib ihm einen passenden deutschen Namen
2. Schätze alle sichtbaren Zutaten mit realistischen Mengen
3. Schreibe eine vollständige Zubereitungsanleitung
4. Berechne die Nährwerte (total und pro Portion für ${portionen} Portionen)
5. Schätze die Zubereitungszeit

Für jede Zutat liefere auch die Nährwerte pro 100g als "per100g" Objekt.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "name": "Name des Gerichts",
  "servings": ${portionen},
  "prepTime": "25 Min.",
  "ingredients": [
    { "name": "Zutat", "amount": "200g", "isMain": true, "per100g": { "calories": 120, "protein": 20, "fat": 3, "carbs": 0, "fiber": 0 } }
  ],
  "steps": [
    "Schritt eins beschreiben.",
    "Schritt zwei beschreiben."
  ],
  "totalMacros": { "calories": 800, "protein": 60, "fat": 30, "carbs": 50, "fiber": 8 },
  "perServing": { "calories": 400, "protein": 30, "fat": 15, "carbs": 25, "fiber": 4 }
}

Regeln:
- Alle Nährwerte realistisch schätzen
- isMain = true für die Hauptzutaten (max 3)
- Zubereitungsschritte als klare, nummerierte Anweisungen
- Kein Text außerhalb des JSON`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: "Analysiere dieses Foto und erstelle ein vollständiges Rezept daraus." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte später erneut versuchen." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent erschöpft." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Foto-Analyse fehlgeschlagen" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Rezept konnte nicht erstellt werden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("photo-to-recipe error:", e);
    return new Response(
      JSON.stringify({ error: "Ein interner Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
