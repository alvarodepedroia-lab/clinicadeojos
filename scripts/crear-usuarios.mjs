/**
 * Crea (o actualiza) las cuentas del personal en Supabase.
 *
 *   node scripts/crear-usuarios.mjs
 *
 * Necesita un archivo .env.local en la raíz del proyecto, con:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   STAFF_TEMP_PASSWORD=...        (mínimo 6 caracteres)
 *   OWNER_PASSWORD=...            (cuenta alvaroiasanjuan)
 *
 * La service_role key es la llave maestra de la base: se queda en tu máquina.
 * .env.local está ignorado por git, así que no se sube al repositorio. NUNCA la
 * cargues en Vercel ni en una variable NEXT_PUBLIC_*.
 *
 * Se puede correr las veces que haga falta: si la cuenta ya existe, le
 * restablece la contraseña temporal y la vuelve a obligar a cambiarla.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { resolveRoster } from "./roster.mjs";

function loadEnv() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // Sin .env.local se usan las variables de entorno que ya estén cargadas.
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || !process.env.STAFF_TEMP_PASSWORD || !process.env.OWNER_PASSWORD) {
  console.error("\nFaltan datos. Creá un archivo .env.local en la raíz del proyecto con:\n");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...");
  console.error("  STAFF_TEMP_PASSWORD=...   (temporal del personal, mínimo 6 caracteres)");
  console.error("  OWNER_PASSWORD=...        (cuenta alvaroiasanjuan)\n");
  console.error("Las dos primeras están en Supabase → Project Settings → API Keys.");
  console.error("Las contraseñas las elegís vos: no se guardan en el repositorio.\n");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Trae todas las cuentas existentes indexadas por correo. */
async function existingUsers() {
  const byEmail = new Map();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) byEmail.set((user.email ?? "").toLowerCase(), user);
    if (data.users.length < 200) break;
  }
  return byEmail;
}

async function main() {
  const people = resolveRoster();
  const known = await existingUsers();
  const summary = [];

  for (const person of people) {
    const email = person.email.toLowerCase();
    const found = known.get(email);
    let userId = found?.id;
    let action = "creada";

    if (found) {
      action = "actualizada";
      const { error } = await admin.auth.admin.updateUserById(found.id, {
        password: person.password,
        email_confirm: true,
        user_metadata: { username: person.username, full_name: person.fullName },
      });
      if (error) throw new Error(`${person.username}: ${error.message}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: person.password,
        email_confirm: true,
        user_metadata: { username: person.username, full_name: person.fullName },
      });
      if (error) throw new Error(`${person.username}: ${error.message}`);
      userId = data.user.id;
    }

    const { error: profileError } = await admin.from("staff_profiles").upsert({
      id: userId,
      username: person.username,
      full_name: person.fullName,
      role: person.role,
      active: person.active,
      can_manage_staff: person.canManageStaff,
      must_change_password: person.mustChangePassword,
    });
    if (profileError) throw new Error(`${person.username}: ${profileError.message}`);

    summary.push({
      Usuario: person.username,
      Nombre: person.fullName,
      Rol: person.role,
      Activo: person.active ? "sí" : "no",
      "Debe cambiar clave": person.mustChangePassword ? "sí" : "no",
      Cuenta: action,
    });
  }

  console.table(summary);
  console.log("\nListo. Las contraseñas salen de STAFF_TEMP_PASSWORD y OWNER_PASSWORD (.env.local).");
  console.log("Todos, salvo alvaroiasanjuan, deben cambiarlas en el primer ingreso.\n");
}

main().catch((error) => {
  console.error("\nNo se pudo completar:", error.message, "\n");
  process.exit(1);
});
