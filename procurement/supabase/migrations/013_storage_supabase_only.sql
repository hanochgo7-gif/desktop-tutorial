-- 013 (Supabase only; skipped by the local test database, which has no Storage):
-- private bucket for attachments (quotes, invoices, delivery notes, photos of damaged goods, supplier certificates).
-- Object path: <org_id>/<entity>/<entity_id>/<file name>. Members of the organization read; members who can work on
-- documents upload; nobody overwrites or deletes (history stays).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 26214400,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1]::uuid in (select public.my_orgs()));

create policy attachments_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments'
    and (storage.foldername(name))[1]::uuid in (select public.my_orgs())
    and (storage.foldername(name))[2] in ('request', 'rfq', 'quote', 'po', 'receipt', 'invoice', 'supplier', 'item', 'asset', 'site')
    and public.my_role((storage.foldername(name))[1]::uuid) not in ('viewer', 'auditor'));
-- no update or delete policies: files are kept
