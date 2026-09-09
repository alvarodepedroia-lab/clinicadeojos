-- ============================================================================
-- ESTADO "ATENDIDO"  ·  Clínica de Ojos S.R.L.
-- ----------------------------------------------------------------------------
-- Suma el cuarto paso del circuito, para marcar cuando el paciente ya vino:
--     Nueva -> En revisión -> Cargada en iSalud -> Atendido
--
-- Los médicos, que hasta ahora solo consultaban, pueden marcar "Atendido" y
-- nada más: no pueden cambiar un turno a ningún otro estado.
--
-- Supabase -> SQL Editor -> New query -> pegar -> Run.
-- No borra ni modifica ningún turno existente.
-- ============================================================================

-- Cuarto paso del circuito: el paciente ya vino y fue atendido.
--
-- Nueva -> En revisión -> Cargada en iSalud -> Atendido

alter type public.request_status add value if not exists 'attended';

-- Los médicos (rol operator) consultan pero no modifican reservas. Con esta
-- función pueden marcar que atendieron a un paciente, y nada más: no pueden
-- cambiar un turno a ningún otro estado.
--
-- Va en plpgsql a propósito. El cuerpo de una función sql se valida al crearla,
-- y el valor 'attended' que acabamos de agregar al tipo todavía no se puede usar
-- dentro de la misma transacción. En plpgsql el cuerpo se resuelve al ejecutar.
create or replace function public.mark_attended(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_staff() then
    raise exception 'Sin permiso';
  end if;

  update public.appointment_requests
  set status = 'attended', updated_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.mark_attended(uuid) from public, anon;
grant execute on function public.mark_attended(uuid) to authenticated;

-- ─── Verificación ───────────────────────────────────────────────────────────
-- Tienen que aparecer los cuatro estados del circuito más los cuatro viejos.
select unnest(enum_range(null::public.request_status))::text as estado_disponible;
