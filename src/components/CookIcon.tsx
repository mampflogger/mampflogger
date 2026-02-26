/** Clean chef hat icon – rounded dome top with horizontal band, matching the app's reference design */
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
    {/* Puffy rounded dome top */}
    <path d="M6 14C4.3 14 3 12.2 3 10C3 7.8 4.3 6 6 6C6.4 6 6.8 6.1 7.2 6.3C7.8 4.3 9.7 3 12 3C14.3 3 16.2 4.3 16.8 6.3C17.2 6.1 17.6 6 18 6C19.7 6 21 7.8 21 10C21 12.2 19.7 14 18 14" />
    {/* Hat body connecting dome to band */}
    <path d="M6 14V16H18V14" />
    {/* Band / rim */}
    <rect x="5" y="16" width="14" height="3" rx="0.5" />
  </svg>
);

export default CookIcon;
