/** Padrón del personal de Clínica de Ojos.
 *
 *  Usuario: nombre y apellido juntos, en minúscula y sin tildes, para los médicos.
 *  Para administración, el nombre seguido de "admin".
 *
 *  Todos entran con la contraseña temporal y están obligados a cambiarla en el
 *  primer ingreso. La única excepción es la cuenta de acceso total.
 */

/** Las contraseñas NO van en este archivo: el repositorio es público.
 *  Se leen de .env.local, que git ignora. */
export const localDomain = "clinicadeojos.local";
export const noticeInbox = "clinicadeojosts@gmail.com";

function requireSecret(name, hint) {
  const value = process.env[name];
  if (!value || value.length < 6) {
    throw new Error(
      `Falta ${name} en .env.local (mínimo 6 caracteres, que es lo que exige Supabase).\n  ${hint}`,
    );
  }
  return value;
}

export const temporaryPassword = () =>
  requireSecret("STAFF_TEMP_PASSWORD", "Contraseña temporal para todo el personal.");
const ownerPassword = () =>
  requireSecret("OWNER_PASSWORD", "Contraseña de la cuenta alvaroiasanjuan.");

/** El correo interno es ficticio a propósito: el ingreso es por usuario, no por
 *  mail. La cuenta de acceso total conserva un correo real para poder recuperar
 *  el acceso por su cuenta si hiciera falta. */
export const roster = [
  {
    username: "alvaroiasanjuan",
    fullName: "Álvaro De Pedro",
    email: "alvarodepedro93@gmail.com",
    password: ownerPassword,
    role: "administrator",
    canManageStaff: true,
    active: true,
    mustChangePassword: false,
    note: "Acceso total",
  },

  // Administración: gestionan reservas, exportan y cargan la agenda médica.
  { username: "rosanaadmin", fullName: "Rosana", role: "administrator", note: "Contadora" },
  { username: "milagrosadmin", fullName: "Milagros", role: "administrator", note: "Administración" },
  { username: "antonioadmin", fullName: "Antonio", role: "administrator", note: "Administración" },
  { username: "rominaadmin", fullName: "Romina", role: "administrator", note: "Administración" },
  { username: "monicaadmin", fullName: "Mónica", role: "administrator", note: "Administración" },

  // Médicos: consultan la agenda y las reservas, sin modificarlas.
  { username: "celialarrea", fullName: "Dra. Celia Larrea", role: "operator", note: "Gerenta" },
  { username: "carolinalorenzo", fullName: "Dra. Carolina Lorenzo", role: "operator", note: "Profesional" },
  { username: "mauriciosanso", fullName: "Dr. Mauricio Sansó", role: "operator", note: "Profesional" },
  { username: "josemanrique", fullName: "Dr. José Manrique", role: "operator", note: "Profesional" },
  { username: "gustavomendez", fullName: "Dr. Gustavo Méndez", role: "operator", note: "Profesional" },
  { username: "matiassanchez", fullName: "Dr. Matías Sánchez", role: "operator", note: "Profesional" },

  // Fuera de agenda: la cuenta se crea desactivada y no puede entrar al panel.
  // Para reactivarla, poner active en true y volver a correr el script.
  { username: "erikaoyola", fullName: "Dra. Erika Oyola", role: "operator", active: false, note: "Fuera de agenda" },
];

/** Completa los valores por defecto y resuelve las contraseñas desde el entorno. */
export function resolveRoster() {
  return roster.map((person) => {
    const resolved = {
      canManageStaff: false,
      active: true,
      mustChangePassword: true,
      password: temporaryPassword,
      email: `${person.username}@${localDomain}`,
      ...person,
    };
    return { ...resolved, password: resolved.password() };
  });
}
