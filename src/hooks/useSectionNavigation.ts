import { useState, useCallback, useRef, useEffect } from "react";

const HEADER_OFFSET = 140; // sticky header + date nav

export function useSectionNavigation() {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToSection = useCallback((sectionId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

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
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    if (sections.length === 0) return;

    // Find first section whose top is near or below the header offset
    let currentIdx = -1;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].getBoundingClientRect().top;
      if (top >= HEADER_OFFSET - 10) {
        currentIdx = i;
        break;
      }
    }
    if (currentIdx === -1) currentIdx = sections.length - 1;

    let targetIdx: number;
    if (direction === "down") {
      // If current section is very close to header, go to next
      const currentTop = sections[currentIdx]?.getBoundingClientRect().top ?? 0;
      if (Math.abs(currentTop - HEADER_OFFSET) < 30 && currentIdx < sections.length - 1) {
        targetIdx = currentIdx + 1;
      } else {
        targetIdx = Math.min(currentIdx, sections.length - 1);
      }
    } else {
      targetIdx = Math.max(0, currentIdx - 1);
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

  return { highlightedSection, scrollToSection, scrollDirection };
}
