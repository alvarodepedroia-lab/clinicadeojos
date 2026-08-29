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
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = (select auth.uid()) and active
  );
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.staff_profiles
  where id = (select auth.uid()) and active;
$$;

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
