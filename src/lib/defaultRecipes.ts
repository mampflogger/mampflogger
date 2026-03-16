const SAVED_RECIPES_KEY = "mampflogger-saved-recipes";

interface RecipeMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface RecipeIngredient {
  name: string;
  amount: string;
  isMain: boolean;
}

interface DefaultRecipe {
  id: string;
  savedAt: string;
  name: string;
  servings: number;
  prepTime: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  totalMacros: RecipeMacros;
  perServing: RecipeMacros;
}

export const DEFAULT_RECIPES: DefaultRecipe[] = [
  {
    id: "default-mediterraner-reissalat",
    savedAt: new Date().toISOString(),
    name: "Mediterraner Reissalat",
    servings: 2,
    prepTime: "25 min",
    ingredients: [
      { name: "Basmatireis", amount: "200g", isMain: true },
      { name: "Cherrytomaten", amount: "150g", isMain: false },
      { name: "Gurke", amount: "100g", isMain: false },
      { name: "Feta", amount: "80g", isMain: true },
      { name: "Oliven (schwarz)", amount: "50g", isMain: false },
      { name: "Olivenöl", amount: "2 EL", isMain: false },
      { name: "Zitronensaft", amount: "1 EL", isMain: false },
      { name: "Frische Kräuter (Petersilie, Minze)", amount: "15g", isMain: false },
      { name: "Salz & Pfeffer", amount: "nach Geschmack", isMain: false },
    ],
    steps: [
      "Reis nach Packungsanleitung kochen und abkühlen lassen.",
      "Cherrytomaten halbieren, Gurke würfeln, Oliven in Ringe schneiden.",
      "Feta in kleine Würfel schneiden.",
      "Kräuter fein hacken.",
      "Alles in einer großen Schüssel vermengen.",
      "Mit Olivenöl, Zitronensaft, Salz und Pfeffer abschmecken.",
    ],
    totalMacros: { calories: 980, protein: 28, fat: 38, carbs: 128, fiber: 8 },
    perServing: { calories: 490, protein: 14, fat: 19, carbs: 64, fiber: 4 },
  },
  {
    id: "default-lachsfilet",
    savedAt: new Date().toISOString(),
    name: "Lachsfilet mit Ofengemüse",
    servings: 2,
    prepTime: "30 min",
    ingredients: [
      { name: "Lachsfilet", amount: "300g", isMain: true },
      { name: "Brokkoli", amount: "200g", isMain: true },
      { name: "Süßkartoffel", amount: "200g", isMain: false },
      { name: "Zucchini", amount: "150g", isMain: false },
      { name: "Olivenöl", amount: "2 EL", isMain: false },
      { name: "Knoblauch", amount: "2 Zehen", isMain: false },
      { name: "Zitrone", amount: "1 Stück", isMain: false },
      { name: "Salz, Pfeffer, Paprikapulver", amount: "nach Geschmack", isMain: false },
    ],
    steps: [
      "Ofen auf 200°C vorheizen.",
      "Süßkartoffel schälen und in Würfel schneiden, Brokkoli in Röschen teilen, Zucchini in Scheiben schneiden.",
      "Gemüse mit Olivenöl, Knoblauch und Gewürzen auf einem Backblech verteilen.",
      "15 Minuten im Ofen vorgaren.",
      "Lachsfilet mit Zitronensaft beträufeln, würzen und auf das Gemüse legen.",
      "Weitere 15 Minuten backen bis der Lachs gar ist.",
    ],
    totalMacros: { calories: 920, protein: 62, fat: 42, carbs: 68, fiber: 14 },
    perServing: { calories: 460, protein: 31, fat: 21, carbs: 34, fiber: 7 },
  },
];

export function saveDefaultRecipes(): void {
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(DEFAULT_RECIPES));
}
