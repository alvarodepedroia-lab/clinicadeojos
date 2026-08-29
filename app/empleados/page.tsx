import { redirect } from "next/navigation";
import EmployeeDashboardClient, { type AppointmentRequest } from "@/components/employee-dashboard-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("full_name, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.active) redirect("/empleados/acceso");

  const { data: requests } = await supabase
    .from("appointment_requests")
    .select("id, request_code, first_name, last_name, dni, phone, email, care_type, coverage_kind, coverage_name, preferred_date, preferred_time_band, alternative_date, alternative_time_band, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, registration_number, description, active, display_order")
    .order("display_order", { ascending: true });

  return (
    <EmployeeDashboardClient
      profile={{ fullName: profile.full_name || "Usuario interno", role: profile.role }}
      initialRequests={(requests ?? []) as AppointmentRequest[]}
      initialDoctors={doctors ?? []}
    />
  );
}
