# Clínica de Ojos · Plataforma institucional y turnos

Web pública de Clínica de Ojos y base de la plataforma interna de solicitudes de turnos. La aplicación no se integra con iSalud: el personal mantiene la carga y confirmación manual en el sistema oficial.

## Configuración necesaria

1. Crear un proyecto Supabase.
2. Ejecutar la migración de `supabase/migrations/20260803192717_initial_clinic_schema.sql` desde el flujo de migraciones de Supabase.
3. Copiar `.env.example` a `.env.local` y completar las claves del proyecto.
4. Crear usuarios internos en Supabase Auth y sus perfiles correspondientes en `staff_profiles`.
5. En Netlify, configurar las mismas variables de entorno. No exponer `SUPABASE_SERVICE_ROLE_KEY` en el navegador.

## Funcionalidades incluidas

- Solicitud progresiva de turnos en seis pasos.
- Validación del lado del servidor y código de solicitud.
- Estados iniciales, auditoría y modelo de datos para el flujo interno.
- Acceso de empleados y bandeja de solicitudes, protegidos por Supabase Auth.
- Datos de médicos iniciales en la migración para mantener coherencia con la web pública.
- Sin acceso ni integración directa con iSalud.

## Comandos

```bash
npm run dev
npm run build
npm run lint
```

## Pendiente de configuración institucional

- Claves y proyecto Supabase.
- Usuarios, roles y permisos internos definitivos.
- Coberturas, planes, horarios, feriados y reglas de disponibilidad.
- Servicio de email, protección antispam y plantillas de WhatsApp.
- Documentación o API oficial de iSalud para evaluar una integración futura autorizada.
