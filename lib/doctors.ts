import { createPublicApiClient } from "@/lib/supabase/server";
import { formatBlocks, type AvailabilityBlock, type PublicDoctor } from "@/lib/availability";
import { doctors as staticDoctors } from "@/app/site-data";

const defaultRole = "Profesional de Clínica de Ojos";

/** Si Supabase no está disponible el sitio sigue mostrando el equipo, solo que
 *  sin agenda: el formulario cae a los horarios generales de la clínica. */
function fallback(): PublicDoctor[] {
  return staticDoctors.map((doctor) => ({
    name: doctor.name,
    role: doctor.role,
    schedule: doctor.schedule,
    slotMinutes: 30,
    blocks: [],
    taken: [],
  }));
}

export async function loadPublicDoctors(): Promise<PublicDoctor[]> {
  const client = createPublicApiClient();
  if (!client) return fallback();

  // Solo devuelve profesional, día y hora: ningún dato del paciente.
  const { data: taken } = await client.rpc("taken_slots");
  const tomadosPorMedico = new Map<string, string[]>();
  for (const fila of (taken ?? []) as { doctor_id: string; slot_date: string; slot_time: string }[]) {
    const lista = tomadosPorMedico.get(fila.doctor_id) ?? [];
    lista.push(`${fila.slot_date} ${fila.slot_time.slice(0, 5)}`);
    tomadosPorMedico.set(fila.doctor_id, lista);
  }

  const { data, error } = await client
    .from("doctors")
    .select("id, full_name, description, availability_summary, slot_minutes, display_order, doctor_availability(weekday, start_time, end_time, active)")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) return fallback();

  return data.map((row) => {
    const blocks: AvailabilityBlock[] = ((row.doctor_availability ?? []) as (AvailabilityBlock & { active: boolean })[])
      .filter((block) => block.active)
      .map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }));

    return {
      name: row.full_name as string,
      role: (row.description as string | null) || defaultRole,
      schedule: (row.availability_summary as string | null)
        || (blocks.length ? formatBlocks(blocks) : "Consultá disponibilidad por WhatsApp."),
      slotMinutes: (row.slot_minutes as number | null) ?? 30,
      blocks,
      taken: tomadosPorMedico.get(row.id as string) ?? [],
    };
  });
}
