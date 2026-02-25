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
            content: `Du bist ein Ernährungsdaten-Assistent. Der Nutzer nennt dir ein Lebensmittel und du lieferst die Nährwerte PRO 100g (oder 100ml bei Getränken) zurück. Antworte ausschließlich mit einem JSON-Objekt in exakt diesem Format – keine weiteren Erklärungen:
{"name":"<Name des Lebensmittels>","calories":<number>,"protein":<number>,"fat":<number>,"carbs":<number>,"fiber":<number>,"liquidMl":<number oder 0>,"category":"<passende Kategorie>","defaultAmount":<number oder null>}

Regeln:
- Alle Werte pro 100g/100ml, gerundet auf 1 Dezimalstelle
- liquidMl: Setze auf 100 wenn es ein Getränk ist, sonst 0
- category: Wähle aus: Backwaren, Eier, Fette & Öle, Fisch & Meeresfrüchte, Fleisch, Gemüse & Salat, Getränke, Getreide & Nudeln, Milchprodukte, Obst, Snacks & Süßigkeiten, Soßen & Gewürze, Eigene
- defaultAmount: Typische Portionsgröße in g/ml (z.B. 250 für eine Tasse Kaffee, 30 für eine Scheibe Brot), oder null wenn 100 passt
- name: Deutsch, Großbuchstabe am Anfang`,
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
              description: "Return nutritional data for a food item per 100g/100ml",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Name of the food item in German" },
                  calories: { type: "number", description: "kcal per 100g/100ml" },
                  protein: { type: "number", description: "Protein in g per 100g/100ml" },
                  fat: { type: "number", description: "Fat in g per 100g/100ml" },
                  carbs: { type: "number", description: "Carbs in g per 100g/100ml" },
                  fiber: { type: "number", description: "Fiber in g per 100g/100ml" },
                  liquidMl: { type: "number", description: "100 if beverage, 0 otherwise" },
                  category: { type: "string", description: "Food category in German" },
                  defaultAmount: { type: ["number", "null"], description: "Typical portion size in g/ml or null" },
                },
                required: ["name", "calories", "protein", "fat", "carbs", "fiber", "liquidMl", "category"],
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
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
