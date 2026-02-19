"use client";

import { useEffect, useRef, useState } from "react";

const HEADER_HEIGHT = 52;
const SCROLL_THRESHOLD = 5;

export function useAutoHideHeader() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      if (Math.abs(delta) < SCROLL_THRESHOLD) return;

      if (currentY <= HEADER_HEIGHT) {
        setIsVisible(true);
      } else if (delta > 0) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { isVisible };
}
