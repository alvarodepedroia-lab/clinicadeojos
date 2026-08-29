/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const minimumLength = 8;

export default function ChangePassword() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sin sesión no hay contraseña que cambiar.
  useEffect(() => {
    createBrowserSupabaseClient().auth.getSession()
      .then(({ data }) => { if (!data.session) window.location.assign("/empleados/acceso"); })
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const repeat = String(form.get("repeat"));

    if (password.length < minimumLength) {
      setError(`La contraseña tiene que tener al menos ${minimumLength} caracteres.`);
      return;
    }
    if (password !== repeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Recién acá se levanta la obligación de cambiarla.
      const { error: flagError } = await supabase.rpc("complete_password_change");
      if (flagError) throw flagError;
      window.location.assign("/empleados");
    } catch {
      setError("No se pudo guardar la contraseña. Probá de nuevo o pedí ayuda a la administración.");
      setSaving(false);
    }
  }

  return (
    <main className="employee-access">
      <a className="brand" href="/"><img src="/logo-clinica-de-ojos.png" alt="Clínica de Ojos" /></a>
      <section>
        <p className="eyebrow">Primer ingreso</p>
        <h1>Elegí tu contraseña</h1>
        <p>
          Estás usando la contraseña temporal que te dio la clínica. Para entrar al panel necesitás
          reemplazarla por una propia, que solo conozcas vos.
        </p>
        <form onSubmit={submit}>
          <label>Nueva contraseña
            <input name="password" type="password" required minLength={minimumLength} autoComplete="new-password" autoFocus />
          </label>
          <label>Repetila
            <input name="repeat" type="password" required minLength={minimumLength} autoComplete="new-password" />
          </label>
          <p className="recovery-hint">Al menos {minimumLength} caracteres. Evitá tu nombre, tu DNI o la fecha de nacimiento.</p>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" className="button" disabled={saving}>{saving ? "Guardando…" : "Guardar y entrar"}</button>
        </form>
      </section>
    </main>
  );
}
