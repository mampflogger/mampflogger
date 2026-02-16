

## Plan: UI-Überarbeitung und neue Features

Dieses Update umfasst 9 Änderungen an der FoodLog-App: CSV-Anpassungen, Formular-Neuordnung, automatische Lebensmittel-Erfassung, Settings-Menü, Tab-Umbenennung, Design-Themes, Rundung, Defizit-Statistik und Bewegungsart-Anzeige.

---

### 1. CSV Lebensmittelliste: Spalte "Basis" entfernen

Export und Import der Lebensmittelliste verwenden aktuell 8 Spalten inkl. "Basis" (baseAmount). Diese wird entfernt, da sie redundant zur Einheit ist.

- **Export** (`csvExport.ts`): Header wird `Lebensmittel;Einheit;kcal;PRO;FAT;KH;FIB` (7 Spalten statt 8)
- **Import** (`csvExport.ts` - `parseFoodDatabaseCsv`): Parser erwartet 7 statt 8 Spalten, leitet baseAmount aus baseUnit ab (100 bei g/ml, 1 bei Stk)
- **ImportDialog**: Format-Hinweis anpassen

---

### 2. Eingabemaske: Felder Lebensmittel und g/ml tauschen

Aktuell: Uhrzeit | g/ml | Lebensmittel (3-spaltig)
Neu: Uhrzeit | Lebensmittel (3-spaltig) | g/ml

Das Lebensmittel-Feld kommt an Position 2 und ueberspannt weiterhin 3 Spalten. g/ml rutscht ans Ende. Der Cursor springt naturgemaess zuerst ins Lebensmittel-Feld.

Reihenfolge Zeile 1 (5 Spalten): Uhrzeit (1) | Lebensmittel (3) | g/ml (1)
Zeile 2 bleibt: kcal | PRO | FAT | KH | FIB

---

### 3. Neue Lebensmittel automatisch zur internen Liste hinzufuegen

Wenn ein Eintrag gebucht wird und das Lebensmittel noch nicht in der `foodDatabase` existiert, wird es automatisch hinzugefuegt (mit den eingegebenen Werten als Basis fuer die eingegebene Menge, normalisiert auf baseAmount).

Zusaetzlich: Eine neue Funktion zum Anzeigen/Verwalten der Lebensmittelliste wird im Settings-Dialog integriert (Tab oder Abschnitt). Dort kann man die gesamte Liste einsehen und einzelne Eintraege loeschen.

---

### 4. Settings-Menue: Zusammenfassung von Funktionen

Alle Utility-Funktionen werden unter einem einzigen Zahnrad-Icon oben rechts zusammengefasst:

- Profil (aktuell eigenes Icon)
- Design / Dark Mode (aktuell eigenes Icon)  
- Farbthemes (neu)
- Lebensmittelliste anzeigen (neu)
- Import (aktuell eigenes Icon)
- Export (aktuell eigenes Icon)
- Daten loeschen (aktuell eigenes Icon)

Umsetzung: Ein neuer `SettingsDialog` als Fullscreen-Dialog mit Abschnitten/Tabs ersetzt die 5 einzelnen Icons im Header. Nur noch das Zahnrad-Icon und die Tab-Buttons bleiben im Header.

---

### 5. Tabs umbenennen und zentrieren

- "Protokoll" wird zu **"Eingabe"**
- "Woche" wird zu **"Statistik"**
- Die Tab-Buttons werden oben mittig platziert (zwischen Logo und Settings)

---

### 6. Design-Themes mit Farbpaaren

Vier zusaetzliche Farbthemes neben dem aktuellen Gruen:

| Theme | Primary (Buttons, kräftig) | Background-Akzent (hellgrau-Ton) |
|-------|---------------------------|----------------------------------|
| Gruen (Standard) | hsl(152, 55%, 42%) | wie bisher |
| Gelb | hsl(45, 80%, 50%) | hsl(45, 30%, 95%) |
| Blau | hsl(210, 70%, 50%) | hsl(210, 30%, 95%) |
| Pink | hsl(330, 60%, 55%) | hsl(330, 30%, 95%) |

Die Makrofarben (PRO=blau, FAT=gelb, KH=rot, FIB=gruen) bleiben unveraendert. Umgesetzt durch Aendern der CSS-Variablen `--primary`, `--accent`, `--secondary` etc. per JavaScript-Klasse auf `<html>`. Persistiert in localStorage.

---

### 7. Kaufmaennische Rundung auf ganze Zahlen

Alle kcal- und Makro-Angaben werden konsequent auf ganze Zahlen gerundet (`Math.round`). Betrifft:

- `NutritionForm.tsx`: Werte vor dem Speichern runden
- `applyFoodValues`: Ergebnisse runden
- Alle Anzeigen in Tabelle, DeficitDisplay, WeeklyOverview pruefen

---

### 8. Neue Statistik: Defizit pro Tag (Balkendiagramm)

Unterhalb des bestehenden "Kalorien pro Tag"-Diagramms in der Statistik-Ansicht wird ein gleichgestaltetes Balkendiagramm "Defizit pro Tag" eingefuegt.

- Berechnung: (BMR + Bewegungsbonus) - Kalorienaufnahme pro Tag
- Positive Werte (Defizit) in Gruen, negative (Ueberschuss) in Rot
- Nur sichtbar wenn ein Profil hinterlegt ist

---

### 9. Bewegungsart-Dropdown: Kalorienangabe entfernen

Im Select-Dropdown der Bewegungseingabe wird nur noch der Name angezeigt, nicht mehr "(300 kcal/60min)".

Aktuell: `{type.name} ({type.caloriesPerUnit} kcal/{type.unit})`
Neu: `{type.name}`

---

### Technische Details

**Neue Dateien:**
- `src/components/SettingsDialog.tsx` - Zentraler Einstellungs-Dialog mit Abschnitten fuer Profil, Design, Lebensmittelliste, Import/Export, Loeschen

**Geaenderte Dateien:**
- `src/pages/Index.tsx` - Header vereinfachen (nur Logo, Tabs mittig, Zahnrad rechts), Theme-State, Tab-Labels
- `src/components/NutritionForm.tsx` - Feld-Reihenfolge tauschen, Rundung, Auto-Add zu foodDatabase
- `src/components/ActivityInput.tsx` - Kalorienangabe im Dropdown entfernen
- `src/components/WeeklyOverview.tsx` - Defizit-Balkendiagramm hinzufuegen
- `src/lib/csvExport.ts` - Basis-Spalte aus Lebensmittel-Export/Import entfernen
- `src/components/ImportDialog.tsx` - Format-Hinweis anpassen (7 Spalten)
- `src/data/foodDatabase.ts` - `addFoodItem` und `removeFoodItem` Hilfsfunktionen, Persistierung in localStorage
- `src/index.css` - CSS-Variablen fuer die 4 Farbthemes

