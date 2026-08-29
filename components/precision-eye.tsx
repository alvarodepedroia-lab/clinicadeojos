"use client";

import { useEffect, useRef } from "react";

/** Iris de la sección de prestaciones. En escritorio sigue al cursor; en táctil
 *  o con "reducir movimiento" activado queda quieto y solo respira. */
export function PrecisionEye() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function follow(event: PointerEvent) {
      const box = element!.getBoundingClientRect();
      const deltaX = event.clientX - (box.left + box.width / 2);
      const deltaY = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(deltaX, deltaY) || 1;
      const reach = Math.min(distance, 560) / 560;
      element!.style.setProperty("--eye-x", `${(deltaX / distance) * reach * 17}px`);
      element!.style.setProperty("--eye-y", `${(deltaY / distance) * reach * 17}px`);
    }

    window.addEventListener("pointermove", follow, { passive: true });
    return () => window.removeEventListener("pointermove", follow);
  }, []);

  return (
    <div className="precision-art" ref={ref} aria-hidden="true">
      <span className="eye-ring eye-ring-outer" />
      <span className="eye-ring eye-ring-mid" />
      <span className="eye-globe">
        <span className="eye-iris" />
        <span className="eye-pupil" />
        <span className="eye-glint" />
      </span>
    </div>
  );
}
