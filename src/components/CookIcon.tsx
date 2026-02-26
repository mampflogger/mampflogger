/** Custom cook/chef icon – classic toque with cloud top & vertical lines */
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
    {/* Cloud-shaped hat top */}
    <path d="M6.5 12C4.5 12 3 10.5 3 8.5S4.5 5 6.5 5c.4 0 .8.1 1.1.2C8.3 3.3 10 2 12 2s3.7 1.3 4.4 3.2c.3-.1.7-.2 1.1-.2C19.5 5 21 6.5 21 8.5S19.5 12 17.5 12" />
    {/* Hat band */}
    <rect x="6" y="12" width="12" height="3" rx="0.5" />
    {/* Vertical lines on band */}
    <line x1="9" y1="12.5" x2="9" y2="14.5" />
    <line x1="12" y1="12.5" x2="12" y2="14.5" />
    <line x1="15" y1="12.5" x2="15" y2="14.5" />
    {/* Hat body connecting cloud to band */}
    <line x1="6.5" y1="12" x2="6" y2="12" />
    <line x1="17.5" y1="12" x2="18" y2="12" />
  </svg>
);

export default CookIcon;
