import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { selectedFoods, frequentFoods } = await req.json();

    if (!selectedFoods || !Array.isArray(selectedFoods) || selectedFoods.length === 0) {
      return new Response(JSON.stringify({ error: "Mindestens ein Lebensmittel auswählen." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Du bist ein kreativer Koch-Assistent. Du erstellst schnelle, alltagstaugliche Rezepte.

Der Nutzer gibt dir 1-5 Hauptzutaten, die er verwenden möchte. Zusätzlich bekommst du eine Liste seiner häufig genutzten Lebensmittel – du darfst davon weitere als Ergänzung vorschlagen (Gewürze, Öl, Beilagen etc.), aber die Hauptzutaten müssen die Basis bilden.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "name": "Name des Gerichts",
  "servings": 2,
  "prepTime": "20 Min.",
  "ingredients": [
    { "name": "Zutat", "amount": "200g", "isMain": true, "category": "Fleisch&Wurst" },
    { "name": "Ergänzung", "amount": "1 EL", "isMain": false, "category": "Öle&Fette" }
  ],
  "steps": [
    "Schritt 1: ...",
    "Schritt 2: ..."
  ],
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
  }
}

Regeln:
- Rezept soll einfach und schnell sein (max 30 Min.)
- Alle Nährwerte realistisch schätzen
- Hauptzutaten mit isMain: true markieren
- Jede Zutat bekommt eine passende category aus: Fleisch&Wurst, Fisch&Meeresfrüchte, Käse, Nüsse&Samen, Gemüse, Brot&Teigwaren, Öle&Fette, Getränke, Obst, Milchprodukte, Süßwaren, Sonstiges
- Nur wenn keine Kategorie passt: "Eigene"
- 3-6 Zubereitungsschritte
- Portionsgröße angeben
- Kein zusätzlicher Text außerhalb des JSON`;

    const selectedList = selectedFoods.map((f: any) => `${f.name} (${f.calories} kcal, P:${f.protein}g F:${f.fat}g KH:${f.carbs}g pro ${f.baseUnit})`).join("\n");
    const frequentList = frequentFoods?.length > 0
      ? `\n\nHäufig genutzte Lebensmittel des Nutzers:\n${frequentFoods.map((f: any) => f.name).join(", ")}`
      : "";

    const userContent = `Erstelle ein leckeres, schnelles Rezept mit diesen Hauptzutaten:\n${selectedList}${frequentList}`;

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
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent erschöpft." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "KI-Rezeptgenerierung fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      result = { error: "Rezept konnte nicht erstellt werden." };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-generator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
