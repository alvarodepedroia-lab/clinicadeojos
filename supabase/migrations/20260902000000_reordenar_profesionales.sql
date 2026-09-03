-- El Dr. Mauricio Sansó pasa al segundo lugar y la Dra. Carolina Lorenzo al tercero.
update public.doctors set display_order = 2 where full_name = 'Dr. Mauricio Sansó';
update public.doctors set display_order = 3 where full_name = 'Dra. Carolina Lorenzo';
