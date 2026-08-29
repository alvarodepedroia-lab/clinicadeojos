/** El personal entra con un nombre de usuario, no con un correo. Supabase Auth
 *  necesita un correo, así que se arma uno interno con un dominio ficticio.
 *
 *  La cuenta de acceso total conserva un correo real, para que pueda recuperar
 *  el acceso por su cuenta si nadie más pudiera restablecérselo. */

export const localDomain = "clinicadeojos.local";

const realEmails: Record<string, string> = {
  alvaroiasanjuan: "alvarodepedro93@gmail.com",
};

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}

export function usernameToEmail(username: string) {
  const clean = normalizeUsername(username);
  return realEmails[clean] ?? `${clean}@${localDomain}`;
}
