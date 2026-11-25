-- Local only: a demo login and a demo organization filled by demo_seed().
insert into auth.users(id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000d001', 'demo@example.com', '{"full_name":"משתמש הדגמה"}') on conflict do nothing;
insert into public.allowed_org_creators(email) values ('demo@example.com') on conflict do nothing;
begin; set local role authenticated; set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d001';
select public.org_create('ש.גוטובסקי – הדגמה', true) ->> 'id' as org \gset
select public.demo_seed(:'org');
commit;
