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
--   · Agrega el horario de atención de cada profesional.
--   · Deja a la Dra. Erika Oyola FUERA DE AGENDA sin borrar su registro
--     ni su historial de turnos.
--   · Crea la tabla del equipo administrativo (Rosana, Milagros, Antonio,
--     Romina y Mónica) con RLS activo.
--   · Fija el orden en que se muestran los profesionales.
--
-- Es seguro ejecutarlo más de una vez: no duplica filas ni pisa datos.
-- No borra ninguna tabla, ninguna columna ni ningún turno existente.
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

-- ─── 2) Horarios de atención y equipo administrativo ────────────────────────
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

-- ─── 4) Verificación ────────────────────────────────────────────────────────
-- Esto no modifica nada: solo muestra cómo quedó todo, para confirmar de un
-- vistazo que se aplicó bien. Deberías ver 6 médicos "En agenda", la Dra. Erika
-- Oyola "Fuera de agenda" al final, y las 5 personas de Administración.
select
  'Médico' as tipo,
  full_name as nombre,
  case when active then 'En agenda' else 'FUERA DE AGENDA' end as estado,
  display_order as orden,
  coalesce(availability_summary, '(sin horario cargado)') as detalle
from public.doctors
union all
select
  'Administración',
  full_name,
  case when active then 'Activo' else 'Inactivo' end,
  display_order,
  role
from public.team_members
order by tipo desc, orden;
