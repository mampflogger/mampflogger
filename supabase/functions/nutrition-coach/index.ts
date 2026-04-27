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
    const accessToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { weekData, profile, micronutrients } = await req.json();

    if (!weekData || !Array.isArray(weekData)) {
      return new Response(JSON.stringify({ error: "weekData is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let microBlock = "";
    if (micronutrients) {
      const formatList = (items: any[]) =>
        items
          .filter((i: any) => i.avgDaily > 0 || i.target)
          .map((i: any) => {
            const pct = i.target ? Math.round((i.avgDaily / i.target) * 100) : null;
            return `  - ${i.name}: ${i.avgDaily} ${i.unit}/Tag ${i.target ? `(Soll: ${i.target} ${i.unit}, ${pct}%)` : "(kein Sollwert)"}`;
          })
          .join("\n");

      microBlock = `\n\nMikronährstoff-Durchschnitt (letzte 7 Tage):\nVitamine:\n${formatList(micronutrients.vitamins)}\nMineralstoffe:\n${formatList(micronutrients.minerals)}`;
    }

    const systemPrompt = `Du bist ein freundlicher, motivierender Ernährungscoach. Du analysierst die Ernährungsdaten der letzten 7 Tage und gibst 3-5 personalisierte, konkrete Tipps.

Profildaten des Nutzers:
${profile ? `- Geschlecht: ${profile.gender === "male" ? "männlich" : "weiblich"}
- Geburtsjahr: ${profile.birthYear}
- Größe: ${profile.heightCm} cm
- Gewicht: ${profile.weightKg} kg
${profile.goalWeightKg ? `- Zielgewicht: ${profile.goalWeightKg} kg` : ""}
${profile.goalDeficit ? `- Tägliches Kaloriendefizit-Ziel: ${profile.goalDeficit} kcal` : ""}` : "Kein Profil vorhanden."}

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "summary": "Kurze Zusammenfassung (1-2 Sätze) über das Essverhalten der Woche",
  "tips": [
    {
      "icon": "💡",
      "title": "Kurzer Titel",
      "text": "Konkreter, personalisierter Tipp (1-2 Sätze)"
    }
  ]
}

Regeln:
- Genau 3-5 Tipps
- Verwende passende Emojis als Icons (z.B. 🥦 🏋️ 💧 🌙 ⚖️ 🥩 🍞 🎯 ⏰ 💊 🧬)
- Erkenne Muster: z.B. abends zu viele KH, zu wenig Protein, zu wenig Ballaststoffe, unregelmäßige Essenszeiten
- Mikronährstoffe: Beurteile AUSSCHLIESSLICH anhand des im Datenblock angegebenen Prozentwerts (avgDaily vs. Soll). Ein Nährstoff ist NUR DANN ein Defizit, wenn der Prozentwert < 80% beträgt. Liegt er bei ≥ 100%, ist er ausreichend – erwähne ihn dann NICHT als Mangel, auch nicht für Vitamin D.
- Erfinde KEINE Informationen, die nicht in den Daten stehen. Du hast KEINE Daten über Sonnenexposition, Schlaf, Stress, Outdoor-Aktivität, Jahreszeit oder Wohnort – spekuliere darüber NICHT.
- Sprich nur über Werte, die tatsächlich im übergebenen Datenblock vorhanden sind.
- Sei konkret und positiv, nicht belehrend
- Kein zusätzlicher Text außerhalb des JSON`;

    const userContent = `Hier sind meine Ernährungsdaten der letzten 7 Tage:\n\n${JSON.stringify(weekData, null, 2)}${microBlock}`;

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
      return new Response(JSON.stringify({ error: "KI-Analyse fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let jsonStr = content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    // Try to extract JSON object
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      result = { summary: "Analyse konnte nicht erstellt werden.", tips: [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nutrition-coach error:", e);
    return new Response(
      JSON.stringify({ error: "Ein interner Fehler ist aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
