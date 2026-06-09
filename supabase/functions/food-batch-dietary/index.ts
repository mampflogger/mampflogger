import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  missingFields: string[]; // which fields need to be filled
}

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
      `${i}|${f.name}|${f.calories}|${f.protein}|${f.fat}|${f.carbs}|${f.fiber}|${f.category || ""}|${f.missingFields.join(",")}`
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
            content: `Du bist ein Ernährungs-Datenbank-Experte. Du erhältst Lebensmittel mit Nährwerten (pro 100g/100ml) im Format:
INDEX|NAME|KCAL|PRO|FAT|KH|FIB|KATEGORIE|FEHLENDE_FELDER

Die FEHLENDE_FELDER-Spalte listet kommagetrennt auf, welche Felder du ergänzen sollst. Gib NUR die angeforderten Felder zurück.

Mögliche Felder und ihre Bedeutung:

DIÄT-FLAGS (Wert: "J" oder "N"):
- vgn: Vegan (rein pflanzlich, KEINE tierischen Bestandteile)
- vgt: Vegetarisch (kein Fleisch/Fisch, Milch/Eier/Honig erlaubt)
- lc: Low Carb (≤10g KH pro 100g)
- hp: High Protein (≥15g PRO pro 100g)
- ket: Keto (≤5g KH pro 100g)
- gf: Glutenfrei (kein Weizen, Roggen, Gerste, Dinkel, Hafer)
- lf: Laktosefrei (keine Laktose – hart gereifte Käse wie Parmesan, Emmentaler, Gouda, Bergkäse SIND laktosefrei)
- zf: Zuckerfrei (max 1g Zucker pro 100g)

NÄHRWERTE:
- gi: Glykämischer Index (0-100, ganzzahlig). 0 für Lebensmittel ohne KH.
- category: Eine von: Fleisch&Wurst, Fisch&Meeresfrüchte, Käse, Nüsse&Samen, Gemüse, Brot&Teigwaren, Öle&Fette, Getränke, Obst, Milchprodukte, Süßwaren, Sonstiges, Fertiggerichte
- notes: Kurze Zusatzinfo (max 80 Zeichen), z.B. "Reich an Omega-3" oder "Enthält Laktose". Leer lassen wenn nichts Relevantes.

VITAMINE (Wert: mg pro 100g, Dezimalzahl, 0 wenn nicht vorhanden):
- vitA, vitB1, vitB2, vitB3, vitB5, vitB6, vitB7, vitB9, vitB12, vitC, vitD, vitE, vitK

MINERALSTOFFE (Wert: mg pro 100g, Dezimalzahl, 0 wenn nicht vorhanden):
- calcium, chlorid, eisen, fluorid, kalium, kupfer, magnesium, mangan, natrium, phosphor, schwefel, zink

PLAUSIBILITÄTSGRENZEN (orientiert an BLS / DGE – Werte pro 100g NIEMALS überschreiten):
- vitA ≤ 15000 µg (nur Leber kommt nah ran), vitB1/B2/B6 ≤ 5 mg, vitB3 ≤ 30 mg, vitB12 ≤ 100 µg, vitC ≤ 1500 mg, vitD ≤ 50 µg, vitE ≤ 100 mg, vitK ≤ 1000 µg, vitB9 ≤ 1500 µg, vitB5 ≤ 30 mg, vitB7 ≤ 200 µg
- calcium ≤ 1200 mg, eisen ≤ 30 mg (nur Leber/Innereien höher, max 100), kupfer ≤ 5 mg, zink ≤ 15 mg (Austern bis 80), magnesium ≤ 600 mg, mangan ≤ 15 mg, phosphor ≤ 1500 mg, kalium ≤ 2500 mg, fluorid ≤ 5 mg
- natrium/chlorid dürfen bei Salz/sehr salzigen Produkten hoch sein (bis 40000)
- Wenn du unsicher bist oder kein verlässlicher Referenzwert existiert: gib 0 zurück, KEINE Schätzung über die Grenze hinaus.

Wichtige Regeln:
- Fleisch & Wurst → IMMER vgn=N, vgt=N
- Fisch & Meeresfrüchte → IMMER vgn=N, vgt=N
- Käse → IMMER vgn=N, vgt=J
- Milchprodukte → IMMER vgn=N, vgt=J
- Eier → vgn=N, vgt=J
- Butter, Schmalz = vgn=N, vgt=J
- Pflanzenöle = vgn=J, vgt=J
- Nudeln/Brot mit Weizenmehl = gf=N
- Reis, Kartoffel, Mais = gf=J
- Obst hat natürlichen Zucker → zf=N (außer Zitrone/Limette)
- Zero/Light-Getränke → zf=J

Antworte NUR mit einem JSON-Array. Jedes Element hat "i" (Index) und NUR die angeforderten Felder.
Beispiel: [{"i":0,"vgn":"J","gi":35,"vitC":12.5},{"i":1,"category":"Gemüse","calcium":40}]`,
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit – bitte warte kurz und versuche es erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "KI-Klassifizierung fehlgeschlagen." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Klassifizierung fehlgeschlagen." }), {
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
      JSON.stringify({ error: "Ein interner Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
