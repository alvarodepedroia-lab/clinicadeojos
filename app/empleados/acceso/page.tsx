/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { normalizeUsername, usernameToEmail } from "@/lib/staff-login";

export default function EmployeeAccess() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryState, setRecoveryState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = normalizeUsername(String(form.get("username")));
    const password = String(form.get("password"));

    try {
      const { error: loginError } = await createBrowserSupabaseClient()
        .auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (loginError) {
        setError("Usuario o contraseña incorrectos.");
      } else {
        window.location.assign("/empleados");
      }
    } catch {
      setError("El acceso interno todavía no está configurado.");
    } finally {
      setLoading(false);
    }
  }

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = normalizeUsername(String(new FormData(event.currentTarget).get("recoveryUsername")));
    if (username.length < 3) { setRecoveryState("failed"); return; }
    setRecoveryState("sending");
    try {
      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      setRecoveryState(response.ok ? "sent" : "failed");
    } catch {
      setRecoveryState("failed");
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
          <label>Usuario
            <input name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </label>
          <label>Contraseña
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button type="submit" className="button" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button>
        </form>

        <div className="access-recovery">
          {!showRecovery ? (
            <button type="button" className="link-button" onClick={() => setShowRecovery(true)}>
              Olvidé mi contraseña
            </button>
          ) : recoveryState === "sent" ? (
            <p className="recovery-done" role="status">
              Listo. Le avisamos a la administración de la clínica para que te restablezca el acceso.
              Cuando lo hagan vas a poder entrar con la contraseña temporal y elegir una nueva.
            </p>
          ) : (
            <form onSubmit={requestRecovery} className="recovery-form">
              <label>Tu usuario
                <input name="recoveryUsername" required autoCapitalize="none" spellCheck={false} placeholder="por ejemplo, milagrosadmin" />
              </label>
              <p className="recovery-hint">
                Por seguridad las contraseñas no se pueden enviar por correo: nadie puede leerlas, ni
                siquiera la clínica. Lo que hacemos es avisarle a la administración para que te la
                restablezca.
              </p>
              {recoveryState === "failed" && (
                <p role="alert" className="form-error">No pudimos registrar el pedido. Probá de nuevo o comunicate con la clínica.</p>
              )}
              <button type="submit" className="button" disabled={recoveryState === "sending"}>
                {recoveryState === "sending" ? "Enviando…" : "Avisar a la clínica"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
