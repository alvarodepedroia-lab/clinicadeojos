"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const statuses = [["new", "Nueva"], ["under_review", "En revisión"], ["entered_in_isalud", "Cargada en iSalud"], ["confirmed", "Confirmada"], ["reschedule_requested", "Reprogramar"], ["rejected", "Rechazada"], ["cancelled", "Cancelada"]] as const;

export type AppointmentRequest = { id: string; request_code: string; first_name: string; last_name: string; dni: string; phone: string; email: string | null; care_type: string; coverage_kind: string; coverage_name: string | null; preferred_date: string | null; preferred_time_band: string | null; alternative_date: string | null; alternative_time_band: string | null; status: (typeof statuses)[number][0]; created_at: string };
export type Doctor = { id: string; full_name: string; registration_number: string | null; description: string | null; active: boolean; display_order: number };

const careLabels: Record<string, string> = { first_consultation: "Primera consulta", follow_up: "Control", study: "Estudio", other_service: "Otro servicio" };
const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });
const statusLabel = (status: string) => statuses.find(([value]) => value === status)?.[1] ?? status;
const formatDate = (date: string | null) => date ? dateFormat.format(new Date(`${date}T12:00:00`)) : "A coordinar";

export default function EmployeeDashboardClient({ profile, initialRequests, initialDoctors }: { profile: { fullName: string; role: string }; initialRequests: AppointmentRequest[]; initialDoctors: Doctor[] }) {
  const [section, setSection] = useState<"reservas" | "medicos">("reservas");
  const [requests, setRequests] = useState(initialRequests);
  const [doctors, setDoctors] = useState(initialDoctors);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const isAdministrator = profile.role === "administrator";

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-AR");
    return requests.filter((request) => (filter === "all" || request.status === filter) && (!query || [request.request_code, request.first_name, request.last_name, request.dni, request.phone].join(" ").toLocaleLowerCase("es-AR").includes(query)));
  }, [filter, requests, search]);
  const pendingCount = requests.filter((request) => ["new", "under_review", "reschedule_requested"].includes(request.status)).length;
  const confirmedCount = requests.filter((request) => request.status === "confirmed").length;

  async function updateStatus(id: string, status: AppointmentRequest["status"]) {
    const before = requests; setSavingId(id); setMessage("");
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    try {
      const { error } = await createBrowserSupabaseClient().from("appointment_requests").update({ status }).eq("id", id);
      if (error) throw error;
      setMessage("Reserva actualizada correctamente.");
    } catch { setRequests(before); setMessage("No se pudo guardar el cambio. Intentá de nuevo."); }
    finally { setSavingId(null); }
  }

  async function toggleDoctor(doctor: Doctor) {
    const before = doctors; setSavingId(doctor.id); setMessage("");
    setDoctors((current) => current.map((item) => item.id === doctor.id ? { ...item, active: !item.active } : item));
    try {
      const { error } = await createBrowserSupabaseClient().from("doctors").update({ active: !doctor.active }).eq("id", doctor.id);
      if (error) throw error;
      setMessage(doctor.active ? `${doctor.full_name} quedó fuera de agenda.` : `${doctor.full_name} volvió a estar disponible.`);
    } catch { setDoctors(before); setMessage("No se pudo actualizar el profesional. Verificá que ingresaste como administrador."); }
    finally { setSavingId(null); }
  }

  async function signOut() { await createBrowserSupabaseClient().auth.signOut(); window.location.assign("/empleados/acceso"); }

  return <main className="employee-dashboard">
    <header className="employee-header"><a className="dashboard-logo" href="/" aria-label="Volver al sitio público"><img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" /></a><div className="employee-intro"><p>Panel de empleados</p><h1>Gestión de turnos</h1><small>Hola, {profile.fullName} · {profile.role}</small></div><button type="button" className="sign-out" onClick={signOut}>Cerrar sesión</button></header>
    <section className="dashboard-summary" aria-label="Resumen de solicitudes"><article><span>Total</span><strong>{requests.length}</strong><small>solicitudes recibidas</small></article><article><span>Pendientes</span><strong>{pendingCount}</strong><small>para revisar o coordinar</small></article><article><span>Confirmadas</span><strong>{confirmedCount}</strong><small>turnos ya asignados</small></article></section>
    <nav className="panel-tabs" aria-label="Secciones del panel"><button className={section === "reservas" ? "active" : ""} onClick={() => setSection("reservas")}>Reservas <span>{requests.length}</span></button><button className={section === "medicos" ? "active" : ""} onClick={() => setSection("medicos")}>Médicos <span>{doctors.filter((doctor) => doctor.active).length}/{doctors.length}</span></button></nav>
    {message && <p className="dashboard-message" role="status">{message}</p>}
    {section === "reservas" ? <section className="dashboard-card"><div className="dashboard-card-heading"><div><p className="eyebrow">Bandeja de trabajo</p><h2>Reservas y solicitudes</h2></div><a href="/#turnos" className="new-request-link">Ver formulario público ↗</a></div><div className="request-controls"><label className="request-search">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paciente, DNI, teléfono o código" /></label><label>Estado<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos los estados</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>{!visibleRequests.length ? <div className="empty-requests"><strong>No hay reservas para mostrar.</strong><p>Cuando un paciente complete el formulario web, aparecerá aquí.</p></div> : <div className="request-table" role="region" aria-label="Reservas" tabIndex={0}><table><thead><tr><th>Paciente</th><th>Solicitud</th><th>Preferencia</th><th>Atención</th><th>Estado</th></tr></thead><tbody>{visibleRequests.map((request) => <tr key={request.id}><td><strong>{request.first_name} {request.last_name}</strong><small>DNI {request.dni}<br />{request.phone}</small></td><td><strong>{request.request_code}</strong><small>{dateFormat.format(new Date(request.created_at))}</small></td><td><strong>{formatDate(request.preferred_date)}</strong><small>{request.preferred_time_band || "Sin franja horaria"}</small></td><td><strong>{careLabels[request.care_type] ?? request.care_type}</strong><small>{request.coverage_name || request.coverage_kind}</small></td><td><select className={`status-select status-${request.status}`} value={request.status} disabled={savingId === request.id} onChange={(event) => updateStatus(request.id, event.target.value as AppointmentRequest["status"])}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table></div>}</section> : <section className="dashboard-card"><div className="dashboard-card-heading"><div><p className="eyebrow">Agenda clínica</p><h2>Médicos disponibles</h2><p className="section-description">Desactivá temporalmente a un profesional para que no aparezca en la agenda pública.</p></div></div><div className="doctor-grid">{doctors.map((doctor) => <article className={`doctor-card ${doctor.active ? "" : "doctor-inactive"}`} key={doctor.id}><div><p className="doctor-status">{doctor.active ? "Disponible" : "Fuera de agenda"}</p><h3>{doctor.full_name}</h3>{doctor.registration_number && <small>Matrícula {doctor.registration_number}</small>}{doctor.description && <p>{doctor.description}</p>}</div>{isAdministrator ? <button type="button" disabled={savingId === doctor.id} className={doctor.active ? "doctor-toggle pause" : "doctor-toggle enable"} onClick={() => toggleDoctor(doctor)}>{savingId === doctor.id ? "Guardando…" : doctor.active ? "Sacar de agenda" : "Volver a agenda"}</button> : <small>Solo un administrador puede modificar la agenda.</small>}</article>)}</div></section>}
  </main>;
}
