"use client";

import { useEffect, useRef } from "react";

/** Logo del hero con la estrella del iris siguiendo al cursor.
 *
 *  No redibuja la marca: sobre el iris (un disco navy perfecto, medido en el PNG
 *  original) se apoya un recorte de la propia imagen con la estrella, y ese
 *  recorte es el que se mueve. Lo que deja atrás es el mismo navy del disco.
 *
 *  En pantallas táctiles o con "reducir movimiento" activado se queda quieto. */
export function LogoEye() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Escribir dos variables CSS es barato y los pointermove ya vienen agrupados
    // por cuadro, así que no hace falta pasar por requestAnimationFrame.
    function follow(event: PointerEvent) {
      const box = element!.getBoundingClientRect();
      const deltaX = event.clientX - (box.left + box.width / 2);
      const deltaY = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(deltaX, deltaY) || 1;
      // A partir de media pantalla de distancia la mirada ya está al máximo.
      const reach = Math.min(distance, 620) / 620;
      element!.style.setProperty("--px", String((deltaX / distance) * reach));
      element!.style.setProperty("--py", String((deltaY / distance) * reach));
    }

    window.addEventListener("pointermove", follow, { passive: true });
    return () => window.removeEventListener("pointermove", follow);
  }, []);

  return (
    <span className="logo-eye" ref={ref}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-clinica-de-ojos.png" alt="" />
      <span className="logo-iris" aria-hidden="true"><span className="logo-pupil" /></span>
    </span>
  );
}
