"use client";
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { downloadSpreadsheet, printSheet, type ExportRow } from "@/lib/panel-export";
import { formatBlocks, toIsoDate, weekdayNames, type AvailabilityBlock } from "@/lib/availability";
import { PanelStats } from "@/components/panel-stats";

const statuses = [
  ["new", "Nueva"], ["under_review", "En revisión"], ["entered_in_isalud", "Cargada en iSalud"],
  ["confirmed", "Confirmada"], ["reschedule_requested", "Reprogramar"], ["rejected", "Rechazada"],
  ["cancelled", "Cancelada"],
] as const;

const pendingStatuses = ["new", "under_review", "reschedule_requested"];

export type AppointmentRequest = {
  id: string; request_code: string; first_name: string; last_name: string; dni: string;
  phone: string; email: string | null; care_type: string; coverage_kind: string;
  coverage_name: string | null; doctor_id: string | null;
  preferred_date: string | null; preferred_time_band: string | null;
  alternative_date: string | null; alternative_time_band: string | null;
  status: (typeof statuses)[number][0]; created_at: string;
};

export type PanelDoctor = {
  id: string; full_name: string; registration_number: string | null; description: string | null;
  availability_summary: string | null; slot_minutes: number; active: boolean; display_order: number;
  blocks: (AvailabilityBlock & { id: string })[];
};

export type StaffMember = {
  id: string; username: string | null; full_name: string | null; role: string;
  active: boolean; must_change_password: boolean; can_manage_staff: boolean;
};

export type PasswordResetRequest = {
  id: string; username: string; status: "pending" | "done"; notified: boolean; created_at: string;
};

const roleLabels: Record<string, string> = {
  administrator: "Administración", reception: "Recepción", operator: "Consulta",
};

const careLabels: Record<string, string> = {
  first_consultation: "Primera consulta", follow_up: "Control", study: "Estudio", other_service: "Otro servicio",
};
const coverageLabels: Record<string, string> = {
  particular: "Particular", obra_social: "Obra social", prepaga: "Prepaga",
};

const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });
const statusLabel = (status: string) => statuses.find(([value]) => value === status)?.[1] ?? status;
const formatDate = (date: string | null) => (date ? dateFormat.format(new Date(`${date}T12:00:00`)) : "A coordinar");

const today = () => toIsoDate(new Date());
const firstOfMonth = () => { const now = new Date(); return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)); };
const lastOfMonth = () => { const now = new Date(); return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)); };

