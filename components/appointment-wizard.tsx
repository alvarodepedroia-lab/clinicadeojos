"use client";

import { useMemo, useState } from "react";
import {
  clinicHours,
  formatDateLabel,
  isoWeekday,
  slotsForWeekday,
  toMinutes,
  toTimeLabel,
  upcomingDates,
  weekdaysWithAgenda,
  type AvailabilityBlock,
  type PublicDoctor,
} from "@/lib/availability";

const preferences = [
  { key: "preferred", label: "Opción principal", dateName: "preferredDate", timeName: "preferredTimeBand" },
  { key: "alternative", label: "Segunda alternativa", dateName: "alternativeDate", timeName: "alternativeTimeBand" },
  { key: "third", label: "Tercera alternativa", dateName: "thirdDate", timeName: "thirdTimeBand" },
] as const;

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
  const [dates, setDates] = useState<Record<string, string>>({});

  const doctor = doctors.find((item) => item.name === doctorName);
  // Sin profesional elegido, la agenda es la unión de todas las agendas activas.
  const blocks: AvailabilityBlock[] = useMemo(
    () => (doctor ? doctor.blocks : doctors.flatMap((item) => item.blocks)),
    [doctor, doctors],
  );
  const slotMinutes = doctor?.slotMinutes ?? 30;
  // Un profesional cargado pero sin bloques es un caso real: horarios rotativos.
  const rotating = Boolean(doctor) && blocks.length === 0;
  const openDays = useMemo(() => weekdaysWithAgenda(blocks), [blocks]);
  const availableDates = useMemo(
    () => upcomingDates(openDays.length ? openDays : clinicHours.weekdays),
    [openDays],
  );

  function slotsFor(isoDate?: string) {
    if (!isoDate) return [];
    const [year, month, day] = isoDate.split("-").map(Number);
    const weekday = isoWeekday(new Date(year, month - 1, day));
    const slots = slotsForWeekday(blocks, weekday, slotMinutes);
    return slots.length ? slots : clinicSlots();
  }

  function pickDate(key: string, value: string) {
    setDates((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="appointment-wizard" action="/api/appointment-requests" method="post">
      <ol className="wizard-progress" aria-label="Pasos de la solicitud">
        {["Atención", "Profesional", "Fecha y horario", "Tus datos"].map((label, index) => (
          <li className="active" key={label}><span>{index + 1}</span><b>{label}</b></li>
        ))}
      </ol>

      <fieldset>
        <legend>1. Atención y profesional</legend>
        <div className="field-grid">
          <label>Tipo de atención
            <select name="careType" defaultValue="first_consultation">
              <option value="first_consultation">Primera consulta</option>
              <option value="follow_up">Consulta de control</option>
              <option value="study">Estudio</option>
              <option value="other_service">Otra prestación</option>
            </select>
          </label>
          <label>Profesional <small>Opcional</small>
            <select name="doctorName" value={doctorName} onChange={(event) => { setDoctorName(event.target.value); setDates({}); }}>
              <option value="">Primer médico disponible</option>
              {doctors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
        </div>
        {doctor && !rotating && <p className="wizard-help">Atiende: {doctor.schedule}</p>}
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
        <legend>3. Fecha y horario</legend>
        {rotating ? (
          <p className="wizard-notice" role="status">
            {doctor?.name} atiende con horarios rotativos. Enviá tus datos y la clínica se comunica
            con vos para coordinar el día y la hora.
          </p>
        ) : (
          <>
            <p className="wizard-help">
              Solo se muestran los días y horarios en los que hay atención. La clínica confirma la
              disponibilidad antes de darte el turno.
            </p>
            <div className="preference-grid">
              {preferences.map((preference, index) => {
                const chosenDate = dates[preference.key] ?? "";
                const slots = slotsFor(chosenDate);
                return (
                  <div key={preference.key}>
                    <b>{preference.label}{index > 0 && <small> Opcional</small>}</b>
                    <label>Fecha
                      <select
                        name={preference.dateName}
                        value={chosenDate}
                        required={index === 0}
                        onChange={(event) => pickDate(preference.key, event.target.value)}
                      >
                        <option value="">Elegí una fecha</option>
                        {availableDates.map((isoDate) => (
                          <option key={isoDate} value={isoDate}>{formatDateLabel(isoDate)}</option>
                        ))}
                      </select>
                    </label>
                    <label>Horario
                      <select name={preference.timeName} required={index === 0} disabled={!chosenDate} defaultValue="">
                        <option value="">{chosenDate ? "Elegí un horario" : "Elegí primero la fecha"}</option>
                        {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        )}
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
