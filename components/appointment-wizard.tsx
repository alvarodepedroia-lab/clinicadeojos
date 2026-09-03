"use client";

import { useMemo, useState } from "react";
import {
  clinicHours,
  formatDateLabel,
  freeSlots,
  toMinutes,
  toTimeLabel,
  upcomingDates,
  weekdaysWithAgenda,
  type AvailabilityBlock,
  type PublicDoctor,
} from "@/lib/availability";

/** Horarios generales de la clínica, para cuando el paciente no elige profesional. */
function clinicSlots() {
  const slots: string[] = [];
  for (let minute = toMinutes(clinicHours.start); minute + 30 <= toMinutes(clinicHours.end); minute += 30) {
    slots.push(toTimeLabel(minute));
  }
  return slots;
}

export function AppointmentWizard({ doctors }: { doctors: PublicDoctor[] }) {
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState("");

  const doctor = doctors.find((item) => item.name === doctorName);
  // Sin profesional elegido, se mira la agenda de todo el equipo: alcanza con
  // que uno tenga el horario libre.
  const equipo = useMemo(() => (doctor ? [doctor] : doctors), [doctor, doctors]);
  const blocks: AvailabilityBlock[] = useMemo(() => equipo.flatMap((item) => item.blocks), [equipo]);
  // Un profesional cargado pero sin bloques es un caso real: horarios rotativos.
  const rotating = Boolean(doctor) && blocks.length === 0;
  const openDays = useMemo(() => weekdaysWithAgenda(blocks), [blocks]);

  // Solo se ofrecen los días que todavía tienen algún horario sin reservar.
  const availableDates = useMemo(() => {
    const candidatas = upcomingDates(openDays.length ? openDays : clinicHours.weekdays);
    if (!blocks.length) return candidatas;
    return candidatas.filter((isoDate) => freeSlots(equipo, isoDate).length > 0);
  }, [openDays, blocks, equipo]);

  const slots = useMemo(() => {
    if (!date) return [];
    const libres = freeSlots(equipo, date);
    return libres.length || blocks.length ? libres : clinicSlots();
  }, [date, equipo, blocks]);

  return (
    <form className="appointment-wizard" action="/api/appointment-requests" method="post">
      <ol className="wizard-progress" aria-label="Pasos de la solicitud">
        {["Atención", "Cobertura", "Tu turno", "Tus datos"].map((label, index) => (
          <li className="active" key={label}><span>{index + 1}</span><b>{label}</b></li>
        ))}
      </ol>

      <fieldset>
        <legend>1. Tipo de atención</legend>
        <div className="field-grid">
          <label>¿Qué necesitás?
            <select name="careType" defaultValue="first_consultation">
              <option value="first_consultation">Primera consulta</option>
              <option value="follow_up">Consulta de control</option>
              <option value="study">Estudio</option>
              <option value="other_service">Otra prestación</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>2. Cobertura</legend>
        <div className="field-grid">
          <label>Tipo
            <select name="coverageKind" defaultValue="particular">
              <option value="particular">Particular</option>
              <option value="obra_social">Obra social</option>
              <option value="prepaga">Prepaga</option>
            </select>
          </label>
          <label>Empresa <small>Opcional</small><input name="coverageName" /></label>
          <label>Plan <small>Opcional</small><input name="coveragePlan" /></label>
          <label>Número de afiliado <small>Opcional</small><input name="memberNumber" /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>3. Tu turno</legend>
        <p className="wizard-help">
          Solo se muestran los horarios libres, hasta dos meses adelante. Al enviar la solicitud
          el turno queda reservado a tu nombre.
        </p>

        <div className={`booking-row${rotating ? " booking-row-single" : ""}`}>
          <label>Profesional
            <select
              name="doctorName"
              value={doctorName}
              onChange={(event) => { setDoctorName(event.target.value); setDate(""); }}
            >
              <option value="">Primer médico disponible</option>
              {doctors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>

          {!rotating && (
            <>
              <label>Día
                <select name="preferredDate" value={date} required onChange={(event) => setDate(event.target.value)}>
                  <option value="">Elegí un día</option>
                  {availableDates.map((isoDate) => (
                    <option key={isoDate} value={isoDate}>{formatDateLabel(isoDate)}</option>
                  ))}
                </select>
              </label>

              <label>Horario
                <select name="preferredTimeBand" required disabled={!date || !slots.length} defaultValue="">
                  <option value="">
                    {!date ? "Elegí el día" : slots.length ? "Elegí un horario" : "Sin horarios libres"}
                  </option>
                  {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </label>
            </>
          )}
        </div>

        {rotating && (
          <p className="wizard-notice" role="status">
            {doctor?.name} atiende con horarios rotativos. Enviá tus datos y la clínica se comunica
            con vos para coordinar el día y la hora.
          </p>
        )}
        {!rotating && doctor && <p className="wizard-help booking-note">Atiende: {doctor.schedule}</p>}
      </fieldset>

      <fieldset>
        <legend>4. Tus datos</legend>
        <div className="field-grid">
          <label>Nombre<input name="firstName" required /></label>
          <label>Apellido<input name="lastName" required /></label>
          <label>DNI<input name="dni" inputMode="numeric" pattern="[0-9]{7,9}" required /></label>
          <label>Teléfono<input name="phone" inputMode="tel" required /></label>
          <label>Correo electrónico <small>Opcional</small><input name="email" type="email" /></label>
          <label>Fecha de nacimiento <small>Opcional</small><input name="birthDate" type="date" /></label>
        </div>
        <input type="hidden" name="returningPatient" value="false" />
      </fieldset>

      <div className="wizard-actions">
        <button className="button" type="submit">Enviar solicitud</button>
      </div>
    </form>
  );
}
