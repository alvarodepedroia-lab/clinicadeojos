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
