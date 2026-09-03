create extension if not exists pgcrypto;

create table if not exists public.repair_notes (
  id uuid primary key default gen_random_uuid(),
  vehicle_name text not null default '',
  manufacturer text not null default '',
  model text not null default '',
  mileage_or_hours text not null default '',
  symptom text not null,
  error_codes text not null default '',
  inspection text not null default '',
  root_cause text not null default '',
  repair_action text not null default '',
  parts_used text not null default '',
  result text not null default '',
  is_resolved boolean not null default false,
  tags text not null default '',
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repair_note_photos (
  id uuid primary key default gen_random_uuid(),
  repair_note_id uuid not null references public.repair_notes(id) on delete cascade,
  drive_file_id text not null,
  file_name text not null default '',
  mime_type text not null default '',
  web_view_link text,
  thumbnail_link text,
  created_at timestamptz not null default now()
);

create index if not exists repair_notes_created_at_idx
  on public.repair_notes (created_at desc);

create index if not exists repair_notes_symptom_idx
  on public.repair_notes using gin (to_tsvector('simple', search_text));

alter table public.repair_notes enable row level security;
alter table public.repair_note_photos enable row level security;

-- 이 MVP의 API는 서버의 service role key로만 DB에 접근합니다.
-- 사용자 로그인을 추가하는 단계에서 user_id와 사용자별 RLS 정책을 추가합니다.