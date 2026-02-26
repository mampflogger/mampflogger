/** Custom chef hat icon – tall toque with rounded top and horizontal band */
const CookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Tall rounded hat top */}
    <path d="M6 15C4 15 2.5 13 2.5 10.5C2.5 8 4 6 6 6C6.5 6 7 6.1 7.4 6.3C8 4 9.8 2.5 12 2.5C14.2 2.5 16 4 16.6 6.3C17 6.1 17.5 6 18 6C20 6 21.5 8 21.5 10.5C21.5 13 20 15 18 15" />
    {/* Hat body – tall sides */}
    <line x1="6" y1="15" x2="6" y2="9" />
    <line x1="18" y1="15" x2="18" y2="9" />
    {/* Hat band */}
    <rect x="6" y="15" width="12" height="3" rx="0.5" />
    {/* Vertical lines on band */}
    <line x1="9" y1="15.5" x2="9" y2="17.5" />
    <line x1="12" y1="15.5" x2="12" y2="17.5" />
    <line x1="15" y1="15.5" x2="15" y2="17.5" />
    {/* Brim */}
    <path d="M5 18h14" />
  </svg>
);

export default CookIcon;
