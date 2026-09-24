-- Hoe lang een taak duurt.
--
-- Een inschatting in hele minuten, ingetypt als "30m" of "1u" in de titel of
-- in het veld van het taakvenster. Leeg betekent: niet ingeschat. Meer dan
-- een dag is geen inschatting meer, vandaar de grens.

alter table public.tasks
  add column if not exists duration_minutes integer
    check (duration_minutes between 1 and 1440);
