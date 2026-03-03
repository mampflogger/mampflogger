interface SectionHeadingProps {
  children: React.ReactNode;
  highlighted?: boolean;
  className?: string;
}

const SectionHeading = ({ children, highlighted, className = "" }: SectionHeadingProps) => (
  <h2
    className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
      highlighted ? "text-primary section-heading-highlight" : "text-muted-foreground"
    } ${className}`}
  >
    {children}
  </h2>
);

export default SectionHeading;
