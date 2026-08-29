import { NextResponse } from "next/server";
import { createPublicApiClient } from "@/lib/supabase/server";

const noticeInbox = "clinicadeojosts@gmail.com";
const usernamePattern = /^[a-z0-9._-]{3,60}$/;

/** Aviso por correo a la administración. Es opcional: si todavía no hay servicio
 *  de envío configurado, el pedido igual queda registrado y visible en el panel. */
async function sendNotice(username: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Clínica de Ojos <onboarding@resend.dev>",
        to: [noticeInbox],
        subject: `Pedido de restablecer contraseña · ${username}`,
        text: [
          `El usuario "${username}" pidió recuperar el acceso al panel interno.`,
          "",
          `Fecha: ${new Date().toLocaleString("es-AR")}`,
          "",
          "Las contraseñas se guardan cifradas y no se pueden recuperar ni reenviar.",
          "Para darle acceso de nuevo hay que restablecerle la contraseña temporal;",
          "el sistema le va a exigir que elija una nueva en cuanto entre.",
          "",
          "El pedido también quedó registrado en el panel, en la sección Accesos.",
        ].join("\n"),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const client = createPublicApiClient();
  if (!client) {
    return NextResponse.json({ message: "El acceso interno todavía no está configurado." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!usernamePattern.test(username)) {
    return NextResponse.json({ message: "Revisá el nombre de usuario." }, { status: 400 });
  }

  const notified = await sendNotice(username);

  const { error } = await client
    .from("password_reset_requests")
    .insert({ username, status: "pending", notified });

  if (error) {
    return NextResponse.json({ message: "No pudimos registrar el pedido." }, { status: 500 });
  }

  return NextResponse.json({ notified }, { status: 201 });
}
