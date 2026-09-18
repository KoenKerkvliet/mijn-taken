-- Lijsten archiveren.
--
-- Een gearchiveerde lijst verdwijnt uit de zijbalk en zijn taken tellen
-- nergens meer mee, maar hij blijft bestaan en is met één klik terug te
-- halen. Weggooien is definitief; opbergen hoort dat niet te zijn.
--
-- Een kolom en geen aparte tabel: het is een eigenschap van de lijst, en zo
-- blijft alles wat eraan hangt (taken, labels) gewoon staan.

alter table public.lists
  add column if not exists archived_at timestamptz;

-- Alleen de niet-gearchiveerde lijsten worden opgehaald voor de zijbalk.
create index if not exists lists_user_archived_idx
  on public.lists (user_id, archived_at);
