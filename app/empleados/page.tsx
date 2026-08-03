/* eslint-disable @next/next/no-html-link-for-pages */
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <main className="employee-empty"><h1>Panel interno pendiente de configuración</h1><p>Configurá las variables de Supabase para habilitar el acceso seguro de empleados.</p></main>;
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/empleados/acceso");
  const { data: profile } = await supabase.from("staff_profiles").select("full_name, role, active").eq("id", userId).maybeSingle();
  if (!profile?.active) redirect("/empleados/acceso");
  const { data: requests } = await supabase.from("appointment_requests").select("request_code, first_name, last_name, dni, phone, care_type, status, created_at").order("created_at", { ascending: false }).limit(20);
  return <main className="employee-dashboard"><header><a href="/">← Sitio público</a><div><p>Panel de empleados</p><h1>Solicitudes de turno</h1><small>{profile.full_name || "Usuario interno"} · {profile.role}</small></div></header><section className="dashboard-card"><h2>Bandeja reciente</h2>{!requests?.length ? <p>No hay solicitudes para mostrar.</p> : <div className="request-table" role="region" aria-label="Solicitudes recientes" tabIndex={0}><table><thead><tr><th>Código</th><th>Paciente</th><th>DNI</th><th>Teléfono</th><th>Atención</th><th>Estado</th></tr></thead><tbody>{requests.map(item => <tr key={item.request_code}><td>{item.request_code}</td><td>{item.first_name} {item.last_name}</td><td>{item.dni}</td><td>{item.phone}</td><td>{item.care_type}</td><td>{item.status}</td></tr>)}</tbody></table></div>}</section></main>;
}
