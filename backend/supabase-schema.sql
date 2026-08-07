-- Run this once in the Supabase project's SQL Editor (Dashboard > SQL Editor > New query)
-- before deploying the backend. Creates the two tables store.js reads/writes,
-- plus the Storage bucket for kpis.xlsx / pending.xlsx / history/*.xlsx.

create table if not exists app_settings (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists kpi_history (
  id text primary key,
  applied_at timestamptz not null,
  month text,
  file_name text not null,
  score_global numeric,
  sheet_name text,
  nombre_indicateurs int
);

create index if not exists kpi_history_applied_at_idx on kpi_history (applied_at desc);

-- Storage bucket. Kept private: the backend (using the service_role key,
-- which bypasses RLS) is the only thing that ever reads/writes it — the
-- browser never talks to Supabase directly.
insert into storage.buckets (id, name, public)
values ('kpi-files', 'kpi-files', false)
on conflict (id) do nothing;
