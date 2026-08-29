-- ============================================================================
-- DATOS DE EJEMPLO  ·  Clínica de Ojos S.R.L.
-- ----------------------------------------------------------------------------
-- 25 solicitudes ficticias, para ver el panel y las estadísticas con contenido.
--
-- Son INVENTADAS. Se reconocen porque el código empieza con DEMO- en lugar de
-- CO-, los DNI arrancan en 90.1xx.xxx y los teléfonos son 264-555-xxxx.
-- Ninguna corresponde a una persona real.
--
-- Las fechas y horarios respetan la agenda real de cada profesional, así que las
-- estadísticas por día y por franja tienen sentido.
--
-- PARA BORRARLAS TODAS, cuando ya no las necesites:
--     delete from public.appointment_requests where request_code like 'DEMO-%';
--
-- Se puede correr más de una vez: no duplica.
-- ============================================================================

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0001', 'other_service', d.id, false, 'obra_social', 'PAMI', date '2026-08-31', '18:30', 'Ana', 'Ferreyra', '90100000', '2645551000', 'ana.ferreyra@ejemplo.com', 'confirmed'::public.request_status, now() - interval '8 days'
from public.doctors d where d.full_name = 'Dr. José Manrique'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0002', 'follow_up', d.id, false, 'obra_social', 'PAMI', date '2026-09-01', '16:00', 'Roberto', 'Quiroga', '90100137', '2645551001', null, 'new'::public.request_status, now() - interval '18 days'
from public.doctors d where d.full_name = 'Dr. Gustavo Méndez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0003', 'first_consultation', d.id, false, 'prepaga', 'Swiss Medical', date '2026-08-26', '15:00', 'Marta', 'Olivera', '90100274', '2645551002', null, 'confirmed'::public.request_status, now() - interval '10 days'
from public.doctors d where d.full_name = 'Dra. Carolina Lorenzo'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0004', 'other_service', d.id, false, 'particular', null, date '2026-09-17', '10:00', 'Julio', 'Balmaceda', '90100411', '2645551003', 'julio.balmaceda@ejemplo.com', 'confirmed'::public.request_status, now() - interval '4 days'
from public.doctors d where d.full_name = 'Dr. Matías Sánchez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0005', 'follow_up', d.id, false, 'obra_social', 'PAMI', date '2026-09-11', '16:30', 'Silvia', 'Nievas', '90100548', '2645551004', null, 'confirmed'::public.request_status, now() - interval '4 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0006', 'follow_up', d.id, false, 'particular', null, date '2026-08-10', '10:30', 'Héctor', 'Carrizo', '90100685', '2645551005', null, 'confirmed'::public.request_status, now() - interval '9 days'
from public.doctors d where d.full_name = 'Dr. Gustavo Méndez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
values ('DEMO-0007', 'first_consultation', null, true, 'obra_social', 'PAMI', date '2026-08-21', '17:30', 'Norma', 'Aciar', '90100822', '2645551006', 'norma.aciar@ejemplo.com', 'new'::public.request_status, now() - interval '19 days')
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0008', 'first_consultation', d.id, false, 'prepaga', 'Sancor Salud', date '2026-08-12', '16:00', 'Rubén', 'Páez', '90100959', '2645551007', null, 'under_review'::public.request_status, now() - interval '9 days'
from public.doctors d where d.full_name = 'Dra. Carolina Lorenzo'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0009', 'study', d.id, false, 'obra_social', 'OSDE', date '2026-08-06', '16:30', 'Elena', 'Riveros', '90101096', '2645551008', null, 'under_review'::public.request_status, now() - interval '16 days'
from public.doctors d where d.full_name = 'Dr. Gustavo Méndez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0010', 'follow_up', d.id, false, 'obra_social', 'PAMI', null, null, 'Osvaldo', 'Bustos', '90101233', '2645551009', 'osvaldo.bustos@ejemplo.com', 'confirmed'::public.request_status, now() - interval '13 days'
from public.doctors d where d.full_name = 'Dr. Mauricio Sansó'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0011', 'study', d.id, false, 'prepaga', 'Sancor Salud', date '2026-08-31', '19:00', 'Gladys', 'Moyano', '90101370', '2645551010', null, 'cancelled'::public.request_status, now() - interval '21 days'
from public.doctors d where d.full_name = 'Dr. José Manrique'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0012', 'follow_up', d.id, false, 'obra_social', 'OSDE', date '2026-09-15', '11:00', 'Raúl', 'Zalazar', '90101507', '2645551011', null, 'under_review'::public.request_status, now() - interval '6 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0013', 'first_consultation', d.id, false, 'obra_social', 'OSDE', date '2026-08-19', '15:30', 'Beatriz', 'Cortez', '90101644', '2645551012', 'beatriz.cortez@ejemplo.com', 'confirmed'::public.request_status, now() - interval '6 days'
from public.doctors d where d.full_name = 'Dra. Carolina Lorenzo'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0014', 'follow_up', d.id, false, 'particular', null, date '2026-08-06', '09:30', 'Alberto', 'Godoy', '90101781', '2645551013', null, 'confirmed'::public.request_status, now() - interval '25 days'
from public.doctors d where d.full_name = 'Dr. Matías Sánchez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0015', 'study', d.id, false, 'obra_social', 'OSECAC', date '2026-08-07', '15:00', 'Mirta', 'Recabarren', '90101918', '2645551014', null, 'confirmed'::public.request_status, now() - interval '9 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0016', 'first_consultation', d.id, false, 'obra_social', 'PAMI', date '2026-09-07', '17:00', 'Carlos', 'Illanes', '90102055', '2645551015', 'carlos.illanes@ejemplo.com', 'confirmed'::public.request_status, now() - interval '27 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0017', 'other_service', d.id, false, 'particular', null, date '2026-08-18', '16:30', 'Susana', 'Varas', '90102192', '2645551016', null, 'cancelled'::public.request_status, now() - interval '12 days'
from public.doctors d where d.full_name = 'Dr. Gustavo Méndez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
values ('DEMO-0018', 'first_consultation', null, true, 'prepaga', 'Galeno', date '2026-09-15', '10:30', 'Jorge', 'Maurín', '90102329', '2645551017', null, 'entered_in_isalud'::public.request_status, now() - interval '27 days')
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0019', 'follow_up', d.id, false, 'obra_social', 'OSDE', date '2026-08-27', '09:30', 'Teresa', 'Guevara', '90102466', '2645551018', 'teresa.guevara@ejemplo.com', 'new'::public.request_status, now() - interval '20 days'
from public.doctors d where d.full_name = 'Dr. Matías Sánchez'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0020', 'study', d.id, false, 'obra_social', 'PAMI', date '2026-09-18', '17:00', 'Daniel', 'Agüero', '90102603', '2645551019', null, 'under_review'::public.request_status, now() - interval '22 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0021', 'follow_up', d.id, false, 'obra_social', 'OSDE', null, null, 'Rosa', 'Cabrera', '90102740', '2645551020', null, 'confirmed'::public.request_status, now() - interval '21 days'
from public.doctors d where d.full_name = 'Dr. Mauricio Sansó'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0022', 'study', d.id, false, 'obra_social', 'OSECAC', date '2026-08-11', '09:30', 'Miguel', 'Tejada', '90102877', '2645551021', 'miguel.tejada@ejemplo.com', 'entered_in_isalud'::public.request_status, now() - interval '17 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0023', 'study', d.id, false, 'obra_social', 'OSECAC', date '2026-09-09', '17:00', 'Lucía', 'Sarmiento', '90103014', '2645551022', null, 'under_review'::public.request_status, now() - interval '4 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
values ('DEMO-0024', 'follow_up', null, true, 'prepaga', 'Swiss Medical', date '2026-09-04', '16:30', 'Ernesto', 'Vega', '90103151', '2645551023', null, 'entered_in_isalud'::public.request_status, now() - interval '12 days')
on conflict (request_code) do nothing;

insert into public.appointment_requests (request_code, care_type, doctor_id, first_available, coverage_kind, coverage_name, preferred_date, preferred_time_band, first_name, last_name, dni, phone, email, status, created_at)
select 'DEMO-0025', 'follow_up', d.id, false, 'obra_social', 'PAMI', date '2026-08-07', '14:30', 'Nélida', 'Puebla', '90103288', '2645551024', 'nelida.puebla@ejemplo.com', 'confirmed'::public.request_status, now() - interval '2 days'
from public.doctors d where d.full_name = 'Dra. Celia Larrea'
on conflict (request_code) do nothing;

-- Verificación
select request_code as codigo,
       last_name || ', ' || first_name as paciente,
       coalesce(d.full_name, 'Primer disponible') as profesional,
       coalesce(to_char(preferred_date, 'TM Day DD/MM'), 'a coordinar') as turno,
       coalesce(preferred_time_band, '-') as hora,
       coalesce(coverage_name, coverage_kind::text) as cobertura,
       status as estado
from public.appointment_requests r
left join public.doctors d on d.id = r.doctor_id
where request_code like 'DEMO-%'
order by preferred_date nulls last, preferred_time_band;