export default function EmployeeDashboardClient({
  profile, initialRequests, initialDoctors, initialStaff = [], initialResets = [],
}: {
  profile: { fullName: string; username?: string; role: string; canManageStaff?: boolean };
  initialRequests: AppointmentRequest[];
  initialDoctors: PanelDoctor[];
  initialStaff?: StaffMember[];
  initialResets?: PasswordResetRequest[];
}) {
  const [section, setSection] = useState<"resumen" | "estadisticas" | "reservas" | "medicos" | "accesos">("resumen");
  const [requests, setRequests] = useState(initialRequests);
  const [doctors, setDoctors] = useState(initialDoctors);
  const [resets, setResets] = useState(initialResets);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const isAdministrator = profile.role === "administrator";

  const doctorNames = useMemo(
    () => Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor.full_name])),
    [doctors],
  );

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-AR");
    return requests.filter((request) =>
      (filter === "all" || request.status === filter) &&
      (!query || [request.request_code, request.first_name, request.last_name, request.dni, request.phone]
        .join(" ").toLocaleLowerCase("es-AR").includes(query)));
  }, [filter, requests, search]);

  async function updateStatus(id: string, status: AppointmentRequest["status"]) {
    const before = requests; setSavingId(id); setMessage("");
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
    try {
      const { error } = await createBrowserSupabaseClient().from("appointment_requests").update({ status }).eq("id", id);
      if (error) throw error;
      setMessage("Reserva actualizada correctamente.");
    } catch {
      setRequests(before);
      setMessage("No se pudo guardar el cambio. Intentá de nuevo.");
    } finally { setSavingId(null); }
  }

  async function toggleDoctor(doctor: PanelDoctor) {
    const before = doctors; setSavingId(doctor.id); setMessage("");
    setDoctors((current) => current.map((item) => (item.id === doctor.id ? { ...item, active: !item.active } : item)));
    try {
      const { error } = await createBrowserSupabaseClient().from("doctors").update({ active: !doctor.active }).eq("id", doctor.id);
      if (error) throw error;
      setMessage(doctor.active ? `${doctor.full_name} quedó fuera de agenda.` : `${doctor.full_name} volvió a estar disponible.`);
    } catch {
      setDoctors(before);
      setMessage("No se pudo actualizar el profesional. Verificá que ingresaste como administrador.");
    } finally { setSavingId(null); }
  }

  async function updateSlotMinutes(doctor: PanelDoctor, slotMinutes: number) {
    const before = doctors; setSavingId(doctor.id); setMessage("");
    setDoctors((current) => current.map((item) => (item.id === doctor.id ? { ...item, slot_minutes: slotMinutes } : item)));
    try {
      const { error } = await createBrowserSupabaseClient().from("doctors").update({ slot_minutes: slotMinutes }).eq("id", doctor.id);
      if (error) throw error;
      setMessage(`Los turnos de ${doctor.full_name} pasan a durar ${slotMinutes} minutos.`);
    } catch {
      setDoctors(before);
      setMessage("No se pudo cambiar la duración del turno.");
    } finally { setSavingId(null); }
  }

  async function addBlock(doctor: PanelDoctor, weekday: number, start: string, end: string) {
    setSavingId(doctor.id); setMessage("");
    try {
      const { data, error } = await createBrowserSupabaseClient()
        .from("doctor_availability")
        .insert({ doctor_id: doctor.id, weekday, start_time: start, end_time: end })
        .select("id, weekday, start_time, end_time")
        .single();
      if (error) throw error;
      setDoctors((current) => current.map((item) => (item.id === doctor.id
        ? {
            ...item,
            blocks: [...item.blocks, data as PanelDoctor["blocks"][number]]
              .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
          }
        : item)));
      setMessage(`Horario agregado a ${doctor.full_name}.`);
    } catch {
      setMessage("No se pudo agregar el horario. Revisá que no esté repetido y que hayas ingresado como administrador.");
    } finally { setSavingId(null); }
  }

  async function editBlock(doctor: PanelDoctor, blockId: string, weekday: number, start: string, end: string) {
    const before = doctors; setSavingId(doctor.id); setMessage("");
    setDoctors((current) => current.map((item) => (item.id === doctor.id
      ? {
          ...item,
          blocks: item.blocks
            .map((block) => (block.id === blockId ? { ...block, weekday, start_time: start, end_time: end } : block))
            .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
        }
      : item)));
    try {
      const { error } = await createBrowserSupabaseClient()
        .from("doctor_availability")
        .update({ weekday, start_time: start, end_time: end })
        .eq("id", blockId);
      if (error) throw error;
      setMessage(`Horario de ${doctor.full_name} actualizado.`);
    } catch {
      setDoctors(before);
      setMessage("No se pudo cambiar el horario. Revisá que no choque con otro ya cargado.");
    } finally { setSavingId(null); }
  }

  async function removeBlock(doctor: PanelDoctor, blockId: string) {
    const before = doctors; setSavingId(doctor.id); setMessage("");
    setDoctors((current) => current.map((item) => (item.id === doctor.id
      ? { ...item, blocks: item.blocks.filter((block) => block.id !== blockId) } : item)));
    try {
      const { error } = await createBrowserSupabaseClient().from("doctor_availability").delete().eq("id", blockId);
      if (error) throw error;
      setMessage("Horario eliminado.");
    } catch {
      setDoctors(before);
      setMessage("No se pudo eliminar el horario.");
    } finally { setSavingId(null); }
  }

  async function resolveReset(id: string) {
    const before = resets; setSavingId(id); setMessage("");
    setResets((current) => current.map((item) => (item.id === id ? { ...item, status: "done" } : item)));
    try {
      const { error } = await createBrowserSupabaseClient()
        .from("password_reset_requests")
        .update({ status: "done", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setMessage("Pedido marcado como resuelto.");
    } catch {
      setResets(before);
      setMessage("No se pudo marcar el pedido.");
    } finally { setSavingId(null); }
  }

  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut();
    window.location.assign("/empleados/acceso");
  }

  const pendingResets = resets.filter((item) => item.status === "pending").length;

  return (
    <main className="employee-dashboard">
      <header className="employee-header">
        <a className="dashboard-logo" href="/" aria-label="Volver al sitio público">
          <img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" />
        </a>
        <div className="employee-intro">
          <p>Panel de empleados</p>
          <h1>Gestión de turnos</h1>
          <small>Hola, {profile.fullName} · {profile.role}</small>
        </div>
        <button type="button" className="sign-out" onClick={signOut}>Cerrar sesión</button>
      </header>

      <nav className="panel-tabs" aria-label="Secciones del panel">
        <button className={section === "resumen" ? "active" : ""} onClick={() => setSection("resumen")}>Resumen</button>
        <button className={section === "estadisticas" ? "active" : ""} onClick={() => setSection("estadisticas")}>Estadísticas</button>
        <button className={section === "reservas" ? "active" : ""} onClick={() => setSection("reservas")}>
          Reservas <span>{requests.length}</span>
        </button>
        <button className={section === "medicos" ? "active" : ""} onClick={() => setSection("medicos")}>
          Médicos <span>{doctors.filter((doctor) => doctor.active).length}/{doctors.length}</span>
        </button>
        {isAdministrator && (
          <button className={section === "accesos" ? "active" : ""} onClick={() => setSection("accesos")}>
            Accesos{pendingResets > 0 && <span className="badge-alert">{pendingResets}</span>}
          </button>
        )}
      </nav>

      {message && <p className="dashboard-message" role="status">{message}</p>}

      {section === "resumen" && <Summary requests={requests} doctorNames={doctorNames} />}

      {section === "estadisticas" && <PanelStats requests={requests} doctorNames={doctorNames} />}

      {section === "reservas" && (
        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div><p className="eyebrow">Bandeja de trabajo</p><h2>Reservas y solicitudes</h2></div>
            <a href="/#turnos" className="new-request-link">Ver formulario público ↗</a>
          </div>

          <ExportBar requests={requests} doctorNames={doctorNames} />

          <div className="request-controls">
            <label className="request-search">Buscar
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paciente, DNI, teléfono o código" />
            </label>
            <label>Estado
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Todos los estados</option>
                {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          {!visibleRequests.length ? (
            <div className="empty-requests">
              <strong>No hay reservas para mostrar.</strong>
              <p>Cuando un paciente complete el formulario web, aparecerá acá.</p>
            </div>
          ) : (
            <div className="request-table" role="region" aria-label="Reservas" tabIndex={0}>
              <table>
                <thead>
                  <tr><th>Paciente</th><th>Solicitud</th><th>Turno pedido</th><th>Profesional</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.first_name} {request.last_name}</strong>
                        <small>DNI {request.dni}<br />{request.phone}</small>
                      </td>
                      <td>
                        <strong>{request.request_code}</strong>
                        <small>{dateFormat.format(new Date(request.created_at))}</small>
                      </td>
                      <td>
                        <strong>{formatDate(request.preferred_date)}</strong>
                        <small>{request.preferred_time_band || "Sin horario"}</small>
                      </td>
                      <td>
                        <strong>{request.doctor_id ? doctorNames[request.doctor_id] ?? "Sin asignar" : "Primer disponible"}</strong>
                        <small>
                          {careLabels[request.care_type] ?? request.care_type} · {request.coverage_name || coverageLabels[request.coverage_kind] || request.coverage_kind}
                        </small>
                      </td>
                      <td>
                        <select
                          className={`status-select status-${request.status}`}
                          value={request.status}
                          disabled={savingId === request.id}
                          onChange={(event) => updateStatus(request.id, event.target.value as AppointmentRequest["status"])}
                        >
                          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {section === "medicos" && (
        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <p className="eyebrow">Agenda clínica</p>
              <h2>Médicos y disponibilidad</h2>
              <p className="section-description">
                Los días y horarios que cargues acá son los únicos que el paciente puede elegir en el
                formulario público. Un profesional sin horarios cargados se muestra como rotativo.
              </p>
            </div>
          </div>
          <div className="employee-doctor-grid">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                isAdministrator={isAdministrator}
                saving={savingId === doctor.id}
                onToggle={() => toggleDoctor(doctor)}
                onSlotMinutes={(minutes) => updateSlotMinutes(doctor, minutes)}
                onAddBlock={(weekday, start, end) => addBlock(doctor, weekday, start, end)}
                onEditBlock={(blockId, weekday, start, end) => editBlock(doctor, blockId, weekday, start, end)}
                onRemoveBlock={(blockId) => removeBlock(doctor, blockId)}
              />
            ))}
          </div>
        </section>
      )}

      {section === "accesos" && isAdministrator && (
        <section className="dashboard-card">
          <div className="dashboard-card-heading">
            <div>
              <p className="eyebrow">Cuentas del personal</p>
              <h2>Accesos</h2>
              <p className="section-description">
                Las contraseñas se guardan cifradas: no se pueden ver ni reenviar. Para devolverle el
                acceso a alguien hay que restablecerle la contraseña temporal desde Supabase; el
                sistema le va a exigir elegir una nueva apenas entre.
              </p>
            </div>
          </div>

          <h3 className="access-subtitle">Pedidos de recuperación</h3>
          {!resets.length ? (
            <p className="summary-empty">No hay pedidos.</p>
          ) : (
            <ul className="reset-list">
              {resets.map((item) => (
                <li key={item.id} className={item.status === "pending" ? "reset-pending" : ""}>
                  <div>
                    <b>{item.username}</b>
                    <small>
                      {dateFormat.format(new Date(item.created_at))}
                      {item.notified ? " · avisado por correo" : " · sin aviso por correo"}
                    </small>
                  </div>
                  {item.status === "pending" ? (
                    <button type="button" disabled={savingId === item.id} onClick={() => resolveReset(item.id)}>
                      Marcar resuelto
                    </button>
                  ) : (
                    <span className="reset-done">Resuelto</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="access-subtitle">Equipo con acceso</h3>
          {!initialStaff.length ? (
            <p className="summary-empty">No se pudo leer el listado del equipo.</p>
          ) : (
            <div className="request-table" role="region" aria-label="Cuentas del personal" tabIndex={0}>
              <table>
                <thead><tr><th>Usuario</th><th>Nombre</th><th>Permisos</th><th>Estado</th><th>Contraseña</th></tr></thead>
                <tbody>
                  {initialStaff.map((member) => (
                    <tr key={member.id}>
                      <td><strong>{member.username ?? "—"}</strong></td>
                      <td><strong>{member.full_name ?? "—"}</strong></td>
                      <td>
                        <strong>{roleLabels[member.role] ?? member.role}</strong>
                        {member.can_manage_staff && <small>Acceso total</small>}
                      </td>
                      <td><strong>{member.active ? "Activo" : "Inactivo"}</strong></td>
                      <td>
                        <strong>{member.must_change_password ? "Temporal" : "Propia"}</strong>
                        {member.must_change_password && <small>todavía no la cambió</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

/* ── Resumen ─────────────────────────────────────────────────────────────── */

function Summary({ requests, doctorNames }: { requests: AppointmentRequest[]; doctorNames: Record<string, string> }) {
  const stats = useMemo(() => {
    const now = today();
    const monthStart = firstOfMonth();
    const byStatus = statuses.map(([value, label]) => ({
      value, label, count: requests.filter((request) => request.status === value).length,
    }));
    const byDoctor = Object.entries(
      requests.reduce<Record<string, number>>((acc, request) => {
        const key = request.doctor_id ? doctorNames[request.doctor_id] ?? "Sin asignar" : "Primer disponible";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);

    const upcoming: { date: string; items: AppointmentRequest[] }[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date();
      day.setDate(day.getDate() + offset);
      const iso = toIsoDate(day);
      const items = requests.filter((request) =>
        request.preferred_date === iso && request.status !== "cancelled" && request.status !== "rejected");
      if (items.length) upcoming.push({ date: iso, items });
    }

    return {
      today: requests.filter((request) => request.preferred_date === now).length,
      month: requests.filter((request) => request.created_at.slice(0, 10) >= monthStart).length,
      pending: requests.filter((request) => pendingStatuses.includes(request.status)).length,
      confirmed: requests.filter((request) => request.status === "confirmed").length,
      byStatus, byDoctor, upcoming,
    };
  }, [requests, doctorNames]);

  const maxStatus = Math.max(1, ...stats.byStatus.map((item) => item.count));

  return (
    <>
      <section className="dashboard-summary" aria-label="Resumen del día">
        <article className="tone-navy"><span>Turnos para hoy</span><strong>{stats.today}</strong><small>pedidos con fecha de hoy</small></article>
        <article className="tone-blue"><span>Pendientes</span><strong>{stats.pending}</strong><small>para revisar o coordinar</small></article>
        <article><span>Confirmadas</span><strong>{stats.confirmed}</strong><small>turnos ya asignados</small></article>
        <article><span>Este mes</span><strong>{stats.month}</strong><small>solicitudes recibidas</small></article>
      </section>

      <div className="summary-grid">
        <section className="dashboard-card">
          <h2>Próximos siete días</h2>
          {!stats.upcoming.length ? (
            <p className="summary-empty">No hay turnos pedidos para esta semana.</p>
          ) : (
            <ul className="summary-days">
              {stats.upcoming.map((day) => (
                <li key={day.date}>
                  <b>{formatDate(day.date)}</b>
                  <span>{day.items.length} {day.items.length === 1 ? "turno" : "turnos"}</span>
                  <small>{day.items.map((item) => `${item.preferred_time_band || "s/h"} ${item.last_name}`).join(" · ")}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-card">
          <h2>Por estado</h2>
          <ul className="summary-bars">
            {stats.byStatus.map((item) => (
              <li key={item.value}>
                <b>{item.label}</b>
                <i aria-hidden="true"><em style={{ width: `${(item.count / maxStatus) * 100}%` }} /></i>
                <span>{item.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-card">
          <h2>Por profesional</h2>
          {!stats.byDoctor.length ? (
            <p className="summary-empty">Todavía no hay solicitudes.</p>
          ) : (
            <ul className="summary-list">
              {stats.byDoctor.map(([name, count]) => (
                <li key={name}><b>{name}</b><span>{count}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/* ── Exportación ─────────────────────────────────────────────────────────── */

function ExportBar({ requests, doctorNames }: { requests: AppointmentRequest[]; doctorNames: Record<string, string> }) {
  const [range, setRange] = useState<"today" | "month" | "custom">("today");
  const [basis, setBasis] = useState<"preferred_date" | "created_at">("preferred_date");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  const [since, until] = range === "today" ? [today(), today()]
    : range === "month" ? [firstOfMonth(), lastOfMonth()]
    : [from, to];

  const selected = useMemo(() => requests.filter((request) => {
    const value = basis === "preferred_date" ? request.preferred_date : request.created_at.slice(0, 10);
    return Boolean(value) && value! >= since && value! <= until;
  }), [requests, basis, since, until]);

  const rows: ExportRow[] = selected.map((request) => ({
    "Código": request.request_code,
    "Estado": statusLabel(request.status),
    "Paciente": `${request.last_name}, ${request.first_name}`,
    "DNI": request.dni,
    "Teléfono": request.phone,
    "Correo": request.email ?? "",
    "Atención": careLabels[request.care_type] ?? request.care_type,
    "Profesional": request.doctor_id ? doctorNames[request.doctor_id] ?? "Sin asignar" : "Primer disponible",
    "Cobertura": request.coverage_name || coverageLabels[request.coverage_kind] || request.coverage_kind,
    "Fecha del turno": request.preferred_date ? formatDate(request.preferred_date) : "A coordinar",
    "Horario": request.preferred_time_band ?? "",
    "2ª fecha": request.alternative_date ? formatDate(request.alternative_date) : "",
    "2º horario": request.alternative_time_band ?? "",
    "Recibida": dateFormat.format(new Date(request.created_at)),
  }));

  const rangeLabel = range === "today" ? `Día ${formatDate(since)}`
    : range === "month" ? `Mes en curso · ${formatDate(since)} a ${formatDate(until)}`
    : `Del ${formatDate(since)} al ${formatDate(until)}`;
  const basisLabel = basis === "preferred_date" ? "por fecha del turno" : "por fecha de solicitud";
  const filename = `reservas-${since}${since === until ? "" : `-al-${until}`}`;

  return (
    <div className="export-bar">
      <div className="export-fields">
        <label>Período
          <select value={range} onChange={(event) => setRange(event.target.value as typeof range)}>
            <option value="today">Hoy</option>
            <option value="month">Este mes</option>
            <option value="custom">Elegir días</option>
          </select>
        </label>
        <label>Según
          <select value={basis} onChange={(event) => setBasis(event.target.value as typeof basis)}>
            <option value="preferred_date">Fecha del turno</option>
            <option value="created_at">Fecha de solicitud</option>
          </select>
        </label>
        {range === "custom" && (
          <>
            <label>Desde<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>Hasta<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          </>
        )}
      </div>
      <div className="export-actions">
        <span className="export-count">{selected.length} {selected.length === 1 ? "reserva" : "reservas"}</span>
        <button type="button" className="export-button" disabled={!selected.length}
          onClick={() => downloadSpreadsheet(rows, `${filename}.csv`)}>
          Descargar Excel
        </button>
        <button type="button" className="export-button export-pdf" disabled={!selected.length}
          onClick={() => printSheet(`Reservas · ${rangeLabel}`, `Listado ${basisLabel}`, rows)}>
          Descargar PDF
        </button>
      </div>
    </div>
  );
}

/* ── Ficha de médico ─────────────────────────────────────────────────────── */

function DoctorCard({
  doctor, isAdministrator, saving, onToggle, onSlotMinutes, onAddBlock, onEditBlock, onRemoveBlock,
}: {
  doctor: PanelDoctor;
  isAdministrator: boolean;
  saving: boolean;
  onToggle: () => void;
  onSlotMinutes: (minutes: number) => void;
  onAddBlock: (weekday: number, start: string, end: string) => void;
  onEditBlock: (blockId: string, weekday: number, start: string, end: string) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  // Cuando hay un bloque en edición, el mismo formulario sirve para modificarlo.
  const [editingId, setEditingId] = useState<string | null>(null);
  const invalidRange = end <= start;

  function startEditing(block: PanelDoctor["blocks"][number]) {
    setEditingId(block.id);
    setWeekday(block.weekday);
    setStart(block.start_time.slice(0, 5));
    setEnd(block.end_time.slice(0, 5));
  }

  function cancelEditing() {
    setEditingId(null);
    setWeekday(1); setStart("09:00"); setEnd("12:00");
  }

  function submit() {
    if (editingId) { onEditBlock(editingId, weekday, start, end); cancelEditing(); }
    else onAddBlock(weekday, start, end);
  }

  return (
    <article className={`doctor-card ${doctor.active ? "" : "doctor-inactive"}`}>
      <header>
        <p className="doctor-status">{doctor.active ? "Disponible" : "Fuera de agenda"}</p>
        <h3>{doctor.full_name}</h3>
        {doctor.registration_number && <small>Matrícula {doctor.registration_number}</small>}
        <p className="doctor-agenda">
          {!doctor.active
            ? "Fuera de agenda: no aparece en el sitio público ni en el formulario de turnos. Su historial se conserva."
            : doctor.blocks.length
              ? formatBlocks(doctor.blocks)
              : "Horarios rotativos: el formulario público no ofrece fechas para este profesional hasta que cargues su agenda."}
        </p>
      </header>

      {doctor.blocks.length > 0 && (
        <div className="doctor-blocks">
          {doctor.blocks.map((block) => {
            const etiqueta = `${weekdayNames[block.weekday - 1]} de ${block.start_time.slice(0, 5)} a ${block.end_time.slice(0, 5)}`;
            return (
              <span className={`doctor-block${editingId === block.id ? " editing" : ""}`} key={block.id}>
                {isAdministrator ? (
                  <button type="button" className="block-label" disabled={saving}
                    onClick={() => (editingId === block.id ? cancelEditing() : startEditing(block))}
                    aria-label={`Cambiar el horario del ${etiqueta}`}>
                    {weekdayNames[block.weekday - 1]} {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}
                  </button>
                ) : (
                  <span>{weekdayNames[block.weekday - 1]} {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}</span>
                )}
                {isAdministrator && (
                  <button type="button" className="block-remove" disabled={saving}
                    onClick={() => { if (editingId === block.id) cancelEditing(); onRemoveBlock(block.id); }}
                    aria-label={`Quitar el ${etiqueta}`}>×</button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {isAdministrator ? (
        <div className="doctor-admin">
          <div className="doctor-add-block">
            <label>Día
              <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
                {[1, 2, 3, 4, 5].map((day) => <option key={day} value={day}>{weekdayNames[day - 1]}</option>)}
              </select>
            </label>
            <label>Desde<input type="time" step="900" value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label>Hasta<input type="time" step="900" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
            <button type="button" disabled={saving || invalidRange} onClick={submit}>
              {editingId ? "Guardar" : "Agregar"}
            </button>
            {editingId && (
              <button type="button" className="block-cancel" disabled={saving} onClick={cancelEditing}>Cancelar</button>
            )}
          </div>
          {editingId
            ? <p className="doctor-hint">Estás cambiando un horario ya cargado. Guardá para aplicarlo.</p>
            : doctor.blocks.length > 0 && <p className="doctor-hint">Tocá un horario de arriba para modificarlo.</p>}
          {invalidRange && <p className="doctor-warning">La hora de fin tiene que ser posterior a la de inicio.</p>}

          <div className="doctor-controls">
            <label>Duración del turno
              <select value={doctor.slot_minutes} disabled={saving} onChange={(event) => onSlotMinutes(Number(event.target.value))}>
                {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
              </select>
            </label>
            <button type="button" disabled={saving}
              className={doctor.active ? "doctor-toggle pause" : "doctor-toggle enable"} onClick={onToggle}>
              {saving ? "Guardando…" : doctor.active ? "Sacar de agenda" : "Volver a agenda"}
            </button>
          </div>
        </div>
      ) : (
        <small className="doctor-readonly">Solo un administrador puede modificar la agenda.</small>
      )}
    </article>
  );
}
