-- ============================================================================
-- APLICAR EN SUPABASE  ·  Clínica de Ojos S.R.L.
-- ----------------------------------------------------------------------------
-- Cómo se usa:
--   1. Entrá a https://supabase.com/dashboard y elegí el proyecto de la clínica.
--   2. Menú lateral -> SQL Editor -> New query.
--   3. Copiá TODO este archivo, pegalo y apretá "Run".
--
-- Qué hace:
--   · Permite que un administrador saque o vuelva a poner médicos en agenda.
--   · Deja a la Dra. Erika Oyola FUERA DE AGENDA sin borrar su registro
--     ni su historial de turnos.
--   · Crea la tabla del equipo administrativo con RLS activo.
--   · Fija el orden en que se muestran los profesionales.
--   · Crea la AGENDA de cada profesional (día, horario y duración del turno).
--     El formulario público solo ofrece esos horarios.
--   · Prepara las cuentas del personal: cambio de contraseña obligatorio en el
--     primer ingreso, pedidos de "olvidé mi contraseña" y permisos por rol.
--
-- IMPORTANTE: este archivo NO crea los usuarios. Después de correrlo, dalos de
-- alta con:   npm run usuarios
--
-- Es seguro ejecutarlo más de una vez, y también si ya corriste una versión
-- anterior: no duplica filas ni pisa datos. No borra tablas ni turnos.
-- ============================================================================


-- ─── 1) Gestión de médicos por parte del personal ───────────────────────────
revoke insert, update, delete on table public.doctors from anon;
grant select, update on table public.doctors to authenticated;

drop policy if exists "active staff view all doctors" on public.doctors;
create policy "active staff view all doctors"
on public.doctors
for select
to authenticated
using (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active
  )
);

drop policy if exists "administrators update doctors" on public.doctors;
create policy "administrators update doctors"
on public.doctors
for update
to authenticated
using (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
  )
)
with check (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
  )
);

-- ─── 2) Equipo administrativo y datos de los profesionales ──────────────────
alter table public.doctors add column if not exists availability_summary text;

update public.doctors set description = 'Gerenta de Clínica de Ojos.', availability_summary = 'Lunes, miércoles y viernes de 14:30 a 17:30. Martes de 08:30 a 11:30.' where full_name = 'Dra. Celia Larrea';
update public.doctors set availability_summary = 'Horarios rotativos. Consultar disponibilidad.' where full_name = 'Dr. Mauricio Sansó';
update public.doctors set availability_summary = 'Miércoles y jueves de 14:30 a 16:30.' where full_name = 'Dra. Carolina Lorenzo';
update public.doctors set availability_summary = 'Lunes de 16:30 a 19:30.' where full_name = 'Dr. José Manrique';
update public.doctors set availability_summary = 'Lunes y viernes de 10:30 a 12:30. Martes y jueves de 16:00 a 18:30.' where full_name = 'Dr. Gustavo Méndez';
update public.doctors set availability_summary = 'Jueves de 08:30 a 10:30.' where full_name = 'Dr. Matías Sánchez';
update public.doctors set active = false where full_name = 'Dra. Erika Oyola';

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null default 'Administración',
  photo_path text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
grant select on table public.team_members to anon, authenticated;
grant update on table public.team_members to authenticated;
drop policy if exists "public view active team members" on public.team_members;
create policy "public view active team members" on public.team_members for select to anon, authenticated using (active);
drop policy if exists "active staff view all team members" on public.team_members;
create policy "active staff view all team members" on public.team_members for select to authenticated using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active));
drop policy if exists "administrators update team members" on public.team_members;
create policy "administrators update team members" on public.team_members for update to authenticated using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator')) with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator'));

create unique index if not exists team_members_full_name_unique_idx on public.team_members(full_name);

insert into public.team_members (full_name, role, display_order) values
  ('Rosana', 'Contadora', 1), ('Milagros', 'Administración', 2), ('Antonio', 'Administración', 3), ('Romina', 'Administración', 4), ('Mónica', 'Administración', 5)
on conflict (full_name) do nothing;

