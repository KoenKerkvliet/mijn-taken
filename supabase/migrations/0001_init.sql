-- Mijn taken - basisschema.
--
-- Alles hangt aan auth.users. Er is bewust geen aparte profiles-tabel: er is
-- maar een gebruiker en RLS doet al het werk via auth.uid().
--
-- Projecten komen later; tasks krijgt dan een project_id erbij. Daarom staat
-- list_id nu al als 'nullable' - een taak zonder lijst is de inbox.

-- ---------------------------------------------------------------- lijsten --
create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  color       text not null default '#6366f1',
  icon        text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index lists_user_position_idx on public.lists (user_id, position);

-- ----------------------------------------------------------------- labels --
create table public.labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 40),
  color       text not null default '#64748b',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ------------------------------------------------------------------ taken --
-- parent_id maakt subtaken: een subtaak is gewoon een taak met een ouder.
-- on delete cascade, want een subtaak zonder ouder is een weesje dat nergens
-- meer in beeld komt.
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id       uuid references public.lists (id) on delete set null,
  parent_id     uuid references public.tasks (id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 500),
  description   text,
  due_date      date,
  priority      smallint not null default 4 check (priority between 1 and 4),
  completed_at  timestamptz,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_user_due_idx      on public.tasks (user_id, due_date) where completed_at is null;
create index tasks_user_list_idx     on public.tasks (user_id, list_id);
create index tasks_parent_idx        on public.tasks (parent_id);
create index tasks_user_completed_idx on public.tasks (user_id, completed_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------- labels op taken --
create table public.task_labels (
  task_id   uuid not null references public.tasks (id) on delete cascade,
  label_id  uuid not null references public.labels (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (task_id, label_id)
);

create index task_labels_label_idx on public.task_labels (label_id);

-- -------------------------------------------------------------------- RLS --
-- Elke tabel: je ziet en wijzigt uitsluitend je eigen rijen. Zonder deze
-- policies is de publishable key genoeg om bij andermans data te komen.
alter table public.lists       enable row level security;
alter table public.labels      enable row level security;
alter table public.tasks       enable row level security;
alter table public.task_labels enable row level security;

create policy "eigen lijsten" on public.lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "eigen labels" on public.labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "eigen taken" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "eigen tasklabels" on public.task_labels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
