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
  }));
}

export async function loadPublicDoctors(): Promise<PublicDoctor[]> {
  const client = createPublicApiClient();
  if (!client) return fallback();

  const { data, error } = await client
    .from("doctors")
    .select("full_name, description, availability_summary, slot_minutes, display_order, doctor_availability(weekday, start_time, end_time, active)")
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
    };
  });
}
