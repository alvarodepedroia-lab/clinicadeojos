create type public.staff_role as enum ('administrator', 'reception', 'operator');
create type public.request_status as enum (
  'new', 'under_review', 'entered_in_isalud', 'confirmed',
  'reschedule_requested', 'rejected', 'cancelled'
);
create type public.coverage_type as enum ('obra_social', 'prepaga', 'particular');

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.staff_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  registration_number text,
  description text,
  photo_path text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index doctors_full_name_unique_idx on public.doctors(full_name);

insert into public.doctors (full_name, display_order) values
  ('Dra. Celia Larrea', 1),
  ('Dr. Mauricio Sansó', 2),
  ('Dra. Carolina Lorenzo', 3),
  ('Dr. José Manrique', 4),
  ('Dr. Gustavo Méndez', 5),
  ('Dr. Matías Sánchez', 6),
  ('Dra. Erika Oyola', 7)
on conflict (full_name) do nothing;

create table public.coverages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.coverage_type not null,
  active boolean not null default true,
  internal_notes text,
  created_at timestamptz not null default now()
);

create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique default ('CO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  care_type text not null check (care_type in ('first_consultation', 'follow_up', 'study', 'other_service')),
  doctor_id uuid references public.doctors(id) on delete set null,
  first_available boolean not null default false,
  coverage_kind public.coverage_type not null,
  coverage_name text,
  coverage_plan text,
  member_number text,
  preferred_date date,
  preferred_time_band text,
  alternative_date date,
  alternative_time_band text,
  third_date date,
  third_time_band text,
  first_name text not null,
  last_name text not null,
  dni text not null,
  phone text not null,
  email text,
  birth_date date,
  returning_patient boolean not null default false,
  status public.request_status not null default 'new',
  internal_notes text,
  final_datetime timestamptz,
  entered_in_isalud_at timestamptz,
  handled_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_available or doctor_id is not null)
);

create index appointment_requests_status_created_idx on public.appointment_requests(status, created_at desc);
create index appointment_requests_dni_idx on public.appointment_requests(dni);
create index appointment_requests_doctor_idx on public.appointment_requests(doctor_id);

create table public.appointment_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.appointment_requests(id) on delete cascade,
  actor_id uuid references public.staff_profiles(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.coverages enable row level security;
alter table public.appointment_requests enable row level security;
alter table public.appointment_audit_log enable row level security;

create policy "staff view own profile" on public.staff_profiles for select to authenticated using (id = (select auth.uid()));
create policy "public view active doctors" on public.doctors for select to anon, authenticated using (active);
create policy "active staff view coverages" on public.coverages for select to authenticated using (true);
create policy "public submit new appointment request" on public.appointment_requests for insert to anon, authenticated with check (status = 'new');
create policy "staff view appointment requests" on public.appointment_requests for select to authenticated using (
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active)
);
create policy "staff update appointment requests" on public.appointment_requests for update to authenticated using (
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active)
) with check (
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active)
);
create policy "staff view audit log" on public.appointment_audit_log for select to authenticated using (
  exists (select 1 from public.staff_profiles p where p.id = (select auth.uid()) and p.active)
);
create policy "staff insert audit log" on public.appointment_audit_log for insert to authenticated with check (
  actor_id = (select auth.uid())
);
