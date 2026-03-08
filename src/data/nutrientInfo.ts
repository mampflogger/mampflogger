/**
 * Short descriptions and food tips for vitamins and minerals.
 * Used in the expandable info panels on the statistics page.
 */

export interface NutrientInfo {
  description: string;
  foods: string[];
}

export const NUTRIENT_INFO: Record<string, NutrientInfo> = {
  // === Vitamins ===
  vitA: {
    description: "Wichtig für Sehkraft, Immunsystem und gesunde Haut. Unterstützt das Zellwachstum und schützt Schleimhäute.",
    foods: ["Süßkartoffel", "Karotten", "Spinat", "Leber", "Eigelb", "Butter"],
  },
  vitB1: {
    description: "Essentiell für den Energiestoffwechsel und die Nervenfunktion. Hilft bei der Umwandlung von Kohlenhydraten in Energie.",
    foods: ["Vollkornprodukte", "Schweinefleisch", "Sonnenblumenkerne", "Haferflocken", "Linsen"],
  },
  vitB2: {
    description: "Beteiligt am Energiestoffwechsel und schützt Zellen vor oxidativem Stress. Wichtig für Haut und Augen.",
    foods: ["Milchprodukte", "Eier", "Mandeln", "Champignons", "Lachs"],
  },
  vitB3: {
    description: "Unterstützt den Energiestoffwechsel, die Nervenfunktion und hilft bei der Regeneration von Haut und Schleimhäuten.",
    foods: ["Hähnchenbrust", "Thunfisch", "Erdnüsse", "Vollkornreis", "Pilze"],
  },
  vitB5: {
    description: "Beteiligt an der Synthese von Hormonen und Neurotransmittern. Unterstützt den Fettstoffwechsel.",
    foods: ["Avocado", "Eier", "Leber", "Brokkoli", "Vollkornprodukte"],
  },
  vitB6: {
    description: "Zentral für den Eiweißstoffwechsel, die Bildung roter Blutkörperchen und die Immunabwehr.",
    foods: ["Bananen", "Kartoffeln", "Hähnchen", "Kichererbsen", "Walnüsse"],
  },
  vitB7: {
    description: "Auch bekannt als Biotin – wichtig für gesunde Haare, Haut und Nägel sowie den Stoffwechsel von Fettsäuren.",
    foods: ["Eier", "Nüsse", "Haferflocken", "Sojabohnen", "Spinat"],
  },
  vitB9: {
    description: "Entscheidend für die Zellteilung und DNA-Synthese. Besonders wichtig in Schwangerschaft und Wachstumsphasen.",
    foods: ["Grünes Blattgemüse", "Hülsenfrüchte", "Spargel", "Orangen", "Vollkornbrot"],
  },
  vitB12: {
    description: "Unverzichtbar für die Blutbildung, das Nervensystem und den Zellstoffwechsel. Kommt fast nur in tierischen Produkten vor.",
    foods: ["Leber", "Rindfleisch", "Lachs", "Eier", "Milchprodukte"],
  },
  vitC: {
    description: "Starkes Antioxidans, stärkt das Immunsystem, fördert die Wundheilung und verbessert die Eisenaufnahme.",
    foods: ["Paprika", "Brokkoli", "Kiwi", "Zitrusfrüchte", "Erdbeeren"],
  },
  vitD: {
    description: "Das „Sonnenvitamin" – wichtig für Knochen, Zähne und Immunsystem. Wird durch Sonnenlicht in der Haut gebildet.",
    foods: ["Fetter Fisch (Lachs, Hering)", "Eigelb", "Pilze (UV-bestrahlt)", "Lebertran", "Angereicherte Milch"],
  },
  vitE: {
    description: "Schützt Zellen als Antioxidans vor freien Radikalen. Unterstützt das Immunsystem und die Hautgesundheit.",
    foods: ["Sonnenblumenöl", "Mandeln", "Haselnüsse", "Avocado", "Weizenkeime"],
  },
  vitK: {
    description: "Essentiell für die Blutgerinnung und den Knochenstoffwechsel. Unterstützt die Einlagerung von Calcium in Knochen.",
    foods: ["Grünkohl", "Spinat", "Brokkoli", "Sauerkraut", "Petersilie"],
  },

  // === Minerals ===
  calcium: {
    description: "Der wichtigste Baustein für Knochen und Zähne. Spielt auch eine Rolle bei der Muskelfunktion und Blutgerinnung.",
    foods: ["Milch & Käse", "Brokkoli", "Grünkohl", "Mandeln", "Mineralwasser (calciumreich)"],
  },
  chlorid: {
    description: "Bestandteil der Magensäure und wichtig für den Wasserhaushalt. Wird meist über Kochsalz aufgenommen.",
    foods: ["Kochsalz", "Oliven", "Tomaten", "Sojasauce", "Meeresalgen"],
  },
  eisen: {
    description: "Transportiert Sauerstoff im Blut. Eisenmangel ist einer der häufigsten Nährstoffmängel weltweit.",
    foods: ["Rotes Fleisch", "Linsen", "Spinat", "Kürbiskerne", "Quinoa"],
  },
  fluorid: {
    description: "Härtet den Zahnschmelz und schützt vor Karies. Trägt auch zur Knochenfestigkeit bei.",
    foods: ["Schwarzer Tee", "Meeresfisch", "Walnüsse", "Mineralwasser (fluoridreich)", "Vollkornprodukte"],
  },
  kalium: {
    description: "Reguliert den Blutdruck, den Wasserhaushalt und die Muskel- und Nervenfunktion.",
    foods: ["Bananen", "Kartoffeln", "Avocado", "Spinat", "Bohnen"],
  },
  kupfer: {
    description: "Beteiligt am Eisenstoffwechsel, der Bindegewebsbildung und dem Schutz vor oxidativem Stress.",
    foods: ["Cashewnüsse", "Leber", "Kakao", "Kichererbsen", "Vollkornprodukte"],
  },
  magnesium: {
    description: "Beteiligt an über 300 Enzymreaktionen. Wichtig für Muskeln, Nerven, Knochen und den Energiestoffwechsel.",
    foods: ["Nüsse", "Haferflocken", "Bananen", "Dunkle Schokolade", "Hülsenfrüchte"],
  },
  mangan: {
    description: "Cofaktor für viele Enzyme. Unterstützt den Knochen- und Bindegewebsaufbau sowie den Energiestoffwechsel.",
    foods: ["Haferflocken", "Nüsse", "Vollkornreis", "Ananas", "Spinat"],
  },
  natrium: {
    description: "Reguliert den Wasserhaushalt und Blutdruck. Zu viel kann Bluthochdruck fördern – die Dosis macht's.",
    foods: ["Kochsalz", "Brot", "Käse", "Oliven", "Wurstwaren"],
  },
  phosphor: {
    description: "Wichtiger Bestandteil von Knochen, Zähnen und Zellmembranen. Beteiligt am Energiestoffwechsel (ATP).",
    foods: ["Milchprodukte", "Fleisch", "Fisch", "Hülsenfrüchte", "Nüsse"],
  },
  schwefel: {
    description: "Bestandteil von Aminosäuren (Methionin, Cystein) und wichtig für Haare, Haut und Bindegewebe.",
    foods: ["Eier", "Knoblauch", "Zwiebeln", "Kohl", "Fleisch"],
  },
  zink: {
    description: "Stärkt das Immunsystem, fördert die Wundheilung und ist an über 200 Enzymreaktionen beteiligt.",
    foods: ["Rindfleisch", "Kürbiskerne", "Linsen", "Käse", "Haferflocken"],
  },
};
