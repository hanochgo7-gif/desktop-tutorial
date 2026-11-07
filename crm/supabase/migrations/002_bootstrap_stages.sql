-- Lead steps 1-3 of the sales process (new / attempting / connected) live on the lead's status;
-- the deal pipeline starts at "qualified lead", so the board never shows the same step twice.
-- Also adds the default sources "Instagram/Facebook organic" and "lecture / event".
create or replace function public.crm_bootstrap(p_name text default 'HG')
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); em text; ws uuid; pl uuid; i int := 0; s record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = 'insufficient_privilege'; end if;
  select m.workspace_id into ws from public.crm_members m where m.user_id = uid limit 1;
  if ws is not null then return ws; end if;
  select lower(u.email) into em from auth.users u where u.id = uid;
  if not exists (select 1 from public.crm_allowed_emails a where a.email = em) then
    raise exception 'not_allowed' using errcode = 'insufficient_privilege';
  end if;
  insert into public.crm_workspaces(name) values (coalesce(nullif(trim(p_name), ''), 'HG')) returning id into ws;
  insert into public.crm_members(workspace_id, user_id, role, display_name) values (ws, uid, 'owner', split_part(em, '@', 1));
  insert into public.crm_pipelines(workspace_id, name, is_default, created_by) values (ws, 'מכירות', true, uid) returning id into pl;
  for s in select * from (values
    ('qualified', 'ליד מתאים', 20, 'open', 5), ('discovery_set', 'שיחת אפיון נקבעה', 35, 'open', 7), ('discovery_done', 'שיחת אפיון התקיימה', 50, 'open', 5),
    ('proposal', 'הצעת מחיר נשלחה', 65, 'open', 7), ('negotiation', 'משא ומתן', 80, 'open', 10), ('won', 'נסגר בהצלחה', 100, 'won', null), ('lost', 'נסגר בהפסד', 0, 'lost', null)
  ) v(key, name, prob, kind, rot) loop
    insert into public.crm_stages(workspace_id, pipeline_id, key, name, position, probability, kind, rot_days, created_by)
    values (ws, pl, s.key, s.name, i, s.prob, s.kind, s.rot, uid);
    i := i + 1;
  end loop;
  insert into public.crm_sources(workspace_id, key, name, channel, is_paid, utm_sources, position, created_by) values
    (ws, 'google_ads', 'Google Ads', 'paid_search', true, '{google,adwords}', 0, uid),
    (ws, 'meta_ads', 'Meta Ads (פייסבוק/אינסטגרם)', 'paid_social', true, '{facebook,fb,instagram,ig,meta}', 1, uid),
    (ws, 'organic', 'חיפוש אורגני בגוגל', 'organic_search', false, '{}', 2, uid),
    (ws, 'social', 'אינסטגרם / פייסבוק (אורגני, בלי מודעה)', 'organic_social', false, '{}', 3, uid),
    (ws, 'referral', 'הפניה מלקוח', 'referral', false, '{}', 4, uid),
    (ws, 'outbound', 'פנייה יזומה שלי', 'outbound', false, '{}', 5, uid),
    (ws, 'whatsapp', 'WhatsApp', 'whatsapp', false, '{whatsapp,wa}', 6, uid),
    (ws, 'repeat', 'לקוח חוזר', 'repeat', false, '{}', 7, uid),
    (ws, 'partner', 'שיתוף פעולה', 'partner', false, '{}', 8, uid),
    (ws, 'event', 'הרצאה / כנס / אירוע', 'other', false, '{}', 9, uid),
    (ws, 'other', 'מקור אחר', 'other', false, '{}', 10, uid);
  return ws;
end $$;
revoke all on function public.crm_bootstrap(text) from public, anon;
grant execute on function public.crm_bootstrap(text) to authenticated;
