-- The public form only needs to read active professionals and insert a new request.
-- Row-level policies continue to limit what those roles can do.
grant select on table public.doctors to anon, authenticated;
grant insert on table public.appointment_requests to anon, authenticated;
