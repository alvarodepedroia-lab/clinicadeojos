"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

const enlaces = [
  ["#clinica", "La clínica"],
  ["#profesionales", "Profesionales"],
  ["#administracion", "Equipo"],
  ["#prestaciones", "Prestaciones"],
  ["#preguntas", "Preguntas frecuentes"],
  ["#contacto", "Contacto"],
  ["/empleados/acceso", "Ingreso Clínica"],
];

export function SiteHeader() {
  const [abierto, setAbierto] = useState(false);

  // Si el menú queda abierto y la pantalla se agranda, la navegación vuelve a
  // mostrarse sola: hay que soltar el estado para que no quede trabado.
  useEffect(() => {
    if (!abierto) return;
    const alAgrandar = () => { if (window.innerWidth > 850) setAbierto(false); };
    const alEscapar = (evento: KeyboardEvent) => { if (evento.key === "Escape") setAbierto(false); };
    window.addEventListener("resize", alAgrandar);
    window.addEventListener("keydown", alEscapar);
    return () => {
      window.removeEventListener("resize", alAgrandar);
      window.removeEventListener("keydown", alEscapar);
    };
  }, [abierto]);

  return (
    <header className="header">
      <a href="#inicio" className="brand" aria-label="Clínica de Ojos, inicio">
        <img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" />
      </a>

      <button
        type="button"
        className="menu-button"
        aria-expanded={abierto}
        aria-controls="menu-principal"
        onClick={() => setAbierto((valor) => !valor)}
      >
        {abierto ? "Cerrar" : "Menú"}
        <span aria-hidden="true">{abierto ? "✕" : "☰"}</span>
      </button>

      <nav id="menu-principal" className={`nav${abierto ? " is-open" : ""}`} aria-label="Principal">
        {enlaces.map(([destino, texto]) => (
          <a key={destino} href={destino} onClick={() => setAbierto(false)}>{texto}</a>
        ))}
        <a className="button button-small" href="#turnos" onClick={() => setAbierto(false)}>Solicitar turno</a>
      </nav>
    </header>
  );
}
