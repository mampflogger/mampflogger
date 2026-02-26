/** Chefkochmütze – exakt nach Nutzer-Referenz:
 *  3 runde Wölbungen oben, trapezförmiger Schaft mit 4 Faltenstrichen, glatter Bund unten */
const CookIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={4}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Drei Wölbungen oben */}
    <path d="M16 28C10 28 6 23 6 18C6 12 11 8 16 8C19 8 21 9.5 23 12C25 7 29 4 32 4C35 4 39 7 41 12C43 9.5 45 8 48 8C53 8 58 12 58 18C58 23 54 28 48 28" />
    {/* Schaft (Trapez) */}
    <path d="M16 28L20 48" />
    <path d="M48 28L44 48" />
    {/* Falten im Schaft */}
    <line x1="26" y1="46" x2="27" y2="32" />
    <line x1="30" y1="46" x2="31" y2="32" />
    <line x1="34" y1="46" x2="33" y2="32" />
    <line x1="38" y1="46" x2="37" y2="32" />
    {/* Bund unten – glatt, keine Striche */}
    <path d="M20 48C26 46 38 46 44 48" />
    <path d="M19 52C26 54 38 54 45 52" />
    <line x1="20" y1="48" x2="19" y2="52" />
    <line x1="44" y1="48" x2="45" y2="52" />
  </svg>
);

export default CookIcon;