-- ─── 3) Orden de los profesionales ──────────────────────────────────────────
-- Orden de los profesionales tal como debe verse en el sitio y en el panel interno.
-- La Dra. Erika Oyola queda al final y fuera de agenda; su registro y su historial se conservan.
update public.doctors set display_order = 1 where full_name = 'Dra. Celia Larrea';
update public.doctors set display_order = 2 where full_name = 'Dra. Carolina Lorenzo';
update public.doctors set display_order = 3 where full_name = 'Dr. Mauricio Sansó';
update public.doctors set display_order = 4 where full_name = 'Dr. José Manrique';
update public.doctors set display_order = 5 where full_name = 'Dr. Gustavo Méndez';
update public.doctors set display_order = 6 where full_name = 'Dr. Matías Sánchez';
update public.doctors set display_order = 7 where full_name = 'Dra. Erika Oyola';

-- ─── 4) Agenda por profesional y duración del turno ─────────────────────────
-- Agenda estructurada de cada profesional: los turnos que puede pedir un paciente
-- salen de acá, no de una fecha libre. El texto de availability_summary queda como
-- override para casos especiales (por ejemplo, horarios rotativos).

-- Duración del turno, definida por profesional.
alter table public.doctors add column if not exists slot_minutes integer not null default 30;
alter table public.doctors drop constraint if exists doctors_slot_minutes_check;
alter table public.doctors add constraint doctors_slot_minutes_check
  check (slot_minutes between 5 and 180);

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  -- Norma ISO: 1 = lunes ... 7 = domingo
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint doctor_availability_range_check check (end_time > start_time)
);

create unique index if not exists doctor_availability_unique_block_idx
  on public.doctor_availability(doctor_id, weekday, start_time);
create index if not exists doctor_availability_doctor_idx
  on public.doctor_availability(doctor_id, weekday);

alter table public.doctor_availability enable row level security;
grant select on table public.doctor_availability to anon, authenticated;
grant insert, update, delete on table public.doctor_availability to authenticated;

drop policy if exists "public view availability of active doctors" on public.doctor_availability;
create policy "public view availability of active doctors" on public.doctor_availability
for select to anon, authenticated
using (active and exists (select 1 from public.doctors d where d.id = doctor_id and d.active));

drop policy if exists "active staff view all availability" on public.doctor_availability;
create policy "active staff view all availability" on public.doctor_availability
for select to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active));

drop policy if exists "administrators manage availability" on public.doctor_availability;
create policy "administrators manage availability" on public.doctor_availability
for all to authenticated
using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator'))
with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator'));

-- Carga inicial de la agenda conocida.
-- El Dr. Mauricio Sansó no se carga acá: sus horarios son rotativos y los define
-- la administración desde el panel.
insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
select d.id, v.weekday, v.start_time, v.end_time
from public.doctors d
join (values
  ('Dra. Celia Larrea',    1, time '14:30', time '17:30'),
  ('Dra. Celia Larrea',    3, time '14:30', time '17:30'),
  ('Dra. Celia Larrea',    5, time '14:30', time '17:30'),
  ('Dra. Celia Larrea',    2, time '08:30', time '11:30'),
  ('Dra. Carolina Lorenzo',3, time '14:30', time '16:30'),
  ('Dra. Carolina Lorenzo',4, time '14:30', time '16:30'),
  ('Dr. José Manrique',    1, time '16:30', time '19:30'),
  ('Dr. Gustavo Méndez',   1, time '10:30', time '12:30'),
  ('Dr. Gustavo Méndez',   5, time '10:30', time '12:30'),
  ('Dr. Gustavo Méndez',   2, time '16:00', time '18:30'),
  ('Dr. Gustavo Méndez',   4, time '16:00', time '18:30'),
  ('Dr. Matías Sánchez',   4, time '08:30', time '10:30')
) as v(full_name, weekday, start_time, end_time) on v.full_name = d.full_name
on conflict (doctor_id, weekday, start_time) do nothing;

-- Sansó conserva su aviso; el resto arma su texto desde la agenda de arriba.
update public.doctors set availability_summary = null
where full_name <> 'Dr. Mauricio Sansó' and active;

