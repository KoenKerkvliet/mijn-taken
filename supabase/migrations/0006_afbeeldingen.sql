-- Afbeeldingen bij een taak, bijvoorbeeld een foto.
--
-- De bestanden zelf staan in Storage, in een privé-bucket: alleen jij kunt er
-- met een ingelogde sessie bij, en de app vraagt per afbeelding een tijdelijke
-- link. In de tabel staat alleen waar het bestand ligt.
--
-- Het pad is <user_id>/<task_id>/<bestand>. De eerste map is dus altijd je
-- eigen id, en daar leunt het beleid op storage.objects op.
--
-- Een taak weggooien neemt de rijen hier mee (on delete cascade), maar de
-- bestanden in Storage blijven dan staan: dat ruimt de app zelf op, vlak
-- voordat hij de taak verwijdert.

create table if not exists public.task_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path        text not null,
  name        text check (length(name) <= 200),
  created_at  timestamptz not null default now()
);

create index if not exists task_attachments_task_idx
  on public.task_attachments (task_id, created_at);

alter table public.task_attachments enable row level security;

create policy "eigen bijlagen" on public.task_attachments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------- bucket --
-- De app verkleint foto's voor het uploaden; 5 MB is ruim genoeg en houdt een
-- verdwaald los bestand buiten de deur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-images',
  'task-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "eigen afbeeldingen bekijken" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "eigen afbeeldingen uploaden" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "eigen afbeeldingen verwijderen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
