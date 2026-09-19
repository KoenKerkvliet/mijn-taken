-- Taken die terugkomen.
--
-- De regel staat als klein stukje JSON in een tekstkolom: {"eenheid":"week",
-- "stap":1,"weekdag":1}. Geen aparte tabel en geen enum, want het is één
-- eigenschap van één taak, en de app is de enige die het leest.
--
-- Afvinken van zo'n taak schuift hem door naar de volgende keer en laat een
-- afgeronde kopie achter (zonder recurrence). Zo blijft de historie kloppen:
-- wat je gedaan hebt staat in Afgerond en telt mee voor je dagelijkse doel.

alter table public.tasks
  add column if not exists recurrence text;
