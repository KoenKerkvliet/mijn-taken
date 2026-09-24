-- Herinneringen, een locatie en opmerkingen bij een taak.
--
-- remind_at is het moment waarop de melding bovenin het scherm verschijnt.
-- reminded_at is wanneer je hem hebt weggeklikt: zolang die ouder is dan
-- remind_at (of leeg), staat de melding er nog. Uitstellen is daardoor niets
-- meer dan remind_at verzetten; een nieuwe herinnering zetten ook.
--
-- location is gewoon tekst, zoals je hem intypt: een adres of een plek. De
-- app maakt er een link naar de kaart van.

alter table public.tasks
  add column if not exists remind_at   timestamptz,
  add column if not exists reminded_at timestamptz,
  add column if not exists location    text check (length(location) <= 200);

-- Voor de vraag die de app steeds stelt: welke herinneringen staan er open?
create index if not exists tasks_user_remind_idx
  on public.tasks (user_id, remind_at)
  where remind_at is not null and completed_at is null;

-- ------------------------------------------------------------ opmerkingen --
-- Een eigen tabel en geen tekstveld op de taak: opmerkingen stapelen zich op,
-- elk met zijn eigen moment, en een taak weggooien neemt ze mee.
create table if not exists public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);

alter table public.task_comments enable row level security;

create policy "eigen opmerkingen" on public.task_comments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
