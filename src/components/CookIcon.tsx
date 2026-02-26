/** Custom cook/chef icon – bolder & more visible than lucide ChefHat */
const CookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Hat top – three circles merged */}
    <circle cx="12" cy="8" r="5" />
    <circle cx="7" cy="10" r="3" />
    <circle cx="17" cy="10" r="3" />
    {/* Hat band */}
    <path d="M6 13h12v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2z" />
    {/* Hat brim / base */}
    <line x1="7" y1="17" x2="17" y2="17" />
  </svg>
);

export default CookIcon;
