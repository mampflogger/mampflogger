/** Chefkochmütze nach Referenz: 3 Wölbungen oben, Falten im Schaft, glatter Bund */
const CookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* bewusst kleiner gezeichnet (~50% innerhalb der Icon-Fläche) */}
    <g transform="translate(5 4.8) scale(0.58)">
      {/* Oberteil mit klar 3 Wölbungen */}
      <path d="M2.7 10.2C1.1 10.2 0 9 0 7.4C0 5.9 1.2 4.7 2.7 4.7C3.9 4.7 4.9 5.4 5.4 6.5C6 4 8.1 2.4 11 2.4C13.9 2.4 16 4 16.6 6.5C17.1 5.4 18.1 4.7 19.3 4.7C20.8 4.7 22 5.9 22 7.4C22 9 20.9 10.2 19.3 10.2" />
      <path d="M5 10.4C6.7 12.3 9.9 12.7 12.9 11.7C14.6 11.1 15.7 10.3 17 9.6" />
      <path d="M12.2 11.8C13.1 11.6 14.2 11.1 14.9 10.5" />

      {/* Schaft */}
      <path d="M5.8 10.6C6.4 13.3 6.6 16.5 6.2 19.8" />
      <path d="M16.2 10.6C15.6 13.3 15.4 16.5 15.8 19.8" />

      {/* Falten nur im Schaft */}
      <path d="M8.1 18.9C8.1 17.2 7.9 15.5 7.6 14" />
      <path d="M10.1 18.7C10.1 16.9 10 15.3 9.8 13.8" />
      <path d="M12.1 18.7C12.1 16.9 12.2 15.3 12.4 13.8" />
      <path d="M14.1 18.9C14.1 17.2 14.3 15.5 14.6 14" />

      {/* Bund/Rand ohne Striche */}
      <path d="M6.2 19.6C9.2 18.8 12.8 18.8 15.8 19.6" />
      <ellipse cx="11" cy="21.2" rx="5.3" ry="1.4" />
    </g>
  </svg>
);

export default CookIcon;
