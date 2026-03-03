import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FoodInput {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  category?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { foods } = await req.json() as { foods: FoodInput[] };
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return new Response(JSON.stringify({ error: "foods array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build a compact table for the AI
    const foodTable = foods.map((f, i) =>
      `${i}|${f.name}|${f.calories}|${f.protein}|${f.fat}|${f.carbs}|${f.fiber}|${f.category || ""}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du bist ein Ernährungs-Klassifikator. Du erhältst eine Liste von Lebensmitteln mit Nährwerten (pro 100g/100ml) im Format:
INDEX|NAME|KCAL|PRO|FAT|KH|FIB|KATEGORIE

Bestimme für JEDES Lebensmittel diese 8 Eigenschaften als J (Ja) oder N (Nein):
- VGN: Vegan (rein pflanzlich, KEINE tierischen Bestandteile wie Fleisch, Fisch, Milch, Eier, Honig, Gelatine)
- VGT: Vegetarisch (kein Fleisch/Fisch, aber Milch/Eier/Honig erlaubt)
- LC: Low Carb (≤10g KH pro 100g)
- HP: High Protein (≥15g PRO pro 100g)
- KET: Keto (≤5g KH pro 100g)
- GF: Glutenfrei (kein Weizen, Roggen, Gerste, Dinkel, Hafer)
- LF: Laktosefrei (keine Laktose – hart gereifte Käse wie Parmesan, Emmentaler, Gouda, Bergkäse SIND laktosefrei)
- ZF: Zuckerfrei (max 1g Zucker pro 100g, natürlich oder zugesetzt)

Antworte NUR mit einem JSON-Array. Jedes Element: { "i": INDEX, "vgn": "J"|"N", "vgt": "J"|"N", "lc": "J"|"N", "hp": "J"|"N", "ket": "J"|"N", "gf": "J"|"N", "lf": "J"|"N", "zf": "J"|"N" }

Wichtige Regeln:
- Fleisch & Wurst → IMMER vgn=N, vgt=N
- Fisch & Meeresfrüchte → IMMER vgn=N, vgt=N
- Käse → IMMER vgn=N, vgt=J (außer mit Lab aus Tier)
- Milchprodukte → IMMER vgn=N, vgt=J
- Eier → vgn=N, vgt=J
- Getränke: Cola/Limo/Saft = vgn=J, vgt=J. Milchkaffee/Kakao mit Milch = vgn=N
- Butter, Schmalz = vgn=N, vgt=J
- Pflanzenöle = vgn=J, vgt=J
- Nudeln/Brot/Teigwaren mit Weizenmehl = gf=N
- Reis, Kartoffel, Mais = gf=J
- Obst hat natürlichen Zucker → zf=N (außer Zitrone/Limette)
- Getränke mit Zucker (Cola, Fanta, Saft) → zf=N
- Zero/Light-Getränke → zf=J`,
          },
          {
            role: "user",
            content: foodTable,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI error ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", content.substring(0, 500));
      return new Response(JSON.stringify({ error: "No valid response", raw: content.substring(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("food-batch-dietary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