-- ─── 5) Cuentas del personal, contraseñas y permisos ────────────────────────
-- Cuentas del personal: cambio obligatorio de contraseña en el primer ingreso,
-- pedidos de recuperación de acceso y permisos por rol.
--
-- Este archivo NO crea los usuarios: eso lo hace scripts/crear-usuarios.mjs, que
-- usa la API de administración de Supabase. Acá solo va el esquema y los permisos.

-- ─── Perfil del personal ────────────────────────────────────────────────────
alter table public.staff_profiles add column if not exists username text;
alter table public.staff_profiles add column if not exists must_change_password boolean not null default true;
-- Acceso total: además de administrar, ve la sección de accesos del panel.
alter table public.staff_profiles add column if not exists can_manage_staff boolean not null default false;

create unique index if not exists staff_profiles_username_unique_idx
  on public.staff_profiles(username) where username is not null;

-- Un administrador necesita ver a todo el equipo para saber quién todavía tiene
-- la contraseña temporal. El resto sigue viendo solamente su propio perfil.
drop policy if exists "administrators view all staff" on public.staff_profiles;
create policy "administrators view all staff" on public.staff_profiles
for select to authenticated
using (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
));

-- Marcar la contraseña como cambiada. Va por función para que nadie pueda
-- editar su propia fila y, de paso, ascenderse a administrador.
create or replace function public.complete_password_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.staff_profiles
  set must_change_password = false
  where id = (select auth.uid());
$$;

revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- ─── Quién puede modificar las reservas ─────────────────────────────────────
-- Los médicos (rol operator) consultan; administración y recepción gestionan.
drop policy if exists "staff update appointment requests" on public.appointment_requests;
create policy "staff update appointment requests" on public.appointment_requests
for update to authenticated
using (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role in ('administrator', 'reception')
))
with check (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role in ('administrator', 'reception')
));

-- ─── Pedidos de "olvidé mi contraseña" ──────────────────────────────────────
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.staff_profiles(id) on delete set null
);

create index if not exists password_reset_requests_pending_idx
  on public.password_reset_requests(status, created_at desc);

alter table public.password_reset_requests enable row level security;
grant insert on table public.password_reset_requests to anon, authenticated;
grant select, update on table public.password_reset_requests to authenticated;

-- Cualquiera puede pedir recuperar su acceso, pero solo puede crear el pedido:
-- no puede leer los ajenos ni marcarlos como resueltos.
drop policy if exists "anyone can ask for a password reset" on public.password_reset_requests;
create policy "anyone can ask for a password reset" on public.password_reset_requests
for insert to anon, authenticated
with check (status = 'pending' and length(username) between 3 and 60);

drop policy if exists "administrators read password resets" on public.password_reset_requests;
create policy "administrators read password resets" on public.password_reset_requests
for select to authenticated
using (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
));

drop policy if exists "administrators resolve password resets" on public.password_reset_requests;
create policy "administrators resolve password resets" on public.password_reset_requests
for update to authenticated
using (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
))
with check (exists (
  select 1 from public.staff_profiles p
  where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
));


-- ─── 6) Arreglo de recursión en las políticas ───────────────────────────────
-- Arregla una recursión infinita introducida en 20260831000000.
--
-- La política "administrators view all staff" consultaba public.staff_profiles
-- desde dentro de una política sobre public.staff_profiles. Postgres vuelve a
-- evaluar la política al resolver esa subconsulta y entra en bucle, así que
-- CUALQUIER lectura de la tabla falla. Como el resto de las políticas del sistema
-- también consultan staff_profiles, el panel entero quedaba inaccesible.
--
-- La solución es preguntar el rol a través de funciones security definer, que se
-- ejecutan sin RLS y por lo tanto cortan la recursión.

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select exists (
    select 1 from public.staff_profiles
    where id = (select auth.uid()) and active
  );
$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $
  select role::text from public.staff_profiles
  where id = (select auth.uid()) and active;
$;

revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.current_staff_role() to authenticated;

-- ─── staff_profiles ─────────────────────────────────────────────────────────
drop policy if exists "administrators view all staff" on public.staff_profiles;
create policy "administrators view all staff" on public.staff_profiles
for select to authenticated
using (public.current_staff_role() = 'administrator');

