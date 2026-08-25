"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function EmployeeAccess() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username")).trim().toLowerCase();
    const password = String(form.get("password"));
    const email = username === "alvaro" ? "alvarodepedro93@gmail.com" : `${username}@clinicadeojos.local`;

    try {
      const { error: loginError } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("Usuario o contraseña incorrectos. Si es tu primer ingreso, confirmá primero el correo de invitación.");
      } else {
        window.location.assign("/empleados");
      }
    } catch {
      setError("El acceso interno todavía no está configurado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="employee-access">
      <a className="brand" href="/"><img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" /></a>
      <section>
        <p className="eyebrow">Acceso privado</p>
        <h1>Ingreso Clínica</h1>
        <p>Ingresá con tu usuario y contraseña institucionales.</p>
        <form method="post" onSubmit={signIn}>
          <label>Usuario<input name="username" required autoComplete="username" autoCapitalize="none" /></label>
          <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" className="button" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button>
        </form>
      </section>
    </main>
  );
}
