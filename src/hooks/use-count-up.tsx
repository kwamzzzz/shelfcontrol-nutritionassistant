import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Counts a figure up the first time it scrolls into view.
 *
 * Snaps straight to the value when reduced motion is preferred, when there is
 * no IntersectionObserver, or before the node mounts — the number is never
 * gated behind an animation that might not run.
 */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>(
  target: number,
  duration = 900,
) {
  const reduced = useReducedMotion();
  const ref = useRef<T>(null);
  const [value, setValue] = useState(() => (reduced ? target : 0));

  useEffect(() => {
    const node = ref.current;
    if (reduced || !node || typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }

    let frame = 0;
    let startedAt = 0;

    const step = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
      else setValue(target);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          frame = requestAnimationFrame(step);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration, reduced]);

  return { ref, value };
}