-- ─── doctors ────────────────────────────────────────────────────────────────
drop policy if exists "active staff view all doctors" on public.doctors;
create policy "active staff view all doctors" on public.doctors
for select to authenticated using (public.is_active_staff());

drop policy if exists "administrators update doctors" on public.doctors;
create policy "administrators update doctors" on public.doctors
for update to authenticated
using (public.current_staff_role() = 'administrator')
with check (public.current_staff_role() = 'administrator');

-- ─── doctor_availability ────────────────────────────────────────────────────
drop policy if exists "active staff view all availability" on public.doctor_availability;
create policy "active staff view all availability" on public.doctor_availability
for select to authenticated using (public.is_active_staff());

drop policy if exists "administrators manage availability" on public.doctor_availability;
create policy "administrators manage availability" on public.doctor_availability
for all to authenticated
using (public.current_staff_role() = 'administrator')
with check (public.current_staff_role() = 'administrator');

-- ─── appointment_requests ───────────────────────────────────────────────────
drop policy if exists "staff view appointment requests" on public.appointment_requests;
create policy "staff view appointment requests" on public.appointment_requests
for select to authenticated using (public.is_active_staff());

drop policy if exists "staff update appointment requests" on public.appointment_requests;
create policy "staff update appointment requests" on public.appointment_requests
for update to authenticated
using (public.current_staff_role() in ('administrator', 'reception'))
with check (public.current_staff_role() in ('administrator', 'reception'));

-- ─── appointment_audit_log ──────────────────────────────────────────────────
drop policy if exists "staff view audit log" on public.appointment_audit_log;
create policy "staff view audit log" on public.appointment_audit_log
for select to authenticated using (public.is_active_staff());

-- ─── team_members ───────────────────────────────────────────────────────────
drop policy if exists "active staff view all team members" on public.team_members;
create policy "active staff view all team members" on public.team_members
for select to authenticated using (public.is_active_staff());

drop policy if exists "administrators update team members" on public.team_members;
create policy "administrators update team members" on public.team_members
for update to authenticated
using (public.current_staff_role() = 'administrator')
with check (public.current_staff_role() = 'administrator');

-- ─── password_reset_requests ────────────────────────────────────────────────
drop policy if exists "administrators read password resets" on public.password_reset_requests;
create policy "administrators read password resets" on public.password_reset_requests
for select to authenticated using (public.current_staff_role() = 'administrator');

drop policy if exists "administrators resolve password resets" on public.password_reset_requests;
create policy "administrators resolve password resets" on public.password_reset_requests
for update to authenticated
using (public.current_staff_role() = 'administrator')
with check (public.current_staff_role() = 'administrator');


-- ─── 7) Verificación ────────────────────────────────────────────────────────
-- No modifica nada: muestra cómo quedó todo. Deberías ver 6 médicos "En agenda",
-- la Dra. Erika Oyola "FUERA DE AGENDA", las 5 personas de Administración, y
-- la agenda cargada de cada profesional.
select
  'Médico' as tipo,
  d.full_name as nombre,
  case when d.active then 'En agenda' else 'FUERA DE AGENDA' end as estado,
  d.display_order as orden,
  coalesce(
    string_agg(
      case a.weekday
        when 1 then 'lun' when 2 then 'mar' when 3 then 'mié'
        when 4 then 'jue' when 5 then 'vie' when 6 then 'sáb' else 'dom'
      end || ' ' || to_char(a.start_time, 'HH24:MI') || '-' || to_char(a.end_time, 'HH24:MI'),
      ' · ' order by a.weekday, a.start_time),
    '(sin agenda cargada)'
  ) || '  ·  turnos de ' || d.slot_minutes || ' min' as detalle
from public.doctors d
left join public.doctor_availability a on a.doctor_id = d.id and a.active
group by d.id, d.full_name, d.active, d.display_order, d.slot_minutes
union all
select 'Administración', full_name,
       case when active then 'Activo' else 'Inactivo' end,
       display_order, role
from public.team_members
order by tipo desc, orden;
