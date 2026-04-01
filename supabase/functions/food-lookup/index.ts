import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { foodName } = await req.json();
    if (!foodName || typeof foodName !== "string") {
      return new Response(JSON.stringify({ error: "foodName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Du bist ein Ernährungsdaten-Assistent. Der Nutzer nennt dir ein Lebensmittel und du lieferst die Nährwerte PRO 100g (oder 100ml bei Getränken) zurück. Antworte ausschließlich mit einem JSON-Objekt – keine weiteren Erklärungen.

Regeln:
- Alle Werte pro 100g/100ml
- Makros gerundet auf 1 Dezimalstelle
- Vitamine und Spurenelemente: Werte so genau wie möglich
- liquidMl: Setze auf 100 wenn es ein Getränk ist, sonst 0
- gi: Glykämischer Index (0-100). Nur für kohlenhydrathaltige Lebensmittel relevant. Setze auf 0 bei Ölen, Fleisch, Fisch ohne Kohlenhydrate.
- category: Wähle EXAKT eine dieser Kategorien: Fleisch&Wurst, Fisch&Meeresfrüchte, Käse, Nüsse&Samen, Gemüse, Brot&Teigwaren, Öle&Fette, Getränke, Obst, Milchprodukte, Süßwaren, Sonstiges, Eigene
- defaultAmount: Typische Portionsgröße in g/ml oder null
- name: Deutsch, Großbuchstabe am Anfang
- Vitamine: vitA (µg), vitB1 (mg), vitB2 (mg), vitB3 (mg), vitB5 (mg), vitB6 (mg), vitB7 (µg), vitB9 (µg), vitB12 (µg), vitC (mg), vitD (µg), vitE (mg), vitK (µg)
- Spurenelemente: calcium (mg), chlorid (mg), eisen (mg), fluorid (mg), kalium (mg), kupfer (mg), magnesium (mg), mangan (mg), natrium (mg), phosphor (mg), schwefel (mg), zink (mg)
- Ernährungsflags (dietary): Bestimme für jedes Lebensmittel diese 8 Flags als boolean (true/false):
  - vgn: Vegan (rein pflanzlich, keine tierischen Bestandteile)
  - vgt: Vegetarisch (kein Fleisch/Fisch, aber Milch/Eier erlaubt)
  - lc: Low Carb (maximal ~10g KH pro 100g)
  - hp: High Protein (mindestens ~15g Protein pro 100g)
  - ket: Keto (maximal ~5g KH pro 100g, hoher Fettanteil)
  - gf: Glutenfrei (kein Weizen/Roggen/Gerste/Dinkel)
  - lf: Laktosefrei (keine Laktose)
  - zf: Zuckerfrei (kein zugesetzter Zucker, max. ~1g pro 100g)`,
          },
          {
            role: "user",
            content: foodName,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_nutrition_data",
              description: "Return nutritional data for a food item per 100g/100ml including vitamins and minerals",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Name of the food item in German" },
                  calories: { type: "number", description: "kcal per 100g/100ml" },
                  protein: { type: "number", description: "Protein in g per 100g/100ml" },
                  fat: { type: "number", description: "Fat in g per 100g/100ml" },
                  carbs: { type: "number", description: "Carbs in g per 100g/100ml" },
                  fiber: { type: "number", description: "Fiber in g per 100g/100ml" },
                  gi: { type: "number", description: "Glycemic Index (0-100)" },
                  liquidMl: { type: "number", description: "100 if beverage, 0 otherwise" },
                  category: { type: "string", enum: ["Fleisch&Wurst","Fisch&Meeresfrüchte","Käse","Nüsse&Samen","Gemüse","Brot&Teigwaren","Öle&Fette","Getränke","Obst","Milchprodukte","Süßwaren","Sonstiges","Eigene"], description: "Food category" },
                  defaultAmount: { type: ["number", "null"], description: "Typical portion size in g/ml or null" },
                  vitamins: {
                    type: "object",
                    properties: {
                      vitA: { type: "number", description: "Vitamin A (Retinol) in µg" },
                      vitB1: { type: "number", description: "Vitamin B1 (Thiamin) in mg" },
                      vitB2: { type: "number", description: "Vitamin B2 (Riboflavin) in mg" },
                      vitB3: { type: "number", description: "Vitamin B3 (Niacin) in mg" },
                      vitB5: { type: "number", description: "Vitamin B5 (Pantothensäure) in mg" },
                      vitB6: { type: "number", description: "Vitamin B6 (Pyridoxin) in mg" },
                      vitB7: { type: "number", description: "Vitamin B7 (Biotin) in µg" },
                      vitB9: { type: "number", description: "Vitamin B9 (Folsäure) in µg" },
                      vitB12: { type: "number", description: "Vitamin B12 (Cobalamin) in µg" },
                      vitC: { type: "number", description: "Vitamin C in mg" },
                      vitD: { type: "number", description: "Vitamin D in µg" },
                      vitE: { type: "number", description: "Vitamin E in mg" },
                      vitK: { type: "number", description: "Vitamin K in µg" },
                    },
                  },
                  minerals: {
                    type: "object",
                    properties: {
                      calcium: { type: "number", description: "Calcium in mg" },
                      chlorid: { type: "number", description: "Chlorid in mg" },
                      eisen: { type: "number", description: "Eisen in mg" },
                      fluorid: { type: "number", description: "Fluorid in mg" },
                      kalium: { type: "number", description: "Kalium in mg" },
                      kupfer: { type: "number", description: "Kupfer in mg" },
                      magnesium: { type: "number", description: "Magnesium in mg" },
                      mangan: { type: "number", description: "Mangan in mg" },
                      natrium: { type: "number", description: "Natrium in mg" },
                      phosphor: { type: "number", description: "Phosphor in mg" },
                      schwefel: { type: "number", description: "Schwefel in mg" },
                      zink: { type: "number", description: "Zink in mg" },
                    },
                  },
                  notes: { type: "string", description: "Additional notes about the food" },
                  dietary: {
                    type: "object",
                    description: "Dietary classification flags",
                    properties: {
                      vgn: { type: "boolean", description: "Vegan" },
                      vgt: { type: "boolean", description: "Vegetarisch" },
                      lc: { type: "boolean", description: "Low Carb (≤10g KH/100g)" },
                      hp: { type: "boolean", description: "High Protein (≥15g PRO/100g)" },
                      ket: { type: "boolean", description: "Keto (≤5g KH/100g, hoher Fettanteil)" },
                      gf: { type: "boolean", description: "Glutenfrei" },
                      lf: { type: "boolean", description: "Laktosefrei" },
                      zf: { type: "boolean", description: "Zuckerfrei (≤1g Zucker/100g)" },
                    },
                  },
                },
                required: ["name", "calories", "protein", "fat", "carbs", "fiber", "gi", "liquidMl", "category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_nutrition_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte kurz warten." }), {
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
      return new Response(JSON.stringify({ error: "KI-Abfrage fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const nutrition = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ success: true, data: nutrition }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content as JSON
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nutrition = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify({ success: true, data: nutrition }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {}

    return new Response(JSON.stringify({ error: "Konnte keine Nährwerte extrahieren" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("food-lookup error:", e);
    return new Response(
      JSON.stringify({ error: "Ein interner Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
