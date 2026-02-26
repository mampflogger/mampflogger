/** Chef's toque icon – classic tall pleated hat with a band at the bottom */
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
    {/* Puffy cloud top of the toque */}
    <path d="M6.5 11C4.6 11 3 9.4 3 7.5C3 5.8 4.3 4.3 6 4C6.5 2.8 7.8 2 9.5 2C10.5 2 11.3 2.3 12 2.8C12.7 2.3 13.5 2 14.5 2C16.2 2 17.5 2.8 18 4C19.7 4.3 21 5.8 21 7.5C21 9.4 19.4 11 17.5 11" />
    {/* Tall hat body */}
    <path d="M7 11V19" />
    <path d="M17 11V19" />
    {/* Band at the bottom */}
    <rect x="6" y="19" width="12" height="3" rx="1" />
  </svg>
);

export default CookIcon;
