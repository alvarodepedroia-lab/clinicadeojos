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
create policy "public view active team members" on public.team_members for select to anon, authenticated using (active);
create policy "active staff view all team members" on public.team_members for select to authenticated using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active));
create policy "administrators update team members" on public.team_members for update to authenticated using (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator')) with check (exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrator'));

insert into public.team_members (full_name, role, display_order) values
  ('Rosana', 'Contadora', 1), ('Milagros', 'Administración', 2), ('Antonio', 'Administración', 3), ('Romina', 'Administración', 4), ('Mónica', 'Administración', 5);
