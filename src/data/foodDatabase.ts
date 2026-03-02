export const FOOD_CATEGORIES = [
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
  "Fertiggerichte",
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

export interface FoodVitamins {
  vitA?: number;   // Retinol, µg
  vitB1?: number;  // Thiamin, mg
  vitB2?: number;  // Riboflavin, mg
  vitB3?: number;  // Niacin, mg
  vitB5?: number;  // Pantothensäure, mg
  vitB6?: number;  // Pyridoxin, mg
  vitB7?: number;  // Biotin, µg
  vitB9?: number;  // Folsäure, µg
  vitB12?: number; // Cobalamin, µg
  vitC?: number;   // mg
  vitD?: number;   // µg
  vitE?: number;   // mg
  vitK?: number;   // µg
}

export interface FoodMinerals {
  calcium?: number;   // mg
  chlorid?: number;   // mg
  eisen?: number;     // mg
  fluorid?: number;   // mg
  kalium?: number;    // mg
  kupfer?: number;    // mg
  magnesium?: number; // mg
  mangan?: number;    // mg
  natrium?: number;   // mg
  phosphor?: number;  // mg
  schwefel?: number;  // mg
  zink?: number;      // mg
}

export interface FoodItem {
  name: string;
  baseUnit: string; // "100g", "100ml", "1 Stk"
  baseAmount: number; // numeric base: 100 for g/ml, 1 for Stk
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  gi?: number; // Glykämischer Index (0-100)
  defaultAmount?: number; // Standardmenge, z.B. 125g für eine Avocado
  liquidMl?: number; // Flüssigkeit in ml pro baseAmount (z.B. 100 bei 100ml-Basis)
  category?: FoodCategory;
  isUserCreated?: boolean; // Vom User selbst angelegt (niemals durch Remote überschreiben)
  isRemote?: boolean;      // Vom Remote-Server geladen
  notes?: string;          // Freitext-Zusatzinfos zum Lebensmittel
  vitamins?: FoodVitamins;
  minerals?: FoodMinerals;
}

// Category mapping for default foods
const FOOD_CATEGORY_MAP: Record<string, FoodCategory> = {
  "Ananas": "Obst", "Apfel": "Obst", "Apfelsaft": "Getränke", "Apfelschorle": "Getränke",
  "Appenzeller 50 % i. Tr.": "Käse", "Aprikose": "Obst", "Aubergine": "Gemüse", "Austernpilze": "Gemüse",
  "Avocado": "Gemüse", "Backpulver": "Sonstiges", "Banane": "Obst",
  "Beinscheibe (Rind)": "Fleisch&Wurst", "Bergkäse 45 % Fett i. Tr.": "Käse", "Bierschinken": "Fleisch&Wurst",
  "Bionade Holunder": "Getränke", "Birne": "Obst", "Bitter Lemon": "Getränke", "Blattspinat": "Gemüse",
  "Blumenkohl": "Gemüse", "Blutwurst": "Fleisch&Wurst", "Bockwurst": "Fleisch&Wurst",
  "Bratwurst (Geflügel)": "Fleisch&Wurst", "Bratwurst (Lamm)": "Fleisch&Wurst", "Bratwurst (Rind)": "Fleisch&Wurst", "Bratwurst (Schwein)": "Fleisch&Wurst",
  "Brie 50 % Fett i. Tr.": "Käse", "Brokkoli": "Gemüse", "Brombeeren": "Obst", "Burrata": "Käse",
  "Bulgur": "Brot&Teigwaren", "Butter": "Öle&Fette", "Cabanossi": "Fleisch&Wurst",
  "Camembert 30 % Fett i. Tr.": "Käse", "Camembert 45 % Fett i. Tr.": "Käse", "Camembert 60 % Fett i. Tr.": "Käse",
  "Cashewkerne": "Nüsse&Samen", "Cervelatwurst": "Fleisch&Wurst", "Champignons": "Gemüse",
  "Cheddar 50 %": "Käse", "Cherrytomaten": "Gemüse", "Chia-Samen": "Nüsse&Samen",
  "Chinakohl": "Gemüse", "Chorizo": "Fleisch&Wurst", "Clementine": "Obst", "Club Mate": "Getränke",
  "Coca-Cola Classic": "Getränke", "Coca-Cola Zero": "Getränke", "Couscous": "Brot&Teigwaren",
  "Dorade": "Fisch&Meeresfrüchte", "Dr Pepper": "Getränke", "Drachenfrucht": "Obst",
  "Edamer 30 % Fett i. Tr.": "Käse", "Edamer 40 % Fett i. Tr.": "Käse", "Eier (XL)": "Sonstiges",
  "Eistee Pfirsich": "Getränke", "Emmentaler 45 % Fett i. Tr.": "Käse",
  "Entenbrust (mit Haut)": "Fleisch&Wurst", "Entenkeule (mit Haut)": "Fleisch&Wurst",
  "Entrecôte (Rind)": "Fleisch&Wurst", "Erdbeeren": "Obst", "Erdnüsse": "Nüsse&Samen",
  "Erdnussöl": "Öle&Fette", "Fanta": "Getränke", "Fassbrause": "Getränke", "Feige": "Obst",
  "Feldsalat": "Gemüse", "Fenchel": "Gemüse", "Feta 45 % Fett i. Tr.": "Käse",
  "Fleischwurst": "Fleisch&Wurst", "Frankfurter Würstchen": "Fleisch&Wurst", "Flussbarsch": "Fisch&Meeresfrüchte",
  "Frischkäse 0,2 %": "Käse", "Frischkäse 20 %": "Milchprodukte",
  "Frischkäse 60 % Fett i. Tr.": "Käse", "Fritz-Kola": "Getränke", "Fritz-Limo (Zitrone/Orange)": "Getränke",
  "Frühkartoffeln": "Gemüse", "Frühstücksfleisch": "Fleisch&Wurst",
  "Garnele (Shrimps)": "Fisch&Meeresfrüchte", "Gänsebrust (mit Haut)": "Fleisch&Wurst",
  "Gänsekeule": "Fleisch&Wurst",
  "Geflügelsalami": "Fleisch&Wurst", "Gelbwurst": "Fleisch&Wurst", "Gemüsebrühe": "Getränke",
  "Ginger Ale": "Getränke", "Gemüsezwiebeln": "Gemüse", "Gorgonzola 48 %": "Käse",
  "Gouda 30 % Fett i. Tr.": "Käse", "Gouda 45% Fett i.Tr.": "Käse", "Granatapfel": "Obst",
  "Granatapfelsaft": "Getränke", "Grapefruit": "Obst", "Griech. Joghurt (2%)": "Milchprodukte",
  "Grünkohl": "Gemüse", "Gruyère": "Käse", "Gurke": "Gemüse", "Hähnchenbrustfilet": "Fleisch&Wurst",
  "Brathähnchen (halbes)": "Fleisch&Wurst", "Hähnchenflügel": "Fleisch&Wurst", "Hähnchenkeule (mit Haut)": "Fleisch&Wurst",
  "Hähnchenschenkel (ohne Haut)": "Fleisch&Wurst",
  "Halloumi 43% Fett i.Tr.": "Käse", "Hanföl": "Öle&Fette", "Hanfsamen (geschält)": "Nüsse&Samen",
  "Hamburger Patty (Rind)": "Fleisch&Wurst", "Harzer Käse 0,5 %": "Käse",
  "Haselnüsse": "Nüsse&Samen", "Heidelbeeren": "Obst", "Frische Hefe": "Sonstiges",
  "Heilbutt (weiß)": "Fisch&Meeresfrüchte", "Heringsfilet (Nixe)": "Fisch&Meeresfrüchte",
  "Himbeeren": "Obst", "Hirschgulasch": "Fleisch&Wurst",
  "Hirtenkäse 45 % Fett i. Tr.": "Käse", "Honig": "Sonstiges", "Honigmelone": "Obst",
  "Hüttenkäse 0,8 %": "Käse", "Hüttenkäse 4 %": "Milchprodukte", "Hüttenkäse Bio": "Käse",
  "Jagdwurst": "Fleisch&Wurst", "Joghurt 0,1 %": "Milchprodukte",
  "Joghurt 1,5 % Fett": "Milchprodukte", "Joghurt 3,5 % Fett": "Milchprodukte",
  "Johannisbeeren": "Obst", "Kabeljau (Dorsch)": "Fisch&Meeresfrüchte",
  "Kaffee mit Milch": "Getränke", "Karottensaft": "Getränke", "Kaffee (schwarz)": "Getränke",
  "Kakao 100%": "Süßwaren", "Kaki": "Obst",
  "Kalbsbrust": "Fleisch&Wurst", "Kalbsgulasch": "Fleisch&Wurst",
  "Kalbshaxe": "Fleisch&Wurst", "Kalbsleber": "Fleisch&Wurst", "Kalbsleberwurst": "Fleisch&Wurst",
  "Kalbsrücken": "Fleisch&Wurst", "Kalbsschnitzel": "Fleisch&Wurst",
  "Kaninchenfleisch": "Fleisch&Wurst", "Karotten": "Gemüse",
  "Karpfen": "Fisch&Meeresfrüchte", "Kartoffeln": "Gemüse",
  "Kasseler Lachs": "Fleisch&Wurst", "Kasseler Nacken": "Fleisch&Wurst",
  "Kiwi": "Obst", "Kohlrabi": "Gemüse", "Kokosnusswasser": "Getränke",
  "Kokosöl": "Öle&Fette", "Krakauer": "Fleisch&Wurst",
  "Kräuterseitlinge": "Gemüse", "Kürbiskerne": "Nüsse&Samen", "Kürbiskernöl": "Öle&Fette",
  "Lammfilet": "Fleisch&Wurst", "Lammhack": "Fleisch&Wurst", "Lammhaxe": "Fleisch&Wurst", "Lammkeule": "Fleisch&Wurst",
  "Lammkarree": "Fleisch&Wurst", "Lammkotelett": "Fleisch&Wurst", "Lammrücken": "Fleisch&Wurst", "Lammschulter": "Fleisch&Wurst",
  "Landjäger": "Fleisch&Wurst", "Lauchzwiebel": "Gemüse",
  "Leberkäse": "Fleisch&Wurst", "Leberwurst (fein)": "Fleisch&Wurst", "Leerdammer 45 % Fett i. Tr.": "Käse", "Leinsamenöl": "Öle&Fette",
  "Limette": "Obst", "Litschi": "Obst", "Lupinenschrot": "Gemüse",
  "Lyoner": "Fleisch&Wurst", "Macadamianüsse": "Nüsse&Samen",
  "Magerquark 0,2 %": "Milchprodukte", "Makrele (frisch)": "Fisch&Meeresfrüchte",
  "Malzbier": "Getränke", "Mandarine": "Obst", "Mandeln": "Nüsse&Samen", "Manchego": "Käse", "Mango": "Obst",
  "Maracuja": "Obst", "Matjesfilet": "Fisch&Meeresfrüchte", "Cantaloupe Melone": "Obst",
  "Mezzo Mix": "Getränke", "Wassermelone": "Obst", "Merguez": "Fleisch&Wurst", "Mettwurst": "Fleisch&Wurst",
  "Milch 0,1% Fett": "Milchprodukte", "Miesmuscheln": "Fisch&Meeresfrüchte",
  "Mineralwasser": "Getränke", "Milch 1,5 % Fett": "Milchprodukte",
  "Milch 3,5 %": "Milchprodukte", "Milchkaffee": "Getränke", "Mini Harzer": "Käse",
  "Marmelade": "Sonstiges", "Mehl (Weizen)": "Brot&Teigwaren", "Möhren": "Gemüse",
  "Monster Energy": "Getränke", "Mortadella": "Fleisch&Wurst", "Mountain Dew": "Getränke",
  "Multivitaminsaft": "Getränke", "Mozzarella 8,5 % Fett i. Tr. (light)": "Käse", "Mozzarella 20 % Fett i. Tr.": "Käse",
  "Nektarine": "Obst", "Lachs (Norwegen)": "Fisch&Meeresfrüchte",
  "Nudeln (Hartweizen, trocken)": "Brot&Teigwaren", "Nürnberger Rostbratwurst": "Fleisch&Wurst",
  "Olivenöl": "Öle&Fette", "Orange": "Obst", "Orangensaft": "Getränke", "Papaya": "Obst",
  "Paprika (grün/gelb)": "Gemüse", "Paprika (rot)": "Gemüse",
  "Paprikalyoner": "Fleisch&Wurst", "Paranüsse": "Nüsse&Samen", "Parmesan 32 % Fett i. Tr.": "Käse",
  "Pastinaken": "Gemüse", "Paulaner Spezi": "Getränke", "Pekannüsse": "Nüsse&Samen",
  "Pepsi Cola": "Getränke", "Pecorino Romano 32 % Fett i. Tr.": "Käse", "Pfirsich": "Obst", "Pflaume": "Obst", "Physalis": "Obst",
  "Pinienkerne": "Nüsse&Samen", "Pistazien": "Nüsse&Samen",
  "Presssack (rot)": "Fleisch&Wurst", "Proteinpulver": "Sonstiges",
  "Putenbrust": "Fleisch&Wurst", "Putenfleisch": "Fleisch&Wurst",
  "Putenkeule": "Fleisch&Wurst", "Putenoberkeule": "Fleisch&Wurst",
  "Putenschnitzel": "Fleisch&Wurst", "Putensteak": "Fleisch&Wurst",
  "Speisequark 20% Fett i.Tr.": "Milchprodukte", "Quark 40 %": "Milchprodukte",
  "Quinoa (ungekocht)": "Brot&Teigwaren", "Quitte": "Obst",
  "Radieschen": "Gemüse", "Radler (alkoholfrei)": "Getränke", "Rapsöl": "Öle&Fette",
  "Red Bull": "Getränke",
  "Regenbogen-Forelle": "Fisch&Meeresfrüchte", "Reis (roh)": "Brot&Teigwaren",
  "Rhabarber": "Gemüse", "Rotbarsch": "Fisch&Meeresfrüchte", "Ricotta 13 %": "Käse",
  "Rehkeule": "Fleisch&Wurst", "Rehrücken": "Fleisch&Wurst", "Rinderbraten": "Fleisch&Wurst",
  "Rinderfilet": "Fleisch&Wurst", "Rindergulasch": "Fleisch&Wurst",
  "Rinderhackfleisch": "Fleisch&Wurst", "Rinderhüfte": "Fleisch&Wurst",
  "Rinderroulade": "Fleisch&Wurst", "Rindersalami": "Fleisch&Wurst",
  "Rinderschnitzel": "Fleisch&Wurst", "Roastbeef": "Fleisch&Wurst",
  "Sauerbraten (Rind)": "Fleisch&Wurst", "Romanasalat": "Gemüse",
  "Rosenkohl": "Gemüse", "Rote Bete (Glas)": "Gemüse", "Rote Bete (vorgegart)": "Gemüse",
  "Rotkohl": "Gemüse", "Salami": "Fleisch&Wurst", "Sanddornbeeren": "Obst",
  "Sardinen (abgetropft)": "Fisch&Meeresfrüchte", "Sauerkirschen": "Obst",
  "Sauerkraut": "Gemüse", "Schafskäse 45 % Fett i. Tr.": "Käse",
  "Schokolade Dunkel (70%)": "Süßwaren", "Schokolade Dunkel (85%)": "Süßwaren",
  "Schokolade Dunkel (100%)": "Süßwaren", "Schokolade Erdbeer-Joghurt": "Süßwaren",
  "Schokolade Haselnuss": "Süßwaren", "Schokolade Keks & Crunch": "Süßwaren",
  "Schokolade Mandelsplitter": "Süßwaren", "Schokolade Marzipan": "Süßwaren",
  "Schokolade Noisette": "Süßwaren", "Nougat-Schokolade": "Süßwaren",
  "Vollmilchschokolade": "Süßwaren", "Schokolade Weiß": "Süßwaren",
  "Scholle": "Fisch&Meeresfrüchte",
  "Schwarzwälder Schinken": "Fleisch&Wurst", "Schweinebauch": "Fleisch&Wurst",
  "Schweinebraten": "Fleisch&Wurst", "Schweinefilet": "Fleisch&Wurst",
  "Schweinegeschnetzeltes": "Fleisch&Wurst", "Schweinegulasch": "Fleisch&Wurst",
  "Schweinehackfleisch": "Fleisch&Wurst", "Schweinehaxe": "Fleisch&Wurst",
  "Schweinekotelett": "Fleisch&Wurst", "Schweinelende": "Fleisch&Wurst",
  "Schweinenacken": "Fleisch&Wurst", "Schweineschnitzel (Oberschale)": "Fleisch&Wurst",
  "Suppenhuhn": "Fleisch&Wurst",
  "Seelachs": "Fisch&Meeresfrüchte",
  "Staudensellerie": "Gemüse", "Senf": "Sonstiges",
  "Serrano Schinken": "Fleisch&Wurst", "Sesamöl": "Öle&Fette",
  "Sonnenblumenkerne": "Nüsse&Samen", "Sonnenblumenöl": "Öle&Fette",
  "Spezi": "Getränke", "Spitzkohl": "Gemüse", "Sprite": "Getränke",
  "Stachelbeeren (frisch)": "Obst", "Sucuk": "Fleisch&Wurst", "Suppengrün": "Gemüse",
  "Süßkartoffel": "Gemüse", "Süßkirschen": "Obst",
  "Teewurst": "Fleisch&Wurst", "Thunfisch (Dose in eigenem Saft)": "Fisch&Meeresfrüchte",
  "Thunfisch (frisch)": "Fisch&Meeresfrüchte", "Tilsiter 30 % Fett i. Tr.": "Käse",
  "Tilsiter 45% Fett i. Tr.": "Käse", "Tintenfisch (Calamari)": "Fisch&Meeresfrüchte",
  "TK-Heidelbeeren (ungesüßt)": "Obst", "Tomaten": "Gemüse",
  "Tomatensaft": "Getränke", "Tonic Water": "Getränke", "Traubenkernöl": "Öle&Fette",
  "Traubensaft": "Getränke", "Vollkornbrot": "Brot&Teigwaren",
  "Vollkornmehl": "Sonstiges", "Vollkornnudeln": "Brot&Teigwaren",
  "Walnüsse": "Nüsse&Samen", "Walnussöl": "Öle&Fette", "Wasser": "Getränke",
  "Weintrauben": "Obst", "Weintrauben rot": "Obst", "Weiße Bohnen (Dose)": "Gemüse",
  "Weißkohl": "Gemüse",
  "Wels": "Fisch&Meeresfrüchte", "Weißwurst": "Fleisch&Wurst",
  "Wiener Würstchen": "Fleisch&Wurst", "Wildschweingulasch": "Fleisch&Wurst", "Wirsing": "Gemüse",
  "Ziegenkäse (45% Fett i. Tr.)": "Käse", "Zitrone": "Obst", "Zitronensaft": "Getränke",
  "Zucchini": "Gemüse", "Zucker": "Sonstiges", "Zwetschge": "Obst",
  "Zwiebelmettwurst": "Fleisch&Wurst", "Zander": "Fisch&Meeresfrüchte",
  "Zwiebeln": "Gemüse", "Gekochter Schinken": "Fleisch&Wurst",
  "Basmati Reis": "Brot&Teigwaren", "Rucola": "Gemüse", "Oliven (schwarz)": "Gemüse",
  "Getrocknete Tomaten": "Gemüse", "Kirschtomaten": "Gemüse", "Lachsfilet": "Fisch&Meeresfrüchte",
  "Paprika gelb": "Gemüse",
};

/** Lookup category for a food name */
export function getFoodCategory(name: string): FoodCategory | undefined {
  return FOOD_CATEGORY_MAP[name];
}

/** Smart category guesser: checks exact match, then keyword-based heuristics.
 *  Falls back to "Eigene" only if nothing matches. */
export function guessCategory(name: string, aiCategory?: string): FoodCategory {
  // 1. If AI provided a valid category, use it
  if (aiCategory && (FOOD_CATEGORIES as readonly string[]).includes(aiCategory)) {
    return aiCategory as FoodCategory;
  }
  // 2. Exact match from category map
  const exact = FOOD_CATEGORY_MAP[name];
  if (exact) return exact;
  // 3. Keyword heuristics
  const lower = name.toLowerCase();
  const keywords: [string[], FoodCategory][] = [
    [["huhn", "hähn", "pute", "rind", "schwein", "lamm", "ente", "gans", "kalb", "wurst", "schinken", "speck", "hack", "filet", "steak", "braten", "gulasch", "schnitzel", "salami", "fleisch", "bacon", "reh", "hirsch", "wildschwein", "haxe", "keule", "roulade", "suppenhuhn", "sauerbraten", "karree"], "Fleisch&Wurst"],
    [["lachs", "forelle", "thunfisch", "kabeljau", "hering", "garnele", "shrimp", "muschel", "fisch", "scholle", "barsch", "karpfen", "dorsch", "sardine", "calamari", "tintenfisch", "dorade", "heilbutt", "makrele"], "Fisch&Meeresfrüchte"],
    [["käse", "parmesan", "mozzarella", "gouda", "edamer", "emmentaler", "cheddar", "feta", "brie", "camembert", "halloumi", "ricotta", "gorgonzola"], "Käse"],
    [["nuss", "nüsse", "mandel", "cashew", "pistazie", "walnuss", "erdnuss", "samen", "kerne", "pekan", "macadamia", "haselnuss", "paranuss"], "Nüsse&Samen"],
    [["salat", "spinat", "kohl", "brokkoli", "blumenkohl", "zucchini", "aubergine", "paprika", "tomate", "gurke", "karotte", "möhre", "lauch", "zwiebel", "knoblauch", "sellerie", "fenchel", "radieschen", "champignon", "pilz", "erbse", "bohne", "gemüse", "kartoffel", "süßkartoffel", "kürbis", "mais", "petersilie", "basilikum", "kräuter", "dill", "schnittlauch", "rosmarin", "thymian", "oregano", "kohlrabi", "rote bete"], "Gemüse"],
    [["brot", "nudel", "pasta", "spaghetti", "penne", "makkaroni", "reis", "mehl", "teig", "semmel", "brötchen", "toast", "couscous", "bulgur", "quinoa", "haferflocken", "müsli", "cornflakes", "tortilla", "wrap"], "Brot&Teigwaren"],
    [["öl", "fett", "butter", "margarine", "schmalz", "mayonnaise", "mayo"], "Öle&Fette"],
    [["saft", "cola", "limo", "wasser", "tee", "kaffee", "milchkaffee", "kakao", "brühe", "smoothie", "bier", "wein", "sekt", "energy", "mate"], "Getränke"],
    [["apfel", "birne", "banane", "orange", "zitrone", "limette", "kiwi", "mango", "ananas", "erdbeere", "himbeere", "blaubeere", "heidelbeere", "kirsche", "traube", "melone", "pflaume", "pfirsich", "aprikose", "obst", "beere"], "Obst"],
    [["joghurt", "quark", "milch", "sahne", "rahm", "skyr", "buttermilch", "kefir", "schmand", "crème fraîche", "molke"], "Milchprodukte"],
    [["schokolade", "gummibärchen", "bonbon", "keks", "kuchen", "eis", "zucker", "honig", "marmelade", "nutella", "süß"], "Süßwaren"],
    [["tiefkühlpizza", "fertiggericht", "pizza tk", "lasagne tk", "tk-pizza", "mikrowelle", "fertig-", "convenience", "tk ", "tiefkühl", "döner", "kebab", "burger", "asia-pfanne", "bami goreng", "nasi goreng", "cordon bleu", "cevapcici", "kroketten", "kartoffelpuffer", "wrap", "burrito", "hot dog", "chicken wings", "wedges", "taquitos", "backfisch", "rösti", "frikadellen", "cannelloni", "mac and cheese"], "Fertiggerichte"],
  ];
  for (const [words, cat] of keywords) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return "Eigene";
}

const FOOD_DB_KEY = "mampflogger-food-database";
const DELETED_FOODS_KEY = "mampflogger-deleted-foods";

// ---- Deleted-foods blacklist ----
function loadDeletedFoods(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_FOODS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveDeletedFoods(deleted: Set<string>): void {
  localStorage.setItem(DELETED_FOODS_KEY, JSON.stringify([...deleted]));
}

export function markFoodDeleted(name: string): void {
  const deleted = loadDeletedFoods();
  deleted.add(name.toLowerCase());
  saveDeletedFoods(deleted);
}

export function unmarkFoodDeleted(name: string): void {
  const deleted = loadDeletedFoods();
  deleted.delete(name.toLowerCase());
  saveDeletedFoods(deleted);
}

export function isDeletedFood(name: string): boolean {
  return loadDeletedFoods().has(name.toLowerCase());
}

export function clearDeletedFoods(): void {
  localStorage.removeItem(DELETED_FOODS_KEY);
}

export const DEFAULT_FOODS: FoodItem[] = [
  { name: "Ananas", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 0.5, fat: 0.1, carbs: 12.4, fiber: 1.4, defaultAmount: 150 },
  { name: "Apfel", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 0.3, fat: 0.2, carbs: 11.4, fiber: 2.4, defaultAmount: 150 },
  { name: "Apfelsaft", baseUnit: "100ml", baseAmount: 100, calories: 46, protein: 0.1, fat: 0.1, carbs: 11, fiber: 0.2, defaultAmount: 200, liquidMl: 100 },
  { name: "Apfelschorle", baseUnit: "100ml", baseAmount: 100, calories: 24, protein: 0, fat: 0, carbs: 5.7, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Appenzeller 50 % i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 395, protein: 25.5, fat: 32.3, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Aprikose", baseUnit: "100g", baseAmount: 100, calories: 48, protein: 1.4, fat: 0.1, carbs: 11.1, fiber: 2.1, defaultAmount: 35 },
  { name: "Aubergine", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 1, fat: 0.2, carbs: 3, fiber: 2.8, defaultAmount: 150 },
  { name: "Austernpilze", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 3.3, fat: 0.4, carbs: 3.3, fiber: 2.3, defaultAmount: 150 },
  { name: "Avocado", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 2, fat: 14.7, carbs: 8.5, fiber: 6.7, defaultAmount: 150 },
  { name: "Backpulver", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 0.1, fat: 0, carbs: 25, fiber: 0, defaultAmount: 16 },
  { name: "Banane", baseUnit: "100g", baseAmount: 100, calories: 89, protein: 1.1, fat: 0.3, carbs: 20.2, fiber: 2.6, defaultAmount: 120 },
  { name: "Beinscheibe (Rind)", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 20.5, fat: 9.2, carbs: 0, fiber: 0, defaultAmount: 250 },
  { name: "Bergkäse 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 395, protein: 27.5, fat: 32.5, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Bierschinken", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 15.5, fat: 11, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Bionade Holunder", baseUnit: "100ml", baseAmount: 100, calories: 23, protein: 0, fat: 0, carbs: 5.2, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Birne", baseUnit: "100g", baseAmount: 100, calories: 57, protein: 0.5, fat: 0.3, carbs: 12.4, fiber: 3.3, defaultAmount: 150 },
  { name: "Bitter Lemon", baseUnit: "100ml", baseAmount: 100, calories: 49, protein: 0, fat: 0, carbs: 11.8, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Blattspinat", baseUnit: "100g", baseAmount: 100, calories: 23, protein: 2.8, fat: 0.3, carbs: 0.5, fiber: 2.6, defaultAmount: 200 },
  { name: "Blumenkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 1.9, fat: 0.3, carbs: 2.3, fiber: 2.3, defaultAmount: 200 },
  { name: "Blutwurst", baseUnit: "100g", baseAmount: 100, calories: 378, protein: 14.6, fat: 34.5, carbs: 1.5, fiber: 0, defaultAmount: 80 },
  { name: "Bockwurst", baseUnit: "100g", baseAmount: 100, calories: 290, protein: 12, fat: 26, carbs: 1.2, fiber: 0, defaultAmount: 100 },
  { name: "Bratwurst (Geflügel)", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 16, fat: 17, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Bratwurst (Lamm)", baseUnit: "100g", baseAmount: 100, calories: 305, protein: 14, fat: 27, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Bratwurst (Rind)", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 15, fat: 24, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Bratwurst (Schwein)", baseUnit: "100g", baseAmount: 100, calories: 312, protein: 13.5, fat: 28.5, carbs: 0.5, fiber: 0, defaultAmount: 100 },
  { name: "Brie 50 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 334, protein: 20.5, fat: 28, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Brokkoli", baseUnit: "100g", baseAmount: 100, calories: 34, protein: 2.8, fat: 0.4, carbs: 2.7, fiber: 3, defaultAmount: 200 },
  { name: "Brombeeren", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1.4, fat: 0.5, carbs: 4.9, fiber: 5.3, defaultAmount: 125 },
  { name: "Burrata", baseUnit: "100g", baseAmount: 100, calories: 300, protein: 13, fat: 25, carbs: 2, fiber: 0, defaultAmount: 80 },
  { name: "Bulgur", baseUnit: "100g", baseAmount: 100, calories: 342, protein: 12.3, fat: 1.3, carbs: 63.4, fiber: 12.5, defaultAmount: 75 },
  { name: "Butter", baseUnit: "100g", baseAmount: 100, calories: 741, protein: 0.7, fat: 83.2, carbs: 0.6, fiber: 0, defaultAmount: 10 },
  { name: "Cabanossi", baseUnit: "100g", baseAmount: 100, calories: 448, protein: 19, fat: 41, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Camembert 30 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 22.5, fat: 16.2, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Camembert 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 299, protein: 20.5, fat: 24, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Camembert 60 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 332, protein: 19, fat: 28.5, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Cashewkerne", baseUnit: "100g", baseAmount: 100, calories: 553, protein: 18.2, fat: 43.8, carbs: 30.2, fiber: 3.3, defaultAmount: 30 },
  { name: "Cervelatwurst", baseUnit: "100g", baseAmount: 100, calories: 384, protein: 21, fat: 33, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Champignons", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 2.7, fat: 0.3, carbs: 0.6, fiber: 2.5 },
  { name: "Cheddar 50 %", baseUnit: "100g", baseAmount: 100, calories: 403, protein: 24.9, fat: 33.1, carbs: 1.3, fiber: 0, defaultAmount: 30 },
  { name: "Cherrytomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 0.9, fat: 0.2, carbs: 2.8, fiber: 1.2, defaultAmount: 100 },
  { name: "Chia-Samen", baseUnit: "100g", baseAmount: 100, calories: 486, protein: 16.5, fat: 30.7, carbs: 7.7, fiber: 34.4, defaultAmount: 15 },
  { name: "Chinakohl", baseUnit: "100g", baseAmount: 100, calories: 12, protein: 1.2, fat: 0.2, carbs: 1.2, fiber: 1.2 },
  { name: "Chorizo", baseUnit: "100g", baseAmount: 100, calories: 455, protein: 24.1, fat: 38.2, carbs: 1.9, fiber: 0, defaultAmount: 30 },
  { name: "Clementine", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 0.9, fat: 0.2, carbs: 10, fiber: 1.7, defaultAmount: 75 },
  { name: "Club Mate", baseUnit: "100ml", baseAmount: 100, calories: 20, protein: 0, fat: 0, carbs: 5, fiber: 0, defaultAmount: 500, liquidMl: 100 },
  { name: "Coca-Cola Classic", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10.6, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Coca-Cola Zero", baseUnit: "100ml", baseAmount: 100, calories: 0.2, protein: 0, fat: 0, carbs: 0, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Couscous", baseUnit: "100g", baseAmount: 100, calories: 353, protein: 11.7, fat: 1.3, carbs: 71.9, fiber: 5, defaultAmount: 60 },
  { name: "Dorade", baseUnit: "100g", baseAmount: 100, calories: 104, protein: 19.8, fat: 2.7, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Dr Pepper", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10.8, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Drachenfrucht", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 1.2, fat: 0.4, carbs: 11, fiber: 3, defaultAmount: 150 },
  { name: "Edamer 30 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 255, protein: 27, fat: 16.4, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Edamer 40 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 315, protein: 24.8, fat: 24.5, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Eier (XL)", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 12.6, fat: 11.2, carbs: 1.1, fiber: 0, defaultAmount: 60 },
  { name: "Eistee Pfirsich", baseUnit: "100ml", baseAmount: 100, calories: 33, protein: 0, fat: 0, carbs: 8, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Emmentaler 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 382, protein: 27, fat: 30.5, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Entenbrust (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 231, protein: 19, fat: 17, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Entenkeule (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 19, fat: 17, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Entrecôte (Rind)", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 21.5, fat: 16, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Erdbeeren", baseUnit: "100g", baseAmount: 100, calories: 32, protein: 0.8, fat: 0.4, carbs: 5.4, fiber: 2, defaultAmount: 150 },
  { name: "Erdnüsse", baseUnit: "100g", baseAmount: 100, calories: 567, protein: 25.8, fat: 49.2, carbs: 16.1, fiber: 8.5, defaultAmount: 30 },
  { name: "Erdnussöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 99.9, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Fanta", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 0, fat: 0, carbs: 9.1, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Fassbrause", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10.2, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Feige", baseUnit: "100g", baseAmount: 100, calories: 74, protein: 0.8, fat: 0.3, carbs: 19.2, fiber: 2.9, defaultAmount: 150 },
  { name: "Feldsalat", baseUnit: "100g", baseAmount: 100, calories: 14, protein: 2, fat: 0.4, carbs: 0.7, fiber: 1.5, defaultAmount: 150 },
  { name: "Fenchel", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1.2, fat: 0.2, carbs: 2.8, fiber: 3.1, defaultAmount: 150 },
  { name: "Feta 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 270, protein: 17, fat: 22, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Fleischwurst", baseUnit: "100g", baseAmount: 100, calories: 286, protein: 12.1, fat: 26.4, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Frankfurter Würstchen", baseUnit: "100g", baseAmount: 100, calories: 282, protein: 12.5, fat: 25, carbs: 1, fiber: 0, defaultAmount: 80 },
  { name: "Flussbarsch", baseUnit: "100g", baseAmount: 100, calories: 91, protein: 19.4, fat: 0.9, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Frischkäse 0,2 %", baseUnit: "100g", baseAmount: 100, calories: 63, protein: 11, fat: 0.2, carbs: 3.8, fiber: 0, defaultAmount: 30 },
  { name: "Frischkäse 20 %", baseUnit: "100g", baseAmount: 100, calories: 145, protein: 9, fat: 10, carbs: 3, fiber: 0 },
  { name: "Frischkäse 60 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 5.5, fat: 22.5, carbs: 3.2, fiber: 0, defaultAmount: 30 },
  { name: "Fritz-Kola", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 11, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Fritz-Limo (Zitrone/Orange)", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10.2, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Frühkartoffeln", baseUnit: "100g", baseAmount: 100, calories: 76, protein: 2, fat: 0.1, carbs: 15, fiber: 1.6, defaultAmount: 200 },
  { name: "Frühstücksfleisch", baseUnit: "100g", baseAmount: 100, calories: 265, protein: 14, fat: 22, carbs: 1, fiber: 0 },
  { name: "Garnele (Shrimps)", baseUnit: "100g", baseAmount: 100, calories: 92, protein: 18.6, fat: 1.4, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Gänsekeule", baseUnit: "100g", baseAmount: 100, calories: 310, protein: 18, fat: 26, carbs: 0, fiber: 0, defaultAmount: 250 },
  { name: "Gänsebrust (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 349, protein: 17.5, fat: 31, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Geflügelsalami", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 21, fat: 26, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Gelbwurst", baseUnit: "100g", baseAmount: 100, calories: 240, protein: 12, fat: 21, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Gemüsebrühe", baseUnit: "100ml", baseAmount: 100, calories: 4, protein: 0.2, fat: 0.1, carbs: 0.6, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Ginger Ale", baseUnit: "100ml", baseAmount: 100, calories: 34, protein: 0, fat: 0, carbs: 8.3, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Gemüsezwiebeln", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 1, fat: 0, carbs: 6, fiber: 2 },
  { name: "Gorgonzola 48 %", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 18.5, fat: 31, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Gouda 30 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 27.8, fat: 16.8, carbs: 0.3, fiber: 0, defaultAmount: 30 },
  { name: "Gouda 45% Fett i.Tr.", baseUnit: "100g", baseAmount: 100, calories: 356, protein: 23.1, fat: 30.8, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Granatapfel", baseUnit: "100g", baseAmount: 100, calories: 83, protein: 1.7, fat: 1.2, carbs: 18.7, fiber: 4, defaultAmount: 150 },
  { name: "Granatapfelsaft", baseUnit: "100ml", baseAmount: 100, calories: 54, protein: 0.2, fat: 0.1, carbs: 13.1, fiber: 0.1, defaultAmount: 200, liquidMl: 100 },
  { name: "Grapefruit", baseUnit: "100g", baseAmount: 100, calories: 42, protein: 0.8, fat: 0.1, carbs: 9.2, fiber: 1.6, defaultAmount: 200 },
  { name: "Griech. Joghurt (2%)", baseUnit: "100g", baseAmount: 100, calories: 58, protein: 8, fat: 1, carbs: 4, fiber: 0 },
  { name: "Grünkohl", baseUnit: "100g", baseAmount: 100, calories: 49, protein: 4.3, fat: 0.9, carbs: 9, fiber: 4, defaultAmount: 150 },
  { name: "Gruyère", baseUnit: "100g", baseAmount: 100, calories: 413, protein: 29.8, fat: 32.3, carbs: 0.4, fiber: 0, defaultAmount: 30 },
  { name: "Gurke", baseUnit: "100g", baseAmount: 100, calories: 12, protein: 0.6, fat: 0.2, carbs: 1.8, fiber: 0.5 },
  { name: "Brathähnchen (halbes)", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 19, fat: 16, carbs: 0, fiber: 0, defaultAmount: 400 },
  { name: "Hähnchenflügel", baseUnit: "100g", baseAmount: 100, calories: 222, protein: 18.3, fat: 16, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Hähnchenkeule (mit Haut)", baseUnit: "100g", baseAmount: 100, calories: 214, protein: 20.6, fat: 14.6, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Hähnchenschenkel (ohne Haut)", baseUnit: "100g", baseAmount: 100, calories: 140, protein: 21, fat: 6, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Halloumi 43% Fett i.Tr.", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 24, fat: 24, carbs: 2, fiber: 0, defaultAmount: 100 },
  { name: "Hanföl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Hanfsamen (geschält)", baseUnit: "100g", baseAmount: 100, calories: 595, protein: 31.6, fat: 48.7, carbs: 3.1, fiber: 4, defaultAmount: 30 },
  { name: "Hamburger Patty (Rind)", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 22, fat: 18, carbs: 0, fiber: 0, defaultAmount: 125 },
  { name: "Harzer Käse 0,5 %", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 30, fat: 0.5, carbs: 0.1, fiber: 0, defaultAmount: 100 },
  { name: "Haselnüsse", baseUnit: "100g", baseAmount: 100, calories: 644, protein: 15, fat: 61.6, carbs: 10.5, fiber: 8.2, defaultAmount: 30 },
  { name: "Heidelbeeren", baseUnit: "100g", baseAmount: 100, calories: 42, protein: 0.6, fat: 0.6, carbs: 7.4, fiber: 2.1, defaultAmount: 125 },
  { name: "Frische Hefe", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 11, fat: 1.5, carbs: 1, fiber: 6.2, defaultAmount: 42 },
  { name: "Heilbutt (weiß)", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 21, fat: 2.3, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Heringsfilet (Nixe)", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 18.2, fat: 16.1, carbs: 0.5, fiber: 0, defaultAmount: 200 },
  { name: "Hirschgulasch", baseUnit: "100g", baseAmount: 100, calories: 120, protein: 22, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Himbeeren", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 1.2, fat: 0.3, carbs: 4.8, fiber: 6.5, defaultAmount: 125 },
  { name: "Hirtenkäse 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 244, protein: 15.5, fat: 20, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Honig", baseUnit: "100g", baseAmount: 100, calories: 304, protein: 0.3, fat: 0, carbs: 82, fiber: 0.2, defaultAmount: 20 },
  { name: "Honigmelone", baseUnit: "100g", baseAmount: 100, calories: 36, protein: 0.5, fat: 0.1, carbs: 8.3, fiber: 1.2, defaultAmount: 150 },
  { name: "Hüttenkäse 0,8 %", baseUnit: "100g", baseAmount: 100, calories: 67, protein: 12.3, fat: 0.8, carbs: 2.6, fiber: 0, defaultAmount: 200 },
  { name: "Hüttenkäse 4 %", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 12, fat: 4, carbs: 3, fiber: 0 },
  { name: "Hüttenkäse Bio", baseUnit: "100g", baseAmount: 100, calories: 102, protein: 12.5, fat: 4.3, carbs: 3.3, fiber: 0, defaultAmount: 200 },
  { name: "Jagdwurst", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 14, fat: 19, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Joghurt 0,1 %", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 4, fat: 0, carbs: 5, fiber: 0 },
  { name: "Joghurt 1,5 % Fett", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 4.2, fat: 1.5, carbs: 5.2, fiber: 0, defaultAmount: 150 },
  { name: "Joghurt 3,5 % Fett", baseUnit: "100g", baseAmount: 100, calories: 65, protein: 3.8, fat: 3.5, carbs: 4.1, fiber: 0, defaultAmount: 150 },
  { name: "Johannisbeeren", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 1.1, fat: 0.2, carbs: 4.8, fiber: 3.5, defaultAmount: 125 },
  { name: "Kabeljau (Dorsch)", baseUnit: "100g", baseAmount: 100, calories: 82, protein: 17.8, fat: 0.7, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Kaffee mit Milch", baseUnit: "100ml", baseAmount: 100, calories: 12, protein: 0.8, fat: 0.5, carbs: 1.4, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Karottensaft", baseUnit: "100ml", baseAmount: 100, calories: 39, protein: 0.6, fat: 0.1, carbs: 8.8, fiber: 0.8, defaultAmount: 200, liquidMl: 100 },
  { name: "Kaffee (schwarz)", baseUnit: "100ml", baseAmount: 100, calories: 2, protein: 0, fat: 0, carbs: 0, fiber: 0, liquidMl: 100 },
  { name: "Kakao 100%", baseUnit: "100g", baseAmount: 100, calories: 360, protein: 20, fat: 20, carbs: 28, fiber: 33 },
  { name: "Kaki", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 0.6, fat: 0.2, carbs: 18.6, fiber: 3.6, defaultAmount: 150 },
  { name: "Kalbsbrust", baseUnit: "100g", baseAmount: 100, calories: 145, protein: 19, fat: 7.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Kalbsgulasch", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 21, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Kalbshaxe", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 20, fat: 8, carbs: 0, fiber: 0, defaultAmount: 300 },
  { name: "Kalbsleber", baseUnit: "100g", baseAmount: 100, calories: 130, protein: 19.2, fat: 3.1, carbs: 2.5, fiber: 0, defaultAmount: 150 },
  { name: "Kalbsleberwurst", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 13, fat: 28, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Kalbsrücken", baseUnit: "100g", baseAmount: 100, calories: 118, protein: 21.5, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Kalbsschnitzel", baseUnit: "100g", baseAmount: 100, calories: 106, protein: 22.5, fat: 1.8, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Kaninchenfleisch", baseUnit: "100g", baseAmount: 100, calories: 162, protein: 21, fat: 8.2, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Karotten", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 0.8, fat: 0.2, carbs: 6.8, fiber: 3, defaultAmount: 80 },
  { name: "Karpfen", baseUnit: "100g", baseAmount: 100, calories: 127, protein: 17.8, fat: 5.6, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Kartoffeln", baseUnit: "100g", baseAmount: 100, calories: 77, protein: 2, fat: 0.1, carbs: 17.5, fiber: 2.1, defaultAmount: 200 },
  { name: "Kasseler Lachs", baseUnit: "100g", baseAmount: 100, calories: 112, protein: 20, fat: 3.5, carbs: 0.5, fiber: 0, defaultAmount: 150 },
  { name: "Kasseler Nacken", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 17.5, fat: 9, carbs: 1, fiber: 0, defaultAmount: 150 },
  { name: "Kiwi", baseUnit: "100g", baseAmount: 100, calories: 61, protein: 1.1, fat: 0.5, carbs: 14.7, fiber: 3, defaultAmount: 70 },
  { name: "Kohlrabi", baseUnit: "100g", baseAmount: 100, calories: 27, protein: 2, fat: 0.1, carbs: 2.6, fiber: 1.4, defaultAmount: 150 },
  { name: "Kokosnusswasser", baseUnit: "100ml", baseAmount: 100, calories: 19, protein: 0.7, fat: 0.2, carbs: 3.7, fiber: 1.1, defaultAmount: 250, liquidMl: 100 },
  { name: "Kokosöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 99, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Krakauer", baseUnit: "100g", baseAmount: 100, calories: 287, protein: 14.5, fat: 25, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Kräuterseitlinge", baseUnit: "100g", baseAmount: 100, calories: 28, protein: 3.2, fat: 0.4, carbs: 1.2, fiber: 2.6, defaultAmount: 150 },
  { name: "Kürbiskerne", baseUnit: "100g", baseAmount: 100, calories: 566, protein: 29.8, fat: 45.8, carbs: 10.7, fiber: 6, defaultAmount: 25 },
  { name: "Kürbiskernöl", baseUnit: "100g", baseAmount: 100, calories: 828, protein: 0, fat: 92, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Lammfilet", baseUnit: "100g", baseAmount: 100, calories: 118, protein: 21.2, fat: 3.7, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Lammhack", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 17, fat: 20, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Lammhaxe", baseUnit: "100g", baseAmount: 100, calories: 195, protein: 19, fat: 13, carbs: 0, fiber: 0, defaultAmount: 300 },
  { name: "Lammkeule", baseUnit: "100g", baseAmount: 100, calories: 205, protein: 20.8, fat: 13.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Lammkarree", baseUnit: "100g", baseAmount: 100, calories: 225, protein: 20, fat: 16, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Lammkotelett", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 20.5, fat: 17, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Lammrücken", baseUnit: "100g", baseAmount: 100, calories: 202, protein: 21.1, fat: 13.1, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Lammschulter", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 19, fat: 16, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Landjäger", baseUnit: "100g", baseAmount: 100, calories: 476, protein: 23.5, fat: 42, carbs: 1, fiber: 0, defaultAmount: 40 },
  { name: "Lauchzwiebel", baseUnit: "100g", baseAmount: 100, calories: 32, protein: 1.8, fat: 0.2, carbs: 3.3, fiber: 2.6, defaultAmount: 15 },
  { name: "Leberkäse", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 14, fat: 24, carbs: 2, fiber: 0, defaultAmount: 120 },
  { name: "Leberwurst (fein)", baseUnit: "100g", baseAmount: 100, calories: 324, protein: 12, fat: 30, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Leerdammer 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 353, protein: 26.5, fat: 27.5, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Leinsamenöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Limette", baseUnit: "100g", baseAmount: 100, calories: 30, protein: 0.7, fat: 0.2, carbs: 10.5, fiber: 2.8, defaultAmount: 60 },
  { name: "Litschi", baseUnit: "100g", baseAmount: 100, calories: 66, protein: 0.8, fat: 0.4, carbs: 15.2, fiber: 1.3, defaultAmount: 150 },
  { name: "Lupinenschrot", baseUnit: "100g", baseAmount: 100, calories: 321, protein: 38, fat: 7.5, carbs: 12, fiber: 28, defaultAmount: 30 },
  { name: "Lyoner", baseUnit: "100g", baseAmount: 100, calories: 265, protein: 11, fat: 24, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Macadamianüsse", baseUnit: "100g", baseAmount: 100, calories: 718, protein: 7.9, fat: 75.8, carbs: 5.2, fiber: 8.6, defaultAmount: 30 },
  { name: "Magerquark 0,2 %", baseUnit: "100g", baseAmount: 100, calories: 68, protein: 12, fat: 0.2, carbs: 4, fiber: 0, defaultAmount: 250 },
  { name: "Makrele (frisch)", baseUnit: "100g", baseAmount: 100, calories: 205, protein: 18.6, fat: 13.9, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Malzbier", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0.4, fat: 0, carbs: 10.2, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Mandarine", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 0.7, fat: 0.3, carbs: 10.1, fiber: 1.7, defaultAmount: 70 },
  { name: "Mandeln", baseUnit: "100g", baseAmount: 100, calories: 589, protein: 24, fat: 52.5, carbs: 5.7, fiber: 13.5, defaultAmount: 30 },
  { name: "Manchego", baseUnit: "100g", baseAmount: 100, calories: 404, protein: 24, fat: 33, carbs: 1.3, fiber: 0, defaultAmount: 30 },
  { name: "Mango", baseUnit: "100g", baseAmount: 100, calories: 60, protein: 0.6, fat: 0.4, carbs: 13.4, fiber: 1.6, defaultAmount: 200 },
  { name: "Maracuja", baseUnit: "100g", baseAmount: 100, calories: 97, protein: 2.2, fat: 0.7, carbs: 23.4, fiber: 10.4, defaultAmount: 60 },
  { name: "Matjesfilet", baseUnit: "100g", baseAmount: 100, calories: 267, protein: 18.4, fat: 21.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Cantaloupe Melone", baseUnit: "100g", baseAmount: 100, calories: 34, protein: 0.8, fat: 0.2, carbs: 8.2, fiber: 0.9, defaultAmount: 150 },
  { name: "Mezzo Mix", baseUnit: "100ml", baseAmount: 100, calories: 43, protein: 0, fat: 0, carbs: 10.1, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Wassermelone", baseUnit: "100g", baseAmount: 100, calories: 30, protein: 0.6, fat: 0.2, carbs: 7.5, fiber: 0.4, defaultAmount: 200 },
  { name: "Merguez", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 17.5, fat: 27, carbs: 1.2, fiber: 0, defaultAmount: 100 },
  { name: "Mettwurst", baseUnit: "100g", baseAmount: 100, calories: 335, protein: 15.8, fat: 30.2, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Milch 0,1% Fett", baseUnit: "100ml", baseAmount: 100, calories: 35, protein: 3.4, fat: 0.1, carbs: 4.9, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Miesmuscheln", baseUnit: "100g", baseAmount: 100, calories: 82, protein: 13.3, fat: 1.8, carbs: 2.3, fiber: 0, defaultAmount: 250 },
  { name: "Mineralwasser", baseUnit: "100ml", baseAmount: 100, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Milch 1,5 % Fett", baseUnit: "100ml", baseAmount: 100, calories: 47, protein: 3.4, fat: 1.5, carbs: 4.8, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Milch 3,5 %", baseUnit: "100ml", baseAmount: 100, calories: 64, protein: 3.4, fat: 3.5, carbs: 4.8, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Milchkaffee", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 2.1, fat: 1.8, carbs: 3.6, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Mini Harzer", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 30, fat: 0.5, carbs: 0.1, fiber: 0, defaultAmount: 115 },
  { name: "Marmelade", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 0.4, fat: 0.1, carbs: 60, fiber: 1.2, defaultAmount: 20 },
  { name: "Mehl (Weizen)", baseUnit: "100g", baseAmount: 100, calories: 348, protein: 10.5, fat: 1, carbs: 72.3, fiber: 3.4 },
  { name: "Möhren", baseUnit: "100g", baseAmount: 100, calories: 33, protein: 0.9, fat: 0.2, carbs: 6.8, fiber: 3, defaultAmount: 80 },
  { name: "Monster Energy", baseUnit: "100ml", baseAmount: 100, calories: 47, protein: 0, fat: 0, carbs: 12, fiber: 0, defaultAmount: 500, liquidMl: 100 },
  { name: "Mortadella", baseUnit: "100g", baseAmount: 100, calories: 262, protein: 12, fat: 24, carbs: 1, fiber: 0, defaultAmount: 15 },
  { name: "Mountain Dew", baseUnit: "100ml", baseAmount: 100, calories: 48, protein: 0, fat: 0, carbs: 12.3, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Multivitaminsaft", baseUnit: "100ml", baseAmount: 100, calories: 46, protein: 0.4, fat: 0.1, carbs: 10.2, fiber: 0.1, defaultAmount: 200, liquidMl: 100 },
  { name: "Mozzarella 8,5 % Fett i. Tr. (light)", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 20.5, fat: 8.5, carbs: 1, fiber: 0, defaultAmount: 125 },
  { name: "Mozzarella 20 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 19, fat: 8.5, carbs: 1, fiber: 0, defaultAmount: 125 },
  { name: "Nektarine", baseUnit: "100g", baseAmount: 100, calories: 44, protein: 1, fat: 0, carbs: 11, fiber: 2 },
  { name: "Lachs (Norwegen)", baseUnit: "100g", baseAmount: 100, calories: 208, protein: 20, fat: 13, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Nudeln (Hartweizen, trocken)", baseUnit: "100g", baseAmount: 100, calories: 359, protein: 13, fat: 1.5, carbs: 71, fiber: 3, defaultAmount: 100 },
  { name: "Nürnberger Rostbratwurst", baseUnit: "100g", baseAmount: 100, calories: 312, protein: 14, fat: 28.5, carbs: 0.5, fiber: 0, defaultAmount: 25 },
  { name: "Olivenöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 99.8, carbs: 0, fiber: 0, defaultAmount: 15 },
  { name: "Orange", baseUnit: "100g", baseAmount: 100, calories: 47, protein: 1, fat: 0.2, carbs: 9.4, fiber: 2.4, defaultAmount: 150 },
  { name: "Orangensaft", baseUnit: "100ml", baseAmount: 100, calories: 45, protein: 0.7, fat: 0.2, carbs: 9, fiber: 0.2, defaultAmount: 200, liquidMl: 100 },
  { name: "Papaya", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 0.5, fat: 0.3, carbs: 10.8, fiber: 1.7, defaultAmount: 150 },
  { name: "Paprika (grün/gelb)", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1, fat: 0, carbs: 5, fiber: 4 },
  { name: "Paprika (rot)", baseUnit: "100g", baseAmount: 100, calories: 31, protein: 1, fat: 0.3, carbs: 6, fiber: 2.1, defaultAmount: 150 },
  { name: "Paprikalyoner", baseUnit: "100g", baseAmount: 100, calories: 265, protein: 11, fat: 24, carbs: 1.5, fiber: 0.5, defaultAmount: 20 },
  { name: "Paranüsse", baseUnit: "100g", baseAmount: 100, calories: 656, protein: 14.3, fat: 66.4, carbs: 3.6, fiber: 7.5, defaultAmount: 30 },
  { name: "Parmesan 32 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 392, protein: 33, fat: 28.4, carbs: 0, fiber: 0, defaultAmount: 30 },
  { name: "Pastinaken", baseUnit: "100g", baseAmount: 100, calories: 75, protein: 1.2, fat: 0.3, carbs: 12.1, fiber: 4.5, defaultAmount: 200 },
  { name: "Paulaner Spezi", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9.1, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Pekannüsse", baseUnit: "100g", baseAmount: 100, calories: 691, protein: 9.2, fat: 72, carbs: 13.9, fiber: 9.6, defaultAmount: 30 },
  { name: "Pepsi Cola", baseUnit: "100ml", baseAmount: 100, calories: 42, protein: 0, fat: 0, carbs: 10.7, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Pecorino Romano 32 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 387, protein: 31.8, fat: 26.9, carbs: 0, fiber: 0, defaultAmount: 25 },
  { name: "Pfirsich", baseUnit: "100g", baseAmount: 100, calories: 39, protein: 0.8, fat: 0.3, carbs: 8.3, fiber: 1.9, defaultAmount: 150 },
  { name: "Pflaume", baseUnit: "100g", baseAmount: 100, calories: 46, protein: 0.7, fat: 0.2, carbs: 10.2, fiber: 1.6, defaultAmount: 150 },
  { name: "Physalis", baseUnit: "100g", baseAmount: 100, calories: 71, protein: 2.3, fat: 0.7, carbs: 13.3, fiber: 0.8, defaultAmount: 100 },
  { name: "Pinienkerne", baseUnit: "100g", baseAmount: 100, calories: 673, protein: 13.7, fat: 68.4, carbs: 13.1, fiber: 3.7, defaultAmount: 30 },
  { name: "Pistazien", baseUnit: "100g", baseAmount: 100, calories: 562, protein: 20.2, fat: 45.3, carbs: 12.1, fiber: 10.6, defaultAmount: 30 },
  { name: "Presssack (rot)", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 16, fat: 18, carbs: 1, fiber: 0, defaultAmount: 100 },
  { name: "Proteinpulver", baseUnit: "100g", baseAmount: 100, calories: 370, protein: 80, fat: 3.5, carbs: 5.2, fiber: 0, defaultAmount: 30 },
  { name: "Putenbrust", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 23, fat: 1.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Putenfleisch", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 23.5, fat: 1.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Putenkeule", baseUnit: "100g", baseAmount: 100, calories: 160, protein: 20, fat: 8.5, carbs: 0, fiber: 0, defaultAmount: 250 },
  { name: "Putenoberkeule", baseUnit: "100g", baseAmount: 100, calories: 154, protein: 19.5, fat: 8.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Putenschnitzel", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 23, fat: 1.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Putensteak", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 23.4, fat: 1.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Speisequark 20% Fett i.Tr.", baseUnit: "100g", baseAmount: 100, calories: 109, protein: 12.3, fat: 5, carbs: 3.6, fiber: 0, defaultAmount: 250 },
  { name: "Quark 40 %", baseUnit: "100g", baseAmount: 100, calories: 150, protein: 9, fat: 11, carbs: 3, fiber: 0 },
  { name: "Quinoa (ungekocht)", baseUnit: "100g", baseAmount: 100, calories: 368, protein: 14.1, fat: 6.1, carbs: 64.2, fiber: 7, defaultAmount: 80 },
  { name: "Quitte", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 0.4, fat: 0.1, carbs: 7.3, fiber: 5.9, defaultAmount: 150 },
  { name: "Radieschen", baseUnit: "100g", baseAmount: 100, calories: 16, protein: 1.1, fat: 0.1, carbs: 2.1, fiber: 1.6 },
  { name: "Radler (alkoholfrei)", baseUnit: "100ml", baseAmount: 100, calories: 24, protein: 0.2, fat: 0, carbs: 5.2, fiber: 0, defaultAmount: 330, liquidMl: 100 },
  { name: "Rapsöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Red Bull", baseUnit: "100ml", baseAmount: 100, calories: 45, protein: 0, fat: 0, carbs: 11, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Regenbogen-Forelle", baseUnit: "100g", baseAmount: 100, calories: 120, protein: 20.3, fat: 4.3, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Reis (roh)", baseUnit: "100g", baseAmount: 100, calories: 350, protein: 7, fat: 0.6, carbs: 77, fiber: 1.4, defaultAmount: 100 },
  { name: "Rhabarber", baseUnit: "100g", baseAmount: 100, calories: 13, protein: 0.6, fat: 0.1, carbs: 1.4, fiber: 1.8, defaultAmount: 200 },
  { name: "Rotbarsch", baseUnit: "100g", baseAmount: 100, calories: 103, protein: 18.2, fat: 3.7, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Ricotta 13 %", baseUnit: "100g", baseAmount: 100, calories: 174, protein: 11, fat: 13, carbs: 3, fiber: 0, defaultAmount: 250 },
  { name: "Rehkeule", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 22, fat: 3, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rehrücken", baseUnit: "100g", baseAmount: 100, calories: 112, protein: 22.5, fat: 2.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rinderbraten", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 22, fat: 7.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rinderfilet", baseUnit: "100g", baseAmount: 100, calories: 121, protein: 21.2, fat: 4, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rindergulasch", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 21.8, fat: 7.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rinderhackfleisch", baseUnit: "100g", baseAmount: 100, calories: 232, protein: 20.2, fat: 16.8, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Rinderhüfte", baseUnit: "100g", baseAmount: 100, calories: 120, protein: 22.1, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rinderroulade", baseUnit: "100g", baseAmount: 100, calories: 130, protein: 22, fat: 5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Rindersalami", baseUnit: "100g", baseAmount: 100, calories: 380, protein: 20, fat: 33, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Rinderschnitzel", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 22, fat: 3, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Roastbeef", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 23.5, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Sauerbraten (Rind)", baseUnit: "100g", baseAmount: 100, calories: 155, protein: 22, fat: 7, carbs: 1, fiber: 0, defaultAmount: 200 },
  { name: "Romanasalat", baseUnit: "100g", baseAmount: 100, calories: 16, protein: 1.2, fat: 0.2, carbs: 1.7, fiber: 1.7 },
  { name: "Rosenkohl", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 3.8, fat: 0.3, carbs: 3.3, fiber: 4.4, defaultAmount: 150 },
  { name: "Rote Bete (Glas)", baseUnit: "100g", baseAmount: 100, calories: 38, protein: 0.9, fat: 0.1, carbs: 8.3, fiber: 2.1, defaultAmount: 150 },
  { name: "Rote Bete (vorgegart)", baseUnit: "100g", baseAmount: 100, calories: 43, protein: 1.6, fat: 0.2, carbs: 9.6, fiber: 2.8, defaultAmount: 150 },
  { name: "Rotkohl", baseUnit: "100g", baseAmount: 100, calories: 22, protein: 1.5, fat: 0.2, carbs: 3.5, fiber: 2.5, defaultAmount: 200 },
  { name: "Salami", baseUnit: "100g", baseAmount: 100, calories: 380, protein: 20, fat: 33, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Sanddornbeeren", baseUnit: "100g", baseAmount: 100, calories: 52, protein: 0.7, fat: 3, carbs: 3.3, fiber: 2.3, defaultAmount: 100 },
  { name: "Sardinen (abgetropft)", baseUnit: "100g", baseAmount: 100, calories: 208, protein: 24.6, fat: 11.5, carbs: 0, fiber: 0, defaultAmount: 125 },
  { name: "Sauerkirschen", baseUnit: "100g", baseAmount: 100, calories: 50, protein: 0.9, fat: 0.5, carbs: 10.2, fiber: 1.2, defaultAmount: 125 },
  { name: "Sauerkraut", baseUnit: "100g", baseAmount: 100, calories: 19, protein: 1.1, fat: 0.2, carbs: 1.2, fiber: 2.1, defaultAmount: 200 },
  { name: "Schafskäse 45 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 17, fat: 23, carbs: 0.5, fiber: 0, defaultAmount: 30 },
  { name: "Schokolade Dunkel (70%)", baseUnit: "100g", baseAmount: 100, calories: 598, protein: 7.8, fat: 43, carbs: 34, fiber: 11, defaultAmount: 25 },
  { name: "Schokolade Dunkel (85%)", baseUnit: "100g", baseAmount: 100, calories: 598, protein: 9, fat: 50, carbs: 19, fiber: 12, defaultAmount: 20 },
  { name: "Schokolade Dunkel (100%)", baseUnit: "100g", baseAmount: 100, calories: 601, protein: 13, fat: 54, carbs: 8, fiber: 15, defaultAmount: 20 },
  { name: "Schokolade Erdbeer-Joghurt", baseUnit: "100g", baseAmount: 100, calories: 561, protein: 6.5, fat: 36, carbs: 51, fiber: 1.4, defaultAmount: 20 },
  { name: "Schokolade Haselnuss", baseUnit: "100g", baseAmount: 100, calories: 560, protein: 8, fat: 37, carbs: 47, fiber: 4 },
  { name: "Schokolade Keks & Crunch", baseUnit: "100g", baseAmount: 100, calories: 548, protein: 5.6, fat: 33, carbs: 56, fiber: 2.4, defaultAmount: 20 },
  { name: "Schokolade Mandelsplitter", baseUnit: "100g", baseAmount: 100, calories: 560, protein: 9.2, fat: 36.2, carbs: 46.5, fiber: 6.8, defaultAmount: 25 },
  { name: "Schokolade Marzipan", baseUnit: "100g", baseAmount: 100, calories: 493, protein: 6.7, fat: 28, carbs: 51, fiber: 4.5, defaultAmount: 100 },
  { name: "Schokolade Noisette", baseUnit: "100g", baseAmount: 100, calories: 560, protein: 6.5, fat: 36, carbs: 51, fiber: 3.5, defaultAmount: 25 },
  { name: "Nougat-Schokolade", baseUnit: "100g", baseAmount: 100, calories: 548, protein: 5.5, fat: 33.7, carbs: 54.1, fiber: 3.2, defaultAmount: 25 },
  { name: "Vollmilchschokolade", baseUnit: "100g", baseAmount: 100, calories: 535, protein: 7.4, fat: 31, carbs: 54.1, fiber: 1.2, defaultAmount: 100 },
  { name: "Schokolade Weiß", baseUnit: "100g", baseAmount: 100, calories: 540, protein: 6, fat: 32, carbs: 58, fiber: 0 },
  { name: "Scholle", baseUnit: "100g", baseAmount: 100, calories: 86, protein: 17.1, fat: 1.9, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schwarzwälder Schinken", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 29.4, fat: 12.5, carbs: 1, fiber: 0, defaultAmount: 20 },
  { name: "Schweinebauch", baseUnit: "100g", baseAmount: 100, calories: 284, protein: 17, fat: 24, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schweinebraten", baseUnit: "100g", baseAmount: 100, calories: 200, protein: 22, fat: 12, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Schweinefilet", baseUnit: "100g", baseAmount: 100, calories: 106, protein: 21.8, fat: 2.1, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schweinegeschnetzeltes", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 21, fat: 3.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schweinegulasch", baseUnit: "100g", baseAmount: 100, calories: 125, protein: 19, fat: 5.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Schweinehackfleisch", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 18, fat: 16, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schweinehaxe", baseUnit: "100g", baseAmount: 100, calories: 240, protein: 20, fat: 18, carbs: 0, fiber: 0, defaultAmount: 350 },
  { name: "Schweinekotelett", baseUnit: "100g", baseAmount: 100, calories: 231, protein: 25.5, fat: 14.3, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Schweinelende", baseUnit: "100g", baseAmount: 100, calories: 110, protein: 22, fat: 2.5, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Schweinenacken", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 20.5, fat: 16.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Schweineschnitzel (Oberschale)", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 22, fat: 1.9, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Seelachs", baseUnit: "100g", baseAmount: 100, calories: 81, protein: 18.3, fat: 0.6, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Staudensellerie", baseUnit: "100g", baseAmount: 100, calories: 15, protein: 0.7, fat: 0.2, carbs: 2.2, fiber: 1.6, defaultAmount: 150 },
  { name: "Senf", baseUnit: "100g", baseAmount: 100, calories: 100, protein: 5.9, fat: 6.4, carbs: 5.2, fiber: 3.2, defaultAmount: 15 },
  { name: "Serrano Schinken", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 32, fat: 11, carbs: 0.5, fiber: 0, defaultAmount: 20 },
  { name: "Sesamöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Sonnenblumenkerne", baseUnit: "100g", baseAmount: 100, calories: 584, protein: 22.5, fat: 49.6, carbs: 11.4, fiber: 8.6, defaultAmount: 30 },
  { name: "Sonnenblumenöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Spezi", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9.1, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Spitzkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 2, fat: 0, carbs: 3, fiber: 3 },
  { name: "Sprite", baseUnit: "100ml", baseAmount: 100, calories: 37, protein: 0, fat: 0, carbs: 9.1, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Stachelbeeren (frisch)", baseUnit: "100g", baseAmount: 100, calories: 44, protein: 0.8, fat: 0.2, carbs: 8.5, fiber: 3, defaultAmount: 125 },
  { name: "Sucuk", baseUnit: "100g", baseAmount: 100, calories: 330, protein: 14, fat: 30, carbs: 1, fiber: 0, defaultAmount: 50 },
  { name: "Suppengrün", baseUnit: "100g", baseAmount: 100, calories: 28, protein: 1.4, fat: 0.3, carbs: 3.8, fiber: 3.2, defaultAmount: 250 },
  { name: "Suppenhuhn", baseUnit: "100g", baseAmount: 100, calories: 200, protein: 18, fat: 14, carbs: 0, fiber: 0, defaultAmount: 250 },
  { name: "Süßkartoffel", baseUnit: "100g", baseAmount: 100, calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1, fiber: 3, defaultAmount: 200 },
  { name: "Süßkirschen", baseUnit: "100g", baseAmount: 100, calories: 63, protein: 0.9, fat: 0.3, carbs: 13.3, fiber: 1.9, defaultAmount: 150 },
  
  { name: "Teewurst", baseUnit: "100g", baseAmount: 100, calories: 393, protein: 12, fat: 38, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Thunfisch (Dose in eigenem Saft)", baseUnit: "100g", baseAmount: 100, calories: 116, protein: 27.2, fat: 0.8, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Thunfisch (frisch)", baseUnit: "100g", baseAmount: 100, calories: 108, protein: 23.3, fat: 0.9, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Tilsiter 30 % Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 31, fat: 15, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Tilsiter 45% Fett i. Tr.", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 25, fat: 26, carbs: 0.1, fiber: 0, defaultAmount: 30 },
  { name: "Tintenfisch (Calamari)", baseUnit: "100g", baseAmount: 100, calories: 92, protein: 15.6, fat: 1.4, carbs: 3.1, fiber: 0, defaultAmount: 150 },
  { name: "TK-Heidelbeeren (ungesüßt)", baseUnit: "100g", baseAmount: 100, calories: 42, protein: 0.6, fat: 0.6, carbs: 7.4, fiber: 4.9, defaultAmount: 125 },
  { name: "Tomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 1, fat: 0.2, carbs: 2.6, fiber: 1.2, defaultAmount: 80 },
  { name: "Tomatensaft", baseUnit: "100ml", baseAmount: 100, calories: 17, protein: 0.8, fat: 0.1, carbs: 2.9, fiber: 0.6, defaultAmount: 200, liquidMl: 100 },
  { name: "Tonic Water", baseUnit: "100ml", baseAmount: 100, calories: 38, protein: 0, fat: 0, carbs: 9, fiber: 0, defaultAmount: 200, liquidMl: 100 },
  { name: "Traubenkernöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Traubensaft", baseUnit: "100ml", baseAmount: 100, calories: 68, protein: 0.2, fat: 0.1, carbs: 16.1, fiber: 0.1, defaultAmount: 200, liquidMl: 100 },
  { name: "Vollkornbrot", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 8.1, fat: 2.1, carbs: 38.5, fiber: 8.3, defaultAmount: 45 },
  { name: "Vollkornmehl", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 13.2, fat: 2.3, carbs: 61.2, fiber: 10.7 },
  { name: "Vollkornnudeln", baseUnit: "100g", baseAmount: 100, calories: 340, protein: 13, fat: 3, carbs: 63, fiber: 10 },
  { name: "Walnüsse", baseUnit: "100g", baseAmount: 100, calories: 654, protein: 15.2, fat: 65.2, carbs: 7, fiber: 6.7, defaultAmount: 30 },
  { name: "Walnussöl", baseUnit: "100g", baseAmount: 100, calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, defaultAmount: 10 },
  { name: "Wasser", baseUnit: "100ml", baseAmount: 100, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, defaultAmount: 250, liquidMl: 100 },
  { name: "Weintrauben", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 0.7, fat: 0.3, carbs: 16.4, fiber: 1.5, defaultAmount: 125 },
  { name: "Weintrauben rot", baseUnit: "100g", baseAmount: 100, calories: 70, protein: 0.7, fat: 0.3, carbs: 15.5, fiber: 1.5, defaultAmount: 125 },
  { name: "Weiße Bohnen (Dose)", baseUnit: "100g", baseAmount: 100, calories: 105, protein: 7.4, fat: 0.6, carbs: 14.3, fiber: 6.2, defaultAmount: 240 },
  { name: "Weißkohl", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 1.3, fat: 0.2, carbs: 3.1, fiber: 2.5, defaultAmount: 200 },
  { name: "Wels", baseUnit: "100g", baseAmount: 100, calories: 164, protein: 16.4, fat: 11, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Weißwurst", baseUnit: "100g", baseAmount: 100, calories: 264, protein: 13, fat: 23, carbs: 1, fiber: 0, defaultAmount: 60 },
  { name: "Wiener Würstchen", baseUnit: "100g", baseAmount: 100, calories: 286, protein: 12, fat: 26, carbs: 1, fiber: 0, defaultAmount: 50 },
  { name: "Wildschweingulasch", baseUnit: "100g", baseAmount: 100, calories: 130, protein: 22, fat: 4.5, carbs: 0, fiber: 0, defaultAmount: 200 },
  { name: "Wirsing", baseUnit: "100g", baseAmount: 100, calories: 27, protein: 2.4, fat: 0.4, carbs: 2.4, fiber: 2.3, defaultAmount: 200 },
  { name: "Ziegenkäse (45% Fett i. Tr.)", baseUnit: "100g", baseAmount: 100, calories: 320, protein: 20, fat: 24, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Zitrone", baseUnit: "100g", baseAmount: 100, calories: 29, protein: 1.1, fat: 0.3, carbs: 9.3, fiber: 2.8, defaultAmount: 50 },
  { name: "Zitronensaft", baseUnit: "100ml", baseAmount: 100, calories: 26, protein: 0.4, fat: 0.1, carbs: 3.2, fiber: 0.4, defaultAmount: 10, liquidMl: 100 },
  { name: "Zucchini", baseUnit: "100g", baseAmount: 100, calories: 17, protein: 1.2, fat: 0.3, carbs: 2, fiber: 1.1, defaultAmount: 200 },
  { name: "Zucker", baseUnit: "100g", baseAmount: 100, calories: 400, protein: 0, fat: 0, carbs: 100, fiber: 0, defaultAmount: 5 },
  { name: "Zwetschge", baseUnit: "100g", baseAmount: 100, calories: 46, protein: 0.7, fat: 0.2, carbs: 10.2, fiber: 1.7, defaultAmount: 150 },
  { name: "Zwiebelmettwurst", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 15, fat: 19, carbs: 1, fiber: 0, defaultAmount: 30 },
  { name: "Zander", baseUnit: "100g", baseAmount: 100, calories: 91, protein: 19.2, fat: 0.7, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Zwiebeln", baseUnit: "100g", baseAmount: 100, calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3, fiber: 1.7, defaultAmount: 70 },
  { name: "Gekochter Schinken", baseUnit: "100g", baseAmount: 100, calories: 107, protein: 19, fat: 3, carbs: 1, fiber: 0, defaultAmount: 30 },
  // New items from updated list
  { name: "Basmati Reis", baseUnit: "100g", baseAmount: 100, calories: 351, protein: 8.5, fat: 0.6, carbs: 77, fiber: 1.3, defaultAmount: 100 },
  { name: "Rucola", baseUnit: "100g", baseAmount: 100, calories: 25, protein: 2.6, fat: 0.7, carbs: 2.1, fiber: 1.6, defaultAmount: 30 },
  { name: "Oliven (schwarz)", baseUnit: "100g", baseAmount: 100, calories: 115, protein: 0.8, fat: 10.7, carbs: 6.3, fiber: 3.2, defaultAmount: 30 },
  { name: "Getrocknete Tomaten", baseUnit: "100g", baseAmount: 100, calories: 213, protein: 14.1, fat: 3, carbs: 23.1, fiber: 12.3, defaultAmount: 20 },
  { name: "Kirschtomaten", baseUnit: "100g", baseAmount: 100, calories: 18, protein: 0.9, fat: 0.2, carbs: 2.6, fiber: 1.2, defaultAmount: 150 },
  { name: "Lachsfilet", baseUnit: "100g", baseAmount: 100, calories: 208, protein: 20, fat: 13, carbs: 0, fiber: 0, defaultAmount: 150 },
  { name: "Paprika gelb", baseUnit: "100g", baseAmount: 100, calories: 30, protein: 1, fat: 0.2, carbs: 6, fiber: 1.1, defaultAmount: 150 },
  // --- Fertiggerichte ---
  { name: "Tiefkühlpizza Margherita", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 9, fat: 9, carbs: 28, fiber: 1.5, defaultAmount: 350, category: "Fertiggerichte" },
  { name: "Tiefkühlpizza Salami", baseUnit: "100g", baseAmount: 100, calories: 260, protein: 10, fat: 12, carbs: 27, fiber: 1.5, defaultAmount: 350, category: "Fertiggerichte" },
  { name: "Tiefkühlpizza Thunfisch", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 11, fat: 8, carbs: 28, fiber: 1.5, defaultAmount: 350, category: "Fertiggerichte" },
  { name: "Lasagne (Fertiggericht)", baseUnit: "100g", baseAmount: 100, calories: 140, protein: 7, fat: 6, carbs: 14, fiber: 1, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Chicken Nuggets TK", baseUnit: "100g", baseAmount: 100, calories: 240, protein: 14, fat: 14, carbs: 16, fiber: 1, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Fischstäbchen TK", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 12, fat: 11, carbs: 18, fiber: 0.5, defaultAmount: 225, category: "Fertiggerichte" },
  { name: "Pommes frites TK", baseUnit: "100g", baseAmount: 100, calories: 150, protein: 2, fat: 5, carbs: 24, fiber: 2, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Ravioli (Dose)", baseUnit: "100g", baseAmount: 100, calories: 92, protein: 3.5, fat: 3, carbs: 12, fiber: 1, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Currywurst mit Soße", baseUnit: "100g", baseAmount: 100, calories: 195, protein: 10, fat: 13, carbs: 9, fiber: 0.5, defaultAmount: 250, category: "Fertiggerichte" },
  { name: "Frühlingsrollen TK", baseUnit: "100g", baseAmount: 100, calories: 195, protein: 5, fat: 9, carbs: 23, fiber: 1.5, defaultAmount: 150, category: "Fertiggerichte" },
  { name: "Schnitzel paniert TK", baseUnit: "100g", baseAmount: 100, calories: 220, protein: 14, fat: 12, carbs: 14, fiber: 0.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Tortellini (Kühlregal)", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 10, fat: 8, carbs: 34, fiber: 1.5, defaultAmount: 250, category: "Fertiggerichte" },
  { name: "Maultaschen", baseUnit: "100g", baseAmount: 100, calories: 195, protein: 9, fat: 8, carbs: 22, fiber: 1, defaultAmount: 300, category: "Fertiggerichte" },
  { name: "Flammkuchen TK", baseUnit: "100g", baseAmount: 100, calories: 245, protein: 8, fat: 12, carbs: 26, fiber: 1, defaultAmount: 275, category: "Fertiggerichte" },
  { name: "Gyoza TK", baseUnit: "100g", baseAmount: 100, calories: 185, protein: 7, fat: 6, carbs: 26, fiber: 1, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Döner Kebab", baseUnit: "100g", baseAmount: 100, calories: 215, protein: 13, fat: 12, carbs: 15, fiber: 1, defaultAmount: 350, category: "Fertiggerichte" },
  { name: "Hamburger (Fertiggericht)", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 13, fat: 13, carbs: 22, fiber: 1, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Cheeseburger (Fertiggericht)", baseUnit: "100g", baseAmount: 100, calories: 265, protein: 14, fat: 14, carbs: 22, fiber: 1, defaultAmount: 220, category: "Fertiggerichte" },
  { name: "Asia-Pfanne TK", baseUnit: "100g", baseAmount: 100, calories: 85, protein: 3, fat: 2, carbs: 13, fiber: 2, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Bami Goreng TK", baseUnit: "100g", baseAmount: 100, calories: 135, protein: 5, fat: 5, carbs: 18, fiber: 1.5, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Nasi Goreng TK", baseUnit: "100g", baseAmount: 100, calories: 140, protein: 4, fat: 5, carbs: 20, fiber: 1.5, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Tiefkühlpizza Hawaii", baseUnit: "100g", baseAmount: 100, calories: 225, protein: 9, fat: 8, carbs: 28, fiber: 1.5, defaultAmount: 350, category: "Fertiggerichte" },
  { name: "Cordon Bleu TK", baseUnit: "100g", baseAmount: 100, calories: 235, protein: 16, fat: 13, carbs: 14, fiber: 0.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Kartoffelpuffer TK", baseUnit: "100g", baseAmount: 100, calories: 180, protein: 2.5, fat: 9, carbs: 22, fiber: 1.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Kroketten TK", baseUnit: "100g", baseAmount: 100, calories: 210, protein: 3, fat: 10, carbs: 27, fiber: 1.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Cevapcici TK", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 15, fat: 17, carbs: 3, fiber: 0.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Bratwurst (Fertigpackung)", baseUnit: "100g", baseAmount: 100, calories: 280, protein: 12, fat: 25, carbs: 1, fiber: 0, defaultAmount: 150, category: "Fertiggerichte" },
  { name: "Gulaschsuppe (Dose)", baseUnit: "100g", baseAmount: 100, calories: 55, protein: 3.5, fat: 2, carbs: 5, fiber: 0.5, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Erbsensuppe (Dose)", baseUnit: "100g", baseAmount: 100, calories: 65, protein: 4, fat: 1.5, carbs: 9, fiber: 2, defaultAmount: 400, category: "Fertiggerichte" },
  { name: "Wrap Hähnchen", baseUnit: "100g", baseAmount: 100, calories: 195, protein: 11, fat: 8, carbs: 20, fiber: 1.5, defaultAmount: 250, category: "Fertiggerichte" },
  { name: "Burrito Bohnen & Reis", baseUnit: "100g", baseAmount: 100, calories: 170, protein: 6, fat: 5, carbs: 25, fiber: 3, defaultAmount: 300, category: "Fertiggerichte" },
  { name: "Hot Dog", baseUnit: "100g", baseAmount: 100, calories: 250, protein: 10, fat: 15, carbs: 19, fiber: 1, defaultAmount: 150, category: "Fertiggerichte" },
  { name: "Chicken Wings TK", baseUnit: "100g", baseAmount: 100, calories: 210, protein: 17, fat: 14, carbs: 5, fiber: 0, defaultAmount: 250, category: "Fertiggerichte" },
  { name: "Potato Wedges TK", baseUnit: "100g", baseAmount: 100, calories: 165, protein: 2.5, fat: 6, carbs: 25, fiber: 2.5, defaultAmount: 250, category: "Fertiggerichte" },
  { name: "Taquitos TK", baseUnit: "100g", baseAmount: 100, calories: 230, protein: 8, fat: 11, carbs: 25, fiber: 1.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Backfisch TK", baseUnit: "100g", baseAmount: 100, calories: 200, protein: 11, fat: 10, carbs: 16, fiber: 0.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Rösti TK", baseUnit: "100g", baseAmount: 100, calories: 170, protein: 2, fat: 8, carbs: 22, fiber: 2, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Mini-Frikadellen TK", baseUnit: "100g", baseAmount: 100, calories: 215, protein: 13, fat: 14, carbs: 10, fiber: 0.5, defaultAmount: 200, category: "Fertiggerichte" },
  { name: "Cannelloni (Fertiggericht)", baseUnit: "100g", baseAmount: 100, calories: 130, protein: 6, fat: 5, carbs: 14, fiber: 1, defaultAmount: 400, category: "Fertiggerichte" },
];

const LEGACY_FOOD_RENAMES: Record<string, string> = {
  "Bratwurst Geflügel": "Bratwurst (Geflügel)",
  "Bratwurst Lamm": "Bratwurst (Lamm)",
  "Bratwurst Rind": "Bratwurst (Rind)",
  "Bratwurst Schwein": "Bratwurst (Schwein)",
  "Appenzeller 50 %": "Appenzeller 50 % i. Tr.",
};

const REMOVED_FOOD_NAMES = new Set([
  "tafelspitz (rind)",
  "rinderbrust (tafelspitz)",
]);

function loadFoodDatabase(): FoodItem[] {

  try {
    const raw = localStorage.getItem(FOOD_DB_KEY);
    const deletedFoods = loadDeletedFoods();

    if (!raw) {
      // First run: filter out any previously deleted items
      const initial = DEFAULT_FOODS
        .filter(f => !deletedFoods.has(f.name.toLowerCase()))
        .map(f => ({ ...f, category: f.category || FOOD_CATEGORY_MAP[f.name] }));
      localStorage.setItem(FOOD_DB_KEY, JSON.stringify(initial));
      return [...initial];
    }
    const stored: FoodItem[] = JSON.parse(raw);

    // Build a map of stored items by name (lowercase)
    const storedMap = new Map(stored.map((f) => [f.name.toLowerCase(), f]));

    let changed = false;

    // Migrate legacy names (rename + merge)
    for (const [legacyName, newName] of Object.entries(LEGACY_FOOD_RENAMES)) {
      const legacyKey = legacyName.toLowerCase();
      const newKey = newName.toLowerCase();
      const legacyItem = storedMap.get(legacyKey);
      if (!legacyItem) continue;

      if (!storedMap.has(newKey)) {
        storedMap.set(newKey, {
          ...legacyItem,
          name: newName,
          category: legacyItem.category || FOOD_CATEGORY_MAP[newName],
        });
      }

      storedMap.delete(legacyKey);
      changed = true;
    }

    // Remove deprecated defaults that should no longer appear
    for (const removedName of REMOVED_FOOD_NAMES) {
      if (storedMap.has(removedName)) {
        storedMap.delete(removedName);
        changed = true;
      }
    }

    // For each DEFAULT_FOOD:
    // - if deleted by user → skip entirely
    // - if not in stored → add it
    // - if in stored but NOT user-created → overwrite with updated DEFAULT values
    for (const def of DEFAULT_FOODS) {
      const key = def.name.toLowerCase();
      if (deletedFoods.has(key)) {
        // User explicitly deleted this → remove if still present
        if (storedMap.has(key)) {
          storedMap.delete(key);
          changed = true;
        }
        continue;
      }
      const existing = storedMap.get(key);
      if (!existing) {
        storedMap.set(key, { ...def, category: def.category || FOOD_CATEGORY_MAP[def.name] });
        changed = true;
      } else if (!existing.isUserCreated) {
        const updated: FoodItem = {
          ...def,
          category: def.category || FOOD_CATEGORY_MAP[def.name] || existing.category,
          ...(existing.defaultAmount !== undefined ? { defaultAmount: existing.defaultAmount } : {}),
          isUserCreated: false,
        };
        storedMap.set(key, updated);
        changed = true;
      }
    }

    // Migrate: apply categories to items that don't have one yet
    for (const [key, item] of storedMap) {
      if (!item.category && FOOD_CATEGORY_MAP[item.name]) {
        item.category = FOOD_CATEGORY_MAP[item.name];
        changed = true;
      }
    }

    const merged = Array.from(storedMap.values());
    if (changed) {
      localStorage.setItem(FOOD_DB_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {}
  return [...DEFAULT_FOODS];
}

export function saveFoodDatabase(items: FoodItem[]): void {
  localStorage.setItem(FOOD_DB_KEY, JSON.stringify(items));
}

export const foodDatabase: FoodItem[] = loadFoodDatabase();

/**
 * Normalize a food name for fuzzy comparison:
 * strips parenthetical qualifiers, common suffixes, and extra whitespace.
 */
function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")           // remove (roh), (ungekocht), etc.
    .replace(/\b(roh|ungekocht|trocken|gekocht|gegart|frisch|tiefgefroren|bio)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if an existing food item is essentially the same as a new one.
 * Matches on: normalized name similarity + calorie proximity (±15%).
 */
function findSimilarFood(item: FoodItem): FoodItem | undefined {
  const normalizedNew = normalizeFoodName(item.name);
  if (!normalizedNew) return undefined;

  // Normalize calories to per-100 basis for fair comparison
  const newCalPer100 = item.baseAmount > 0 ? (item.calories / item.baseAmount) * 100 : item.calories;

  for (const existing of foodDatabase) {
    const normalizedExisting = normalizeFoodName(existing.name);

    // Check name similarity: one contains the other, or they're identical after normalization
    const nameMatch =
      normalizedNew === normalizedExisting ||
      normalizedExisting.includes(normalizedNew) ||
      normalizedNew.includes(normalizedExisting);

    if (!nameMatch) continue;

    // Compare calories (per 100 basis) – within 15% tolerance
    const existCalPer100 = existing.baseAmount > 0 ? (existing.calories / existing.baseAmount) * 100 : existing.calories;
    if (existCalPer100 === 0 && newCalPer100 === 0) return existing;
    const maxCal = Math.max(existCalPer100, newCalPer100);
    if (maxCal > 0 && Math.abs(existCalPer100 - newCalPer100) / maxCal <= 0.15) {
      return existing;
    }
  }
  return undefined;
}

export function addFoodItem(item: FoodItem): void {
  // Exact name match → skip
  if (foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
    return;
  }
  // Fuzzy duplicate detection → skip if a similar food already exists
  const similar = findSimilarFood(item);
  if (similar) {
    return;
  }
  // If user adds an item back, remove from deleted blacklist
  unmarkFoodDeleted(item.name);
  foodDatabase.push(item);
  saveFoodDatabase(foodDatabase);
}

export function removeFoodItem(name: string): void {
  const index = foodDatabase.findIndex((f) => f.name === name);
  if (index >= 0) {
    // Track deletion so DEFAULT_FOODS and remote sync don't re-add it
    markFoodDeleted(name);
    foodDatabase.splice(index, 1);
    saveFoodDatabase(foodDatabase);
  }
}

/** Clear entire food list – marks ALL items (defaults + remote + current) as deleted */
export function clearFoodDatabase(): number {
  const deleted = loadDeletedFoods();
  // Mark every default food as deleted
  for (const def of DEFAULT_FOODS) {
    deleted.add(def.name.toLowerCase());
  }
  // Mark every currently loaded food as deleted (includes remote items)
  for (const item of foodDatabase) {
    deleted.add(item.name.toLowerCase());
  }
  saveDeletedFoods(deleted);
  // Clear remote sync cache so remote items won't re-appear
  localStorage.removeItem("mampflogger-remote-sync");

  const count = foodDatabase.length;
  foodDatabase.splice(0, foodDatabase.length);
  saveFoodDatabase(foodDatabase);
  return count;
}

/** Reset to factory defaults: clear DB, blacklist, sync cache, reload defaults */
export function resetFoodDatabase(): void {
  localStorage.removeItem(FOOD_DB_KEY);
  localStorage.removeItem(DELETED_FOODS_KEY);
  localStorage.removeItem("mampflogger-remote-sync");
  foodDatabase.splice(0, foodDatabase.length);
  const defaults = loadFoodDatabase();
  foodDatabase.push(...defaults);
}

export function updateFoodItem(originalName: string, updated: FoodItem): void {
  const index = foodDatabase.findIndex((f) => f.name === originalName);
  if (index >= 0) {
    foodDatabase[index] = updated;
  } else {
    foodDatabase.push(updated);
  }
  saveFoodDatabase(foodDatabase);
}

export function reloadFoodDatabase(): void {
  try {
    const data = localStorage.getItem(FOOD_DB_KEY);
    if (data) {
      const items: FoodItem[] = JSON.parse(data);
      foodDatabase.splice(0, foodDatabase.length, ...items);
    }
  } catch {}
}

// ---- Unit management (persistent) ----
const UNIT_KEY = "mampflogger-units";

const DEFAULT_UNITS = ["100g", "100ml", "1 Stk", "1 Tasse", "1 Scheibe", "1 Portion"];

export function loadUnits(): string[] {
  try {
    const data = localStorage.getItem(UNIT_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  // First run: persist the defaults
  saveUnits(DEFAULT_UNITS);
  return [...DEFAULT_UNITS];
}

export function saveUnits(units: string[]): void {
  localStorage.setItem(UNIT_KEY, JSON.stringify(units));
}

export function deleteUnit(unit: string): void {
  if (unit === "100g") return; // protected
  const units = loadUnits().filter(u => u !== unit);
  saveUnits(units);
  // Reset foods using this unit to 100g
  foodDatabase.forEach(f => {
    if (f.baseUnit === unit) { f.baseUnit = "100g"; f.baseAmount = 100; }
  });
  saveFoodDatabase(foodDatabase);
}

export function addUnit(unit: string): void {
  const units = loadUnits();
  if (!units.includes(unit)) {
    units.push(unit);
    saveUnits(units);
  }
}

// ---- Usage tracking ----
const USAGE_KEY = "mampflogger-food-usage";

export function loadFoodUsage(): Record<string, number> {
  try {
    const data = localStorage.getItem(USAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function trackFoodUsage(foodName: string): void {
  const usage = loadFoodUsage();
  const key = foodName.toLowerCase();
  usage[key] = (usage[key] ?? 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export function getFoodUsageCount(foodName: string): number {
  const usage = loadFoodUsage();
  return usage[foodName.toLowerCase()] ?? 0;
}

export function searchFood(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const usage = loadFoodUsage();

  const matches = foodDatabase.filter((item) =>
    item.name.toLowerCase().includes(lower)
  );

  // Sort: items used before come first (desc), then alphabetically
  matches.sort((a, b) => {
    const ua = usage[a.name.toLowerCase()] ?? 0;
    const ub = usage[b.name.toLowerCase()] ?? 0;
    if (ub !== ua) return ub - ua;
    return a.name.localeCompare(b.name, "de");
  });

  return matches.slice(0, 10);
}
