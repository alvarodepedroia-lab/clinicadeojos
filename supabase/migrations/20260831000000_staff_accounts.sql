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
