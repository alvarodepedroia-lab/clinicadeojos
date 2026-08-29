/** Exportación de la bandeja de reservas: Excel (CSV) y PDF (vía impresión). */

export type ExportRow = Record<string, string>;

const columns = [
  "Código", "Estado", "Paciente", "DNI", "Teléfono", "Correo",
  "Atención", "Profesional", "Cobertura",
  "Fecha del turno", "Horario", "2ª fecha", "2º horario", "Recibida",
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** CSV con separador ";" y BOM UTF-8: es lo que Excel en español abre bien de
 *  entrada, sin pasar por el asistente de importación. */
export function downloadSpreadsheet(rows: ExportRow[], filename: string) {
  const escape = (value: string) => `"${(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    columns.map(escape).join(";"),
    ...rows.map((row) => columns.map((column) => escape(row[column] ?? "")).join(";")),
  ];
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

const escapeHtml = (value: string) =>
  (value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

/** Abre el diálogo de impresión del navegador con la planilla ya formateada.
 *  Desde ahí se elige "Guardar como PDF". Va en un iframe para no tocar el panel. */
export function printSheet(title: string, subtitle: string, rows: ExportRow[]) {
  const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows.length
    ? rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length}" class="vacio">No hay reservas en este período.</td></tr>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page{size:A4 landscape;margin:12mm}
  *{box-sizing:border-box}
  body{margin:0;font:11px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#16233a}
  header{border-bottom:2px solid #092b78;padding-bottom:8px;margin-bottom:14px}
  h1{margin:0;font-size:17px;color:#092b78}
  p{margin:3px 0 0;font-size:11px;color:#5a6b84}
  table{width:100%;border-collapse:collapse}
  th{background:#eef5fa;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#3d5a80}
  th,td{border:1px solid #c9dbe8;padding:5px 6px;vertical-align:top}
  tr{break-inside:avoid}
  .vacio{text-align:center;color:#5a6b84;padding:18px}
  footer{margin-top:12px;font-size:10px;color:#7a8aa0}
</style></head><body>
<header><h1>Clínica de Ojos S.R.L.</h1><p>${escapeHtml(title)}</p><p>${escapeHtml(subtitle)}</p></header>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<footer>${rows.length} ${rows.length === 1 ? "reserva" : "reservas"} · generado el ${escapeHtml(new Date().toLocaleString("es-AR"))}</footer>
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1000);
  };
}
