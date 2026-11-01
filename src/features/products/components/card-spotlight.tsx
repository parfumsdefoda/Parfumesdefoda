"use client";

import { useEffect } from "react";

/**
 * CardSpotlight — the pointer light that follows the cursor over a card stage.
 *
 * One delegated `pointermove` listener for the whole page (a reference count
 * keeps it to one even though the island is mounted by every grid), throttled
 * to one write per animation frame, writing `--card-mx` / `--card-my` straight
 * onto the stage element. No React state, so hovering 40 cards never renders.
 *
 * It costs a few hundred bytes and does nothing at all on touch devices or
 * under `prefers-reduced-motion`. Without it the CSS spotlight simply stays at
 * its centred default, which is the intended fallback.
 */

let mounts = 0;
let frame = 0;
let last: { stage: HTMLElement; x: number; y: number } | null = null;

function paint() {
  frame = 0;
  if (!last) return;
  const rect = last.stage.getBoundingClientRect();
  last.stage.style.setProperty("--card-mx", `${Math.round(last.x - rect.left)}px`);
  last.stage.style.setProperty("--card-my", `${Math.round(last.y - rect.top)}px`);
}

function onMove(event: PointerEvent) {
  const target = event.target as Element | null;
  const stage = target?.closest?.("[data-stage]");
  if (!(stage instanceof HTMLElement)) return;
  last = { stage, x: event.clientX, y: event.clientY };
  if (!frame) frame = requestAnimationFrame(paint);
}

function detach() {
  window.removeEventListener("pointermove", onMove);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = null;
}

export function CardSpotlight() {
  useEffect(() => {
    // No pointer, or a visitor who asked for stillness: no listener at all.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    mounts += 1;
    if (mounts === 1) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      mounts -= 1;
      if (mounts === 0) detach();
    };
  }, []);

  return null;
}
