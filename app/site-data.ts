// Dominio canónico. Mientras no exista clinicadeojossj.com.ar, definí NEXT_PUBLIC_SITE_URL
// en Vercel con la URL del deploy (por ejemplo https://clinicadeojos.vercel.app).
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://clinicadeojossj.com.ar").replace(/\/+$/, "");

export const site = { whatsapp: "5492646708422", instagram: "https://www.instagram.com/clinicadeojossanjuanok/" };

export const doctors = [
  { name: "Dra. Celia Larrea", role: "Gerenta · Profesional de Clínica de Ojos", schedule: "Lunes, miércoles y viernes de 14:30 a 17:30. Martes de 08:30 a 11:30." },
  { name: "Dr. Mauricio Sansó", role: "Profesional de Clínica de Ojos", schedule: "Horarios rotativos. Consultar disponibilidad." },
  { name: "Dra. Carolina Lorenzo", role: "Profesional de Clínica de Ojos", schedule: "Miércoles y jueves de 14:30 a 16:30." },
  { name: "Dr. José Manrique", role: "Profesional de Clínica de Ojos", schedule: "Lunes de 16:30 a 19:30." },
  { name: "Dr. Gustavo Méndez", role: "Profesional de Clínica de Ojos", schedule: "Lunes y viernes de 10:30 a 12:30. Martes y jueves de 16:00 a 18:30." },
  { name: "Dr. Matías Sánchez", role: "Profesional de Clínica de Ojos", schedule: "Jueves de 08:30 a 10:30." },
];

export const administrativeTeam = [
  { name: "Rosana", role: "Contadora" },
  { name: "Milagros", role: "Administración" },
  { name: "Antonio", role: "Administración" },
  { name: "Romina", role: "Administración" },
  { name: "Mónica", role: "Administración" },
];

export const faq = [
  { q: "¿Cómo solicito un turno?", a: "Podés solicitarlo por WhatsApp. Elegí el profesional si lo tenés definido y contanos brevemente tu preferencia horaria." },
  { q: "¿Dónde está ubicada la clínica?", a: "Estamos en General Mariano Acha 641 Sur, Ciudad de San Juan, San Juan, Argentina." },
  { q: "¿Puedo consultar por mi obra social?", a: "Sí. Escribinos por WhatsApp para confirmar cobertura, disponibilidad y requisitos." },
  { q: "¿Qué información debo enviar para pedir un turno?", a: "Tu nombre, un motivo general de consulta y, si la conocés, tu preferencia de profesional u horario." },
  { q: "¿Atienden urgencias o realizan estudios?", a: "Consultanos por WhatsApp para confirmar la disponibilidad, las prestaciones y los requisitos correspondientes." }
];
