import { useState, useCallback, useRef, useEffect } from "react";

const HEADER_OFFSET = 140; // sticky header + date nav

export function useSectionNavigation() {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToSection = useCallback((sectionId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setActiveSection(sectionId);
    setHighlightedSection(sectionId);

    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }, 100);

    highlightTimerRef.current = setTimeout(() => {
      setHighlightedSection(null);
    }, 3000);
  }, []);

  const scrollDirection = useCallback((direction: "up" | "down") => {
    const sections = Array.from(document.querySelectorAll("[data-section]"))
      .sort((a, b) => {
        const aTop = a.getBoundingClientRect().top + window.scrollY;
        const bTop = b.getBoundingClientRect().top + window.scrollY;
        return aTop - bTop;
      });

    if (sections.length === 0) return;

    // Find the section currently aligned at the header offset
    // A section is "current" if its top is within a small tolerance of the header
    const TOLERANCE = 40;
    let currentIdx = -1;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].getBoundingClientRect().top;
      if (top >= HEADER_OFFSET - TOLERANCE) {
        currentIdx = i;
        break;
      }
    }
    if (currentIdx === -1) currentIdx = sections.length - 1;

    let targetIdx: number;
    if (direction === "down") {
      // Always jump to the next section
      const currentTop = sections[currentIdx]?.getBoundingClientRect().top ?? 0;
      const isAligned = Math.abs(currentTop - HEADER_OFFSET) < TOLERANCE;
      targetIdx = isAligned
        ? Math.min(currentIdx + 1, sections.length - 1)
        : currentIdx; // not yet aligned → scroll to this one first
    } else {
      // Going up: find first section whose top is ABOVE the header
      const currentTop = sections[currentIdx]?.getBoundingClientRect().top ?? 0;
      const isAligned = Math.abs(currentTop - HEADER_OFFSET) < TOLERANCE;
      targetIdx = isAligned
        ? Math.max(0, currentIdx - 1)
        : Math.max(0, currentIdx - 1);
    }

    const target = sections[targetIdx];
    if (target) {
      scrollToSection(target.id);
    }
  }, [scrollToSection]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  return { highlightedSection, activeSection, setActiveSection, scrollToSection, scrollDirection };
}
