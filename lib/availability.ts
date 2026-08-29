/** Agenda médica compartida entre el formulario público, la API y el panel interno.
 *  Los días siguen la norma ISO: 1 = lunes ... 7 = domingo. */

export type AvailabilityBlock = { weekday: number; start_time: string; end_time: string };

export type PublicDoctor = {
  name: string;
  role: string;
  schedule: string;
  slotMinutes: number;
  blocks: AvailabilityBlock[];
};

/** Horario de atención de la clínica. Ningún turno puede caer fuera de esto. */
export const clinicHours: { weekdays: number[]; start: string; end: string } =
  { weekdays: [1, 2, 3, 4, 5], start: "08:30", end: "19:30" };

export const weekdayNames = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function isoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function toTimeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Horarios que se le ofrecen al paciente para un día concreto, recortados al
 *  horario de la clínica. Devuelve etiquetas "HH:MM". */
export function slotsForWeekday(blocks: AvailabilityBlock[], weekday: number, slotMinutes: number) {
  if (!clinicHours.weekdays.includes(weekday)) return [];
  const step = Math.max(5, slotMinutes || 30);
  const openAt = toMinutes(clinicHours.start);
  const closeAt = toMinutes(clinicHours.end);
  const slots = new Set<string>();

  for (const block of blocks.filter((item) => item.weekday === weekday)) {
    const from = Math.max(toMinutes(block.start_time), openAt);
    const until = Math.min(toMinutes(block.end_time), closeAt);
    for (let minute = from; minute + step <= until; minute += step) slots.add(toTimeLabel(minute));
  }
  return [...slots].sort();
}

/** Días de la semana en los que el profesional tiene agenda. */
export function weekdaysWithAgenda(blocks: AvailabilityBlock[]) {
  return [...new Set(blocks.map((block) => block.weekday))]
    .filter((weekday) => clinicHours.weekdays.includes(weekday))
    .sort((a, b) => a - b);
}

/** Hasta cuándo se puede pedir un turno desde la web. Más allá de dos meses la
 *  agenda todavía no está definida (licencias, rotaciones), así que no se ofrece. */
export const bookingMonthsAhead = 2;

function bookingWindow() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const from = new Date(today);
  from.setDate(today.getDate() + 1); // desde mañana: no se piden turnos para hoy
  const until = new Date(today);
  until.setMonth(until.getMonth() + bookingMonthsAhead);
  return { from, until };
}

export function withinBookingWindow(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(12, 0, 0, 0);
  const { from, until } = bookingWindow();
  return date >= from && date <= until;
}

/** Próximas fechas en las que atiende, dentro de la ventana de reserva. */
export function upcomingDates(weekdays: number[]) {
  if (!weekdays.length) return [] as string[];
  const dates: string[] = [];
  const { from, until } = bookingWindow();
  for (const cursor = new Date(from); cursor <= until; cursor.setDate(cursor.getDate() + 1)) {
    if (weekdays.includes(isoWeekday(cursor))) dates.push(toIsoDate(cursor));
  }
  return dates;
}

const listFormatter = new Intl.ListFormat("es-AR", { style: "long", type: "conjunction" });

/** Texto legible de la agenda: "Lunes, miércoles y viernes de 14:30 a 17:30. Martes de 08:30 a 11:30." */
export function formatBlocks(blocks: AvailabilityBlock[]) {
  const groups = new Map<string, number[]>();
  for (const block of [...blocks].sort((a, b) => a.weekday - b.weekday)) {
    const range = `${toTimeLabel(toMinutes(block.start_time))} a ${toTimeLabel(toMinutes(block.end_time))}`;
    groups.set(range, [...(groups.get(range) ?? []), block.weekday]);
  }
  const phrases = [...groups.entries()].map(([range, weekdays]) => {
    const names = weekdays.map((weekday) => weekdayNames[weekday - 1]);
    const label = listFormatter.format(names);
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} de ${range}.`;
  });
  return phrases.join(" ");
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });

/** "Lunes 1 de septiembre" a partir de una fecha ISO, sin corrimientos de zona horaria. */
export function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const label = dateFormatter.format(new Date(year, month - 1, day));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

/** Valida una preferencia contra la agenda real. Se usa también en el servidor,
 *  para que nadie pueda mandar una fecha inventada salteando el formulario. */
export function isValidPreference(
  blocks: AvailabilityBlock[],
  slotMinutes: number,
  isoDate?: string | null,
  time?: string | null,
) {
  if (!isoDate) return !time;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return false;
  if (!withinBookingWindow(isoDate)) return false;
  const weekday = isoWeekday(date);
  if (!blocks.length) return false;
  if (!weekdaysWithAgenda(blocks).includes(weekday)) return false;
  if (!time) return true;
  return slotsForWeekday(blocks, weekday, slotMinutes).includes(time.slice(0, 5));
}
