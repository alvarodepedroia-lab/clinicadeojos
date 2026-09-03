-- ============================================================================
-- BLOQUEAR HORARIOS TOMADOS  ·  Clínica de Ojos S.R.L.
-- ----------------------------------------------------------------------------
-- Un turno tomado deja de ofrecerse. Hasta ahora dos pacientes podían pedir el
-- mismo profesional, el mismo día y a la misma hora.
--
-- Supabase -> SQL Editor -> New query -> pegar -> Run.
-- No borra ni modifica ningún turno.
--
-- SI DA ERROR "could not create unique index" significa que ya hay dos turnos
-- pisados. La consulta del final los muestra: cancelá uno de los dos desde el
-- panel y volvé a correr este archivo.
-- ============================================================================

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

-- ─── Verificación ───────────────────────────────────────────────────────────
-- Si el índice se creó, esto no devuelve ninguna fila. Si algo falló, acá
-- aparecen los horarios que están pisados.
select d.full_name as profesional,
       r.preferred_date as dia,
       r.preferred_time_band as hora,
       count(*) as turnos,
       string_agg(r.request_code, ', ') as codigos
from public.appointment_requests r
join public.doctors d on d.id = r.doctor_id
where r.preferred_date is not null
  and r.preferred_time_band is not null
  and r.status not in ('cancelled', 'rejected')
group by d.full_name, r.preferred_date, r.preferred_time_band
having count(*) > 1
order by r.preferred_date;
