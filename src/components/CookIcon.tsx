/** Chef's toque icon – three puffy lobes on top, pleated band at the bottom */
const CookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Three puffy cloud lobes on top */}
    <path d="M7 11C4.8 11 3 9.2 3 7C3 5.1 4.5 3.5 6.3 3.1C7 2.4 8.2 2 9.5 2C10.5 2 11.3 2.4 12 3C12.7 2.4 13.5 2 14.5 2C15.8 2 17 2.4 17.7 3.1C19.5 3.5 21 5.1 21 7C21 9.2 19.2 11 17 11" />
    {/* Hat body / shaft */}
    <path d="M7 11V19" />
    <path d="M17 11V19" />
    {/* Band at the bottom */}
    <rect x="6" y="19" width="12" height="3" rx="1" />
    {/* Pleats / zigzag folds on the band */}
    <line x1="9" y1="19" x2="9" y2="22" />
    <line x1="11.5" y1="19" x2="11.5" y2="22" />
    <line x1="14" y1="19" x2="14" y2="22" />
    <line x1="16" y1="19" x2="16" y2="22" />
  </svg>
);

export default CookIcon;
