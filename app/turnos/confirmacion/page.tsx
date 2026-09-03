/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
import { formatDateLabel } from "@/lib/availability";
import { site } from "@/app/site-data";

const whatsapp = `https://wa.me/${site.whatsapp}`;

export default async function TurnoConfirmacion({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string; fecha?: string; hora?: string; error?: string }>;
}) {
  const { codigo, fecha, hora, error } = await searchParams;

  // Dos personas mandaron el mismo horario casi al mismo tiempo y la base
  // rechazó el segundo. No se registró nada: hay que elegir otro.
  if (error === "ocupado") {
    return (
      <main className="turno-ok">
        <section>
          <a className="brand" href="/"><img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" /></a>
          <span className="turno-check turno-check-aviso" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 8v5M12 17h.01" />
            </svg>
          </span>
          <p className="eyebrow">Horario no disponible</p>
          <h1>Ese turno acaba de ser tomado</h1>
          <p className="turno-cuando">
            Otra persona reservó ese horario mientras completabas el formulario.
            Tu solicitud no se registró: volvé y elegí otro horario.
          </p>
          <p className="turno-nota">
            Si necesitás ayuda para conseguir un turno, escribinos por WhatsApp y te acomodamos.
          </p>
          <div className="turno-acciones">
            <a className="button" href="/#turnos">Elegir otro horario</a>
            <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Escribirnos por WhatsApp →</a>
          </div>
        </section>
      </main>
    );
  }

  const valida = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  // Sin fecha es el caso de los horarios rotativos: la clínica coordina.
  const dia = valida ? formatDateLabel(fecha).replace(",", "").toLocaleLowerCase("es-AR") : null;

  return (
    <main className="turno-ok">
      <section>
        <a className="brand" href="/"><img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" /></a>

        <span className="turno-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>

        <p className="eyebrow">{dia ? "Turno confirmado" : "Solicitud recibida"}</p>

        {dia ? (
          <>
            <h1>Su turno fue asignado</h1>
            <p className="turno-cuando">
              para el <strong>{dia}</strong>
              {hora && <> a las <strong>{hora}</strong></>}
            </p>
            <p className="turno-estado">Está confirmado.</p>
          </>
        ) : (
          <>
            <h1>Recibimos su solicitud</h1>
            <p className="turno-cuando">
              La clínica se comunicará con usted para coordinar el día y el horario de atención.
            </p>
          </>
        )}

        {codigo && (
          <p className="turno-codigo">Número de solicitud <strong>{codigo}</strong></p>
        )}

        <p className="turno-nota">
          Ante cualquier cambio, Clínica de Ojos se pondrá en contacto con usted desde su
          WhatsApp oficial.
        </p>

        <div className="turno-acciones">
          <a className="button" href="/">Volver al sitio</a>
          <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Escribirnos por WhatsApp →</a>
        </div>
      </section>
    </main>
  );
}
