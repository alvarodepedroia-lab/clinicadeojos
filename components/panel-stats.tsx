"use client";

import { useMemo, useState } from "react";
import { toIsoDate, weekdayNames } from "@/lib/availability";
import type { AppointmentRequest } from "@/components/employee-dashboard-client";

/* Paleta validada con el verificador de la guía de visualización:
   banda de luminosidad, croma, separación para daltonismo (ΔE 15,3 en
   deuteranopía) y contraste contra el fondo. Son los dos azules de la marca. */
const MAÑANA = "#0b9dd5";
const TARDE = "#2f5fd0";
const SERIE = "#0b9dd5"; // magnitud: una sola serie, un solo tono

const coverageLabels: Record<string, string> = {
  particular: "Particular", obra_social: "Obra social", prepaga: "Prepaga",
};

// Las canceladas y rechazadas no son atención: no cuentan.
const descartadas = ["cancelled", "rejected"];

type Rango = "month" | "quarter" | "all";

const rangos: [Rango, string][] = [
  ["month", "Este mes"], ["quarter", "Últimos 3 meses"], ["all", "Todo"],
];

function desdeCuando(rango: Rango) {
  if (rango === "all") return "0000-01-01";
  const now = new Date();
  if (rango === "month") return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1));
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function PanelStats({
  requests, doctorNames,
}: {
  requests: AppointmentRequest[];
  doctorNames: Record<string, string>;
}) {
  const [rango, setRango] = useState<Rango>("quarter");

  const datos = useMemo(() => {
    const desde = desdeCuando(rango);
    const atendidas = requests.filter((r) => !descartadas.includes(r.status));
    const conFecha = atendidas.filter((r) => r.preferred_date && r.preferred_date >= desde);
    const aCoordinar = atendidas.filter((r) => !r.preferred_date).length;

    const porDia = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      nombre: weekdayNames[weekday - 1],
      total: conFecha.filter((r) => {
        const [y, m, d] = r.preferred_date!.split("-").map(Number);
        const day = new Date(y, m - 1, d).getDay();
        return (day === 0 ? 7 : day) === weekday;
      }).length,
    })).filter((d) => d.weekday <= 5 || d.total > 0);

    let mañana = 0, tarde = 0;
    for (const r of conFecha) {
      if (!r.preferred_time_band) continue;
      if (Number(r.preferred_time_band.slice(0, 2)) < 13) mañana += 1; else tarde += 1;
    }

    const agrupar = (clave: (r: AppointmentRequest) => string) => {
      const mapa = new Map<string, number>();
      for (const r of conFecha) { const k = clave(r); mapa.set(k, (mapa.get(k) ?? 0) + 1); }
      return [...mapa.entries()].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
    };

    const porCobertura = agrupar((r) => r.coverage_name?.trim() || coverageLabels[r.coverage_kind] || r.coverage_kind);
    const porProfesional = agrupar((r) => (r.doctor_id ? doctorNames[r.doctor_id] ?? "Sin asignar" : "Primer disponible"));

    return { total: conFecha.length, aCoordinar, porDia, mañana, tarde, porCobertura, porProfesional };
  }, [requests, doctorNames, rango]);

  const diaTop = [...datos.porDia].sort((a, b) => b.total - a.total)[0];
  const franjaTop = datos.mañana === datos.tarde ? "Parejo" : datos.mañana > datos.tarde ? "Mañana" : "Tarde";
  const maxDia = Math.max(1, ...datos.porDia.map((d) => d.total));
  const totalFranja = datos.mañana + datos.tarde;

  if (!datos.total) {
    return (
      <section className="dashboard-card">
        <div className="dashboard-card-heading">
          <div><p className="eyebrow">Estadísticas</p><h2>Cómo se comporta la demanda</h2></div>
          <RangoSelector rango={rango} setRango={setRango} />
        </div>
        <p className="summary-empty">
          Todavía no hay turnos con fecha en este período. Probá con un rango más amplio.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-card stats-panel">
      <div className="dashboard-card-heading">
        <div>
          <p className="eyebrow">Estadísticas</p>
          <h2>Cómo se comporta la demanda</h2>
          <p className="section-description">
            Sobre {datos.total} {datos.total === 1 ? "turno" : "turnos"} con fecha asignada.
            No se cuentan las solicitudes canceladas ni rechazadas
            {datos.aCoordinar > 0 && `, ni ${datos.aCoordinar} que están a coordinar`}.
          </p>
        </div>
        <RangoSelector rango={rango} setRango={setRango} />
      </div>

      <div className="stat-tiles">
        <article><span>Turnos</span><strong>{datos.total}</strong><small>en el período</small></article>
        <article><span>Día más pedido</span><strong>{capitalizar(diaTop?.nombre ?? "—")}</strong><small>{diaTop?.total ?? 0} turnos</small></article>
        <article><span>Franja preferida</span><strong>{franjaTop}</strong><small>{totalFranja ? `${Math.round((Math.max(datos.mañana, datos.tarde) / totalFranja) * 100)}% de los turnos` : "sin datos"}</small></article>
        <article><span>Cobertura más frecuente</span><strong>{datos.porCobertura[0]?.nombre ?? "—"}</strong><small>{datos.porCobertura[0]?.total ?? 0} turnos</small></article>
      </div>

      <div className="chart-grid">
        <figure className="chart-card">
          <figcaption>Pacientes por día de la semana</figcaption>
          <div className="bars-vertical" role="list">
            {datos.porDia.map((dia) => (
              <div className="bar-column" role="listitem" key={dia.weekday} tabIndex={0}
                data-tip={`${capitalizar(dia.nombre)}: ${dia.total} ${dia.total === 1 ? "turno" : "turnos"}`}>
                <b>{dia.total}</b>
                <i style={{ height: `${(dia.total / maxDia) * 100}%`, background: SERIE }} />
                <span>{dia.nombre.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </figure>

        <figure className="chart-card">
          <figcaption>Mañana o tarde</figcaption>
          {!totalFranja ? <p className="summary-empty">Sin horarios cargados.</p> : (
            <>
              <div className="bar-split" role="img"
                aria-label={`Mañana ${datos.mañana} turnos, tarde ${datos.tarde} turnos`}>
                <i tabIndex={0} style={{ width: `${(datos.mañana / totalFranja) * 100}%`, background: MAÑANA }}
                  data-tip={`Mañana: ${datos.mañana} turnos`} />
                <i tabIndex={0} style={{ width: `${(datos.tarde / totalFranja) * 100}%`, background: TARDE }}
                  data-tip={`Tarde: ${datos.tarde} turnos`} />
              </div>
              <ul className="chart-legend">
                <li><em style={{ background: MAÑANA }} />Mañana <b>{datos.mañana}</b><small>hasta las 13:00</small></li>
                <li><em style={{ background: TARDE }} />Tarde <b>{datos.tarde}</b><small>desde las 13:00</small></li>
              </ul>
            </>
          )}
        </figure>

        <figure className="chart-card">
          <figcaption>Obra social o prepaga</figcaption>
          <BarrasHorizontales filas={datos.porCobertura} />
        </figure>

        <figure className="chart-card">
          <figcaption>Turnos por profesional</figcaption>
          <BarrasHorizontales filas={datos.porProfesional} />
        </figure>
      </div>

      <details className="stats-table">
        <summary>Ver los datos en una tabla</summary>
        <div className="request-table" role="region" aria-label="Datos de las estadísticas" tabIndex={0}>
          <table>
            <thead><tr><th>Grupo</th><th>Categoría</th><th>Turnos</th></tr></thead>
            <tbody>
              {datos.porDia.map((d) => (
                <tr key={`d${d.weekday}`}><td>Día de la semana</td><td>{capitalizar(d.nombre)}</td><td>{d.total}</td></tr>
              ))}
              <tr><td>Franja</td><td>Mañana</td><td>{datos.mañana}</td></tr>
              <tr><td>Franja</td><td>Tarde</td><td>{datos.tarde}</td></tr>
              {datos.porCobertura.map((c) => (
                <tr key={`c${c.nombre}`}><td>Cobertura</td><td>{c.nombre}</td><td>{c.total}</td></tr>
              ))}
              {datos.porProfesional.map((p) => (
                <tr key={`p${p.nombre}`}><td>Profesional</td><td>{p.nombre}</td><td>{p.total}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function RangoSelector({ rango, setRango }: { rango: Rango; setRango: (r: Rango) => void }) {
  return (
    <div className="range-picker" role="group" aria-label="Período">
      {rangos.map(([valor, etiqueta]) => (
        <button key={valor} type="button" className={rango === valor ? "active" : ""}
          aria-pressed={rango === valor} onClick={() => setRango(valor)}>
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

function BarrasHorizontales({ filas }: { filas: { nombre: string; total: number }[] }) {
  if (!filas.length) return <p className="summary-empty">Sin datos en este período.</p>;
  const max = Math.max(1, ...filas.map((f) => f.total));
  return (
    <ul className="bars-horizontal">
      {filas.map((fila) => (
        <li key={fila.nombre}>
          <b>{fila.nombre}</b>
          <i><em tabIndex={0} style={{ width: `${(fila.total / max) * 100}%`, background: SERIE }}
            data-tip={`${fila.nombre}: ${fila.total} ${fila.total === 1 ? "turno" : "turnos"}`} /></i>
          <span>{fila.total}</span>
        </li>
      ))}
    </ul>
  );
}
