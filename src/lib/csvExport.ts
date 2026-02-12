import { NutritionEntry } from "@/types/nutrition";

export function exportEntriesToCsv(entries: NutritionEntry[]): void {
  const sorted = [...entries].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    return dateComp !== 0 ? dateComp : a.time.localeCompare(b.time);
  });

  const header = "Datum;Zeit;Lebensmittel;Menge;kcal;PRO;FAT;KH;FIB";
  const rows = sorted.map((e) =>
    [
      e.date,
      e.time,
      `"${e.food.replace(/"/g, '""')}"`,
      e.amount,
      Math.round(e.calories),
      Math.round(e.protein),
      Math.round(e.fat),
      Math.round(e.carbs),
      Math.round(e.fiber),
    ].join(";")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `naehrlog-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
