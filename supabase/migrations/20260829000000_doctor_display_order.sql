-- Orden de los profesionales tal como debe verse en el sitio y en el panel interno.
-- La Dra. Erika Oyola queda al final y fuera de agenda; su registro y su historial se conservan.
update public.doctors set display_order = 1 where full_name = 'Dra. Celia Larrea';
update public.doctors set display_order = 2 where full_name = 'Dra. Carolina Lorenzo';
update public.doctors set display_order = 3 where full_name = 'Dr. Mauricio Sansó';
update public.doctors set display_order = 4 where full_name = 'Dr. José Manrique';
update public.doctors set display_order = 5 where full_name = 'Dr. Gustavo Méndez';
update public.doctors set display_order = 6 where full_name = 'Dr. Matías Sánchez';
update public.doctors set display_order = 7 where full_name = 'Dra. Erika Oyola';
