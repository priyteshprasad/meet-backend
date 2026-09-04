-- Run this in Supabase: SQL Editor → New query → Run

create table if not exists flow (
  id integer primary key check (id = 1),
  json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key,
  current_node text not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions (id) on delete cascade,
  node_id text not null,
  option_id text not null,
  input_text text,
  created_at timestamptz not null default now()
);

create index if not exists answers_session_id_idx on answers (session_id);

alter table flow enable row level security;
alter table sessions enable row level security;
alter table answers enable row level security;
