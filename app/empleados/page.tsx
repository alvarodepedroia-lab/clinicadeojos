import { redirect } from "next/navigation";
import EmployeeDashboardClient, {
  type AppointmentRequest, type PanelDoctor, type PasswordResetRequest, type StaffMember,
} from "@/components/employee-dashboard-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AvailabilityBlock } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <main className="employee-empty">
        <h1>Panel interno pendiente de configuración</h1>
        <p>Configurá las variables de Supabase para habilitar el acceso seguro de empleados.</p>
      </main>
    );
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/empleados/acceso");

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("full_name, role, active")
    .eq("id", userId)
    .maybeSingle();

  // Si la consulta falla (por ejemplo, una política mal escrita) el usuario
  // termina de vuelta en el login sin explicación. Que quede en los registros.
  if (profileError) console.error("[empleados] no se pudo leer el perfil:", profileError.message);
  if (!profile?.active) redirect("/empleados/acceso");

  // Columnas de la migración de cuentas. Si todavía no se corrió, el panel sigue
  // funcionando como antes en vez de dejar a todo el mundo afuera.
  const { data: account } = await supabase
    .from("staff_profiles")
    .select("username, must_change_password, can_manage_staff")
    .eq("id", userId)
    .maybeSingle();

  // Con la contraseña temporal todavía puesta no se entra al panel.
  if (account?.must_change_password) redirect("/empleados/cambiar-clave");

  const isAdministrator = profile.role === "administrator";

  const { data: requests } = await supabase
    .from("appointment_requests")
    .select("id, request_code, first_name, last_name, dni, phone, email, care_type, coverage_kind, coverage_name, doctor_id, preferred_date, preferred_time_band, alternative_date, alternative_time_band, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, registration_number, description, availability_summary, slot_minutes, active, display_order, doctor_availability(id, weekday, start_time, end_time, active)")
    .order("display_order", { ascending: true });

  // Las políticas de la base ya limitan esto a administradores; el condicional
  // solo evita dos consultas al pedo para el resto del personal.
  const { data: staff } = isAdministrator
    ? await supabase.from("staff_profiles")
        .select("id, username, full_name, role, active, must_change_password, can_manage_staff")
        .order("role", { ascending: true })
    : { data: [] };

  const { data: resets } = isAdministrator
    ? await supabase.from("password_reset_requests")
        .select("id, username, status, notified, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const panelDoctors: PanelDoctor[] = (doctors ?? []).map((doctor) => ({
    id: doctor.id as string,
    full_name: doctor.full_name as string,
    registration_number: (doctor.registration_number as string | null) ?? null,
    description: (doctor.description as string | null) ?? null,
    availability_summary: (doctor.availability_summary as string | null) ?? null,
    slot_minutes: (doctor.slot_minutes as number | null) ?? 30,
    active: Boolean(doctor.active),
    display_order: (doctor.display_order as number | null) ?? 0,
    blocks: ((doctor.doctor_availability ?? []) as (AvailabilityBlock & { id: string; active: boolean })[])
      .filter((block) => block.active)
      .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <EmployeeDashboardClient
      profile={{
        fullName: profile.full_name || "Usuario interno",
        username: account?.username ?? "",
        role: profile.role,
        canManageStaff: Boolean(account?.can_manage_staff),
      }}
      initialRequests={(requests ?? []) as AppointmentRequest[]}
      initialDoctors={panelDoctors}
      initialStaff={(staff ?? []) as StaffMember[]}
      initialResets={(resets ?? []) as PasswordResetRequest[]}
    />
  );
}
