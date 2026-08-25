import type { Metadata } from "next";
import "./globals.css";
import "./appointment.css";
import "./employees.css";
import "./hero-logo.css";
import "./mobile.css";
import "./team.css";
export const metadata: Metadata = { metadataBase: new URL("https://clinicadeojossanjuan.com.ar"), title: "Clínica de Ojos San Juan | Más de 50 años cuidando tu visión", description: "Clínica oftalmológica en San Juan con más de 50 años de trayectoria. Conocé nuestro equipo médico y solicitá tu turno por WhatsApp.", openGraph: { title: "Clínica de Ojos · San Juan", description: "Más de 50 años cuidando la visión de San Juan", images: ["/og.png"] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
