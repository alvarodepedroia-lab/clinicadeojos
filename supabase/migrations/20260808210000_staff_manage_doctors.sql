revoke insert, update, delete on table public.doctors from anon;
grant select, update on table public.doctors to authenticated;

create policy "active staff view all doctors"
on public.doctors
for select
to authenticated
using (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active
  )
);

create policy "administrators update doctors"
on public.doctors
for update
to authenticated
using (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
  )
)
with check (
  exists (
    select 1 from public.staff_profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'administrator'
  )
);
