import { useRef } from "react";
import { animate, useInView, useIsomorphicLayoutEffect } from "framer-motion";

export default function AnimatedCounter({
  from = 0,
  to,
  duration = 1,
  ease = "easeOut",
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;

    el.textContent = String(from);

    // If user prefers reduced motion → no animation
    if (window.matchMedia("(prefers-reduced-motion)").matches) {
      el.textContent = String(to);
      return;
    }

    const controls = animate(from, to, {
      duration,
      ease,
      onUpdate(value) {
        el.textContent = Math.round(value);
      },
    });

    return () => controls.stop();
  }, [from, to, duration, ease, inView]);

  return <span ref={ref} />;
}
