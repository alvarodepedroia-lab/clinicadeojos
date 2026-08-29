/* eslint-disable @next/next/no-html-link-for-pages */
export default async function TurnoConfirmacion({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  return <main className="employee-empty"><p className="eyebrow">Solicitud recibida</p><h1>Gracias por solicitar tu turno.</h1><p>Tu número de solicitud es <strong>{codigo || "registrado"}</strong>. La clínica verificará disponibilidad y se comunicará con vos para confirmarlo.</p><p><a className="button" href="/">Volver al sitio</a></p></main>;
}
