import cookIconUser from "@/assets/cook-icon-user.png";

/** Nutzer-Originalicon 1:1 aus Upload */
const CookIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <img
    src={cookIconUser}
    alt=""
    aria-hidden="true"
    className={`${className} object-contain shrink-0 translate-y-[0.5px]`}
    style={{ width: '0.8em', height: '0.8em', minWidth: '12px', minHeight: '12px' }}
    loading="lazy"
    decoding="async"
  />
);

export default CookIcon;
