import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { ingredients, servings, recipeName, oldSteps } = await req.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(JSON.stringify({ error: "Keine Zutaten angegeben." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Du bist ein Ernährungs-Experte. Du berechnest Nährwerte für Zutatenlisten und schreibst Zubereitungsanleitungen.

Du bekommst eine Liste von Zutaten mit Mengenangaben, den Rezeptnamen und die bisherigen Zubereitungsschritte.
Berechne die realistischen Nährwerte und schreibe die Zubereitungsschritte neu, sodass alle Zutaten (auch neue) berücksichtigt werden.

Zusätzlich: Für jede Zutat liefere die Nährwerte pro 100g als "per100g" Objekt, damit neue Zutaten in die Lebensmitteldatenbank aufgenommen werden können.

Antworte NUR mit einem JSON-Objekt:
{
  "totalMacros": {
    "calories": 650,
    "protein": 35,
    "fat": 28,
    "carbs": 55,
    "fiber": 8
  },
  "perServing": {
    "calories": 325,
    "protein": 17.5,
    "fat": 14,
    "carbs": 27.5,
    "fiber": 4
  },
  "ingredients": [
    { "name": "Hüttenkäse", "amount": "300g", "isMain": true, "category": "Milchprodukte", "per100g": { "calories": 98, "protein": 12.3, "fat": 4.3, "carbs": 1.2, "fiber": 0 } }
  ],
  "steps": [
    "1. Schritt eins...",
    "2. Schritt zwei..."
  ]
}

Regeln:
- Alle Nährwerte realistisch schätzen basierend auf den angegebenen Mengen
- Bei Zutaten ohne Mengenangabe: schätze eine typische Menge und füge sie als amount hinzu
- Bei Zutaten die nur als Text eingegeben wurden (z.B. "200g Parmesan"): extrahiere Name und Menge korrekt
- Portionen: ${servings || 2}
- Kein zusätzlicher Text außerhalb des JSON
- Gib die bereinigte Zutatenliste mit korrekten name/amount/isMain/category/per100g Feldern zurück. category muss eine der folgenden sein: Fleisch&Wurst, Fisch&Meeresfrüchte, Käse, Nüsse&Samen, Gemüse, Brot&Teigwaren, Öle&Fette, Getränke, Obst, Milchprodukte, Süßwaren, Sonstiges, Eigene
- Die Zubereitungsschritte müssen ALLE Zutaten erwähnen und sinnvoll in den Kochablauf integrieren
- Orientiere dich am Stil der bisherigen Schritte, aber passe sie an die neue Zutatenliste an
- Rezeptname: ${recipeName || "Unbekannt"}`;

    const ingredientList = ingredients.map((ing: any) => {
      if (ing.amount) return `${ing.amount} ${ing.name}`;
      return ing.name;
    }).join("\n");

    const oldStepsText = oldSteps && Array.isArray(oldSteps) 
      ? `\n\nBisherige Zubereitungsschritte:\n${oldSteps.join("\n")}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Berechne die Nährwerte und schreibe die Zubereitungsschritte neu für folgende Zutatenliste:\n${ingredientList}${oldStepsText}` },
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
      return new Response(JSON.stringify({ error: "Neuberechnung fehlgeschlagen" }), {
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
      result = { error: "Nährwerte konnten nicht berechnet werden." };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-recalculate error:", e);
    return new Response(
      JSON.stringify({ error: "Ein interner Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
