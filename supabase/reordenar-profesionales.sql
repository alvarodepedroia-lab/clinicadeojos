-- ============================================================================
-- Cambiar el orden de dos profesionales  ·  Clínica de Ojos S.R.L.
-- ----------------------------------------------------------------------------
-- El Dr. Mauricio Sansó pasa al segundo lugar y la Dra. Carolina Lorenzo al
-- tercero, tanto en la web como en el formulario de turnos y en el panel.
--
-- Supabase -> SQL Editor -> New query -> pegar -> Run.
-- No toca turnos ni horarios: solo el orden en que se muestran.
-- ============================================================================

update public.doctors set display_order = 2 where full_name = 'Dr. Mauricio Sansó';
update public.doctors set display_order = 3 where full_name = 'Dra. Carolina Lorenzo';

-- Verificación: tienen que salir en este orden.
select display_order as orden, full_name as profesional,
       case when active then 'en agenda' else 'fuera de agenda' end as estado
from public.doctors
order by display_order;
