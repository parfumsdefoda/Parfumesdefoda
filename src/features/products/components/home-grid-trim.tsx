"use client";

import { useEffect } from "react";

/**
 * HomeGridTrim — the homepage shows whole rows only.
 *
 * Mobile (<1024px) shows the first 12 cards (CSS hides the rest). From
 * 1024px the auto-fill grid's column count depends on the viewport, so after
 * mount this island keeps exactly the first two rows and hides the rest —
 * never a partial row. Re-runs on resize so a rotated phone or a dragged
 * window never leaves a clipped row.
 */
export function HomeGridTrim() {
  useEffect(() => {
    const run = () => {
      const grid = document.querySelector<HTMLElement>("[data-home-grid]");
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll("[data-card]")) as HTMLElement[];
      if (cards.length === 0) return;

      if (window.innerWidth < 1024) {
        cards.forEach((card, index) => {
          card.style.display = index < 12 ? "" : "none";
        });
        return;
      }

      // Columns = cards sharing the first card's offsetTop.
      const firstTop = cards[0].offsetTop;
      let cols = 0;
      for (const card of cards) {
        if (card.offsetTop === firstTop) cols += 1;
        else break;
      }
      if (cols <= 0) cols = 1;
      const keep = cols * 2;
      cards.forEach((card, index) => {
        card.style.display = index < keep ? "" : "none";
      });
    };

    run();
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, []);

  return null;
}
