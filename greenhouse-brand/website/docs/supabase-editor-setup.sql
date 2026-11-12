-- MIFTAH site editor: automatic saving of Merav's work (Hanoch approved hg-forms, 12 Nov 2026).
-- Paste in Supabase > project hg-forms > SQL Editor > Run.
-- The public editor can only ADD rows and upload files; nobody can read the table through the site.
create table if not exists public.miftah_editor_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session text not null check (char_length(session) between 6 and 64),
  kind text not null check (kind in ('autosave', 'send', 'backup')),
  round text,
  page text,
  counts jsonb,
  report text check (report is null or char_length(report) < 2000000),
  state jsonb check (state is null or pg_column_size(state) < 4000000),
  ua text check (ua is null or char_length(ua) < 400)
);
create index if not exists miftah_editor_log_created on public.miftah_editor_log (created_at desc);
alter table public.miftah_editor_log enable row level security;
revoke all on public.miftah_editor_log from anon, authenticated;
grant insert on public.miftah_editor_log to anon;
drop policy if exists "editor can add" on public.miftah_editor_log;
create policy "editor can add" on public.miftah_editor_log for insert to anon with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('miftah-editor', 'miftah-editor', true, 26214400,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif','application/pdf','video/mp4','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "miftah editor upload" on storage.objects;
create policy "miftah editor upload" on storage.objects for insert to anon with check (bucket_id = 'miftah-editor');
