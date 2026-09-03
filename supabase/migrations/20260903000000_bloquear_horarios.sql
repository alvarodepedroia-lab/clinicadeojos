-- Un horario tomado deja de estar disponible.
--
-- Hasta ahora dos pacientes podían pedir el mismo profesional, el mismo día y a
-- la misma hora, y los dos leían que su turno estaba confirmado.

-- La regla vive en la base, no solo en el formulario: aunque alguien saltee la
-- web, Postgres rechaza el segundo turno. Las canceladas y rechazadas quedan
-- fuera del índice, así que cancelar un turno libera el horario solo.
create unique index if not exists appointment_requests_slot_unique_idx
  on public.appointment_requests (doctor_id, preferred_date, preferred_time_band)
  where doctor_id is not null
    and preferred_date is not null
    and preferred_time_band is not null
    and status not in ('cancelled', 'rejected');

-- El formulario público necesita saber qué horarios están ocupados, pero no
-- puede leer la tabla de solicitudes (tiene datos de pacientes). Esta función
-- devuelve únicamente profesional, día y hora: ningún dato personal.
create or replace function public.taken_slots()
returns table (doctor_id uuid, slot_date date, slot_time text)
language sql
stable
security definer
set search_path = public
as $$
  select r.doctor_id, r.preferred_date, r.preferred_time_band
  from public.appointment_requests r
  where r.doctor_id is not null
    and r.preferred_date is not null
    and r.preferred_time_band is not null
    and r.preferred_date >= current_date
    and r.status not in ('cancelled', 'rejected');
$$;

revoke all on function public.taken_slots() from public;
grant execute on function public.taken_slots() to anon, authenticated;
