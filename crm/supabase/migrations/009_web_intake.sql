-- Leads from the business's own website: a form on the site calls crm_web_lead() with the workspace's
-- intake token (public by design, like a form address). The function creates or updates the lead, records
-- where the visitor came from (UTM / click id / referrer) as a touchpoint, logs the message and opens a
-- "call back" task. It never returns data to the caller. Admins read or rotate the token in the app.

-- which website addresses may send leads (empty = any); kept in settings so the admin can edit it
-- settings.intakeOrigins: ["https://hgpro.io", ...]

create or replace function public.crm_intake_info()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('workspace_id', w.id, 'token', w.intake_token)
  from public.crm_workspaces w
  where w.id in (select public.crm_my_workspaces()) and public.crm_is_admin(w.id)
  order by w.created_at limit 1
$$;
revoke all on function public.crm_intake_info() from public, anon;
grant execute on function public.crm_intake_info() to authenticated;

create or replace function public.crm_rotate_intake_token()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  select w.id into ws from public.crm_workspaces w
  where w.id in (select public.crm_my_workspaces()) and public.crm_is_admin(w.id) order by w.created_at limit 1;
  if ws is null then raise exception 'not_admin' using errcode = 'insufficient_privilege'; end if;
  update public.crm_workspaces set intake_token = encode(extensions.gen_random_bytes(24), 'hex') where id = ws;
  return public.crm_intake_info();
end $$;
revoke all on function public.crm_rotate_intake_token() from public, anon;
grant execute on function public.crm_rotate_intake_token() to authenticated;

create or replace function public.crm_web_lead(p_token text, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ws public.crm_workspaces;
  v_owner uuid;
  v_name text := left(nullif(trim(p ->> 'name'), ''), 160);
  v_first text; v_last text;
  v_phone text := left(nullif(trim(p ->> 'phone'), ''), 30);
  v_email text := lower(left(nullif(trim(p ->> 'email'), ''), 200));
  v_company text := left(nullif(trim(p ->> 'company'), ''), 120);
  v_msg text := left(nullif(trim(p ->> 'message'), ''), 2000);
  v_form text := left(coalesce(nullif(trim(p ->> 'form'), ''), 'טופס באתר'), 80);
  v_page text := left(nullif(p ->> 'page', ''), 500);
  v_landing text := left(nullif(p ->> 'landing_page', ''), 500);
  v_ref text := left(nullif(p ->> 'referrer', ''), 500);
  v_utm_source text := lower(left(nullif(trim(p ->> 'utm_source'), ''), 100));
  v_utm_medium text := lower(left(nullif(trim(p ->> 'utm_medium'), ''), 100));
  v_click_type text; v_click text;
  v_origin text := coalesce(current_setting('request.headers', true)::json ->> 'origin', '');
  v_allowed jsonb;
  v_fields text := '';
  v_body text;
  k text; v text; n int := 0;
  src uuid; cid uuid; existing boolean := false;
begin
  -- bots fill every field, people never see this one
  if coalesce(p ->> 'hp', '') <> '' then return jsonb_build_object('ok', true); end if;

  select * into ws from public.crm_workspaces where intake_token = p_token;
  if ws.id is null then raise exception 'invalid_token' using errcode = 'invalid_authorization_specification'; end if;

  v_allowed := ws.settings -> 'intakeOrigins';
  if jsonb_typeof(v_allowed) = 'array' and jsonb_array_length(v_allowed) > 0 and v_origin <> ''
     and not exists (select 1 from jsonb_array_elements_text(v_allowed) a where rtrim(lower(a), '/') = rtrim(lower(v_origin), '/')) then
    raise exception 'origin_not_allowed' using errcode = 'insufficient_privilege';
  end if;

  -- flood guard: at most 20 web leads per workspace in 10 minutes, 200 a day (migration 010)
  if (select count(*) from public.crm_touchpoints t where t.workspace_id = ws.id and t.kind = 'form' and t.created_at > now() - interval '10 minutes') >= 20
     or (select count(*) from public.crm_touchpoints t where t.workspace_id = ws.id and t.kind = 'form' and t.created_at > now() - interval '1 day') >= 200 then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;

  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then v_email := null; end if;
  if v_phone is not null and length(regexp_replace(v_phone, '\D', '', 'g')) not between 8 and 15 then v_phone := null; end if;
  if v_name is null and v_phone is null and v_email is null then
    raise exception 'missing_contact' using errcode = 'check_violation', hint = 'name, phone or email is required';
  end if;
  v_first := split_part(coalesce(v_name, ''), ' ', 1);
  v_last := nullif(trim(substr(coalesce(v_name, ''), length(v_first) + 1)), '');
  v_first := left(nullif(v_first, ''), 80); v_last := left(v_last, 80);

  -- the other answers on the form, as readable lines (at most 20, each short): a list of [question, answer]
  -- keeps the form's order; an object is accepted too
  if jsonb_typeof(p -> 'fields') in ('object', 'array') then
    for k, v in select case when jsonb_typeof(p -> 'fields') = 'array' then e.value ->> 0 else e.key end,
                       case when jsonb_typeof(p -> 'fields') = 'array' then e.value ->> 1 else e.value #>> '{}' end
                from (select null::text as key, value, ord from jsonb_array_elements(case when jsonb_typeof(p -> 'fields') = 'array' then p -> 'fields' else '[]' end) with ordinality as a(value, ord)
                      union all select key, value, 0 from jsonb_each(case when jsonb_typeof(p -> 'fields') = 'object' then p -> 'fields' else '{}' end)) e
                order by e.ord loop
      continue when k is null;
      n := n + 1; exit when n > 20;
      v_fields := v_fields || left(k, 60) || ': ' || left(coalesce(v, ''), 300) || E'\n';
    end loop;
  end if;

  -- click ids say which ad network sent the visitor
  if nullif(p ->> 'gclid', '') is not null then v_click_type := 'gclid'; v_click := p ->> 'gclid';
  elsif nullif(p ->> 'gbraid', '') is not null then v_click_type := 'gbraid'; v_click := p ->> 'gbraid';
  elsif nullif(p ->> 'wbraid', '') is not null then v_click_type := 'wbraid'; v_click := p ->> 'wbraid';
  elsif nullif(p ->> 'fbclid', '') is not null then v_click_type := 'fbclid'; v_click := p ->> 'fbclid';
  elsif nullif(p ->> 'msclkid', '') is not null then v_click_type := 'msclkid'; v_click := p ->> 'msclkid';
  elsif nullif(p ->> 'ttclid', '') is not null then v_click_type := 'ttclid'; v_click := p ->> 'ttclid';
  end if;
  v_click := left(v_click, 300);

  -- source: utm_source the user mapped to a source, then click id, then the referring site, else "the website"
  if v_utm_source is not null then
    select s.id into src from public.crm_sources s
    where s.workspace_id = ws.id and s.deleted_at is null and (v_utm_source = any(s.utm_sources) or s.key = v_utm_source)
    order by (s.is_paid = (v_utm_medium in ('cpc', 'ppc', 'paid', 'paid_social', 'cpm'))) desc, s.position limit 1;
  end if;
  if src is null and v_click_type in ('gclid', 'gbraid', 'wbraid') then
    select s.id into src from public.crm_sources s where s.workspace_id = ws.id and s.key = 'google_ads' and s.deleted_at is null;
  end if;
  if src is null and v_click_type = 'fbclid' and v_utm_medium in ('cpc', 'paid', 'paid_social', 'cpm') then
    select s.id into src from public.crm_sources s where s.workspace_id = ws.id and s.key = 'meta_ads' and s.deleted_at is null;
  end if;
  if src is null and v_ref is not null then
    select s.id into src from public.crm_sources s where s.workspace_id = ws.id and s.deleted_at is null and s.key = case
      when v_ref ~* '://([a-z0-9-]+\.)*(google|bing|duckduckgo|yahoo)\.' then 'organic'
      when v_ref ~* '://([a-z0-9-]+\.)*(facebook|instagram|fb|t|linkedin|tiktok)\.(com|co|me)' or v_click_type = 'fbclid' then 'social'
      when v_ref ~* '://([a-z0-9-]+\.)*(wa\.me|whatsapp\.com)' then 'whatsapp'
      else 'other' end;
  end if;
  if src is null then
    select s.id into src from public.crm_sources s where s.workspace_id = ws.id and s.key = 'website' and s.deleted_at is null;
    if src is null then
      insert into public.crm_sources (workspace_id, key, name, channel, is_paid, position)
      values (ws.id, 'website', 'האתר (כניסה ישירה)', 'direct', false, 11) returning id into src;
    end if;
  end if;

  select m.user_id into v_owner from public.crm_members m where m.workspace_id = ws.id and m.role = 'owner' order by m.created_at limit 1;

  -- the same person again (phone or email): add to their lead instead of a duplicate
  select c.id into cid from public.crm_contacts c
  where c.workspace_id = ws.id and c.deleted_at is null
    and ((v_phone is not null and c.phone_norm = public.crm_norm_phone(v_phone)) or (v_email is not null and c.email = v_email))
  order by c.created_at limit 1;
  existing := cid is not null;

  -- a double submit within two minutes is the same inquiry
  if existing and exists (select 1 from public.crm_touchpoints t where t.contact_id = cid and t.kind = 'form' and t.created_at > now() - interval '2 minutes') then
    return jsonb_build_object('ok', true);
  end if;

  if not existing then
    insert into public.crm_contacts (workspace_id, first_name, last_name, phone, email, company_name, need, origin, owner_id, lead_status, lifecycle,
      marketing_consent, consent_source, consent_text)
    values (ws.id, v_first, v_last, v_phone, v_email, v_company, v_msg, 'form', v_owner, 'new', 'lead',
      coalesce(p ->> 'consent', '') in ('true', '1', 'on'), case when coalesce(p ->> 'consent', '') in ('true', '1', 'on') then 'web_form' end, left(nullif(p ->> 'consent_text', ''), 500))
    returning id into cid;
  end if;

  insert into public.crm_touchpoints (workspace_id, contact_id, kind, source_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    click_id_type, click_id, landing_page, referrer, form_name, note)
  values (ws.id, cid, 'form', src, v_utm_source, v_utm_medium, left(nullif(p ->> 'utm_campaign', ''), 150), left(nullif(p ->> 'utm_content', ''), 150),
    left(nullif(p ->> 'utm_term', ''), 150), v_click_type, v_click, coalesce(v_landing, v_page), v_ref, v_form, left(v_page, 300));

  v_body := concat_ws(E'\n\n', v_msg, nullif(btrim(v_fields, E' \n'), ''), case when v_page is not null then 'נשלח מהעמוד: ' || v_page end);
  insert into public.crm_activities (workspace_id, type, contact_id, subject, body, direction, owner_id, meta)
  values (ws.id, 'note', cid, left('פנייה מהאתר: ' || v_form, 200), left(coalesce(v_body, 'פנייה מהאתר'), 20000), 'in', v_owner,
    jsonb_build_object('source', 'web_form', 'form', v_form));

  insert into public.crm_tasks (workspace_id, title, type, due_at, contact_id, owner_id, priority)
  values (ws.id, left('לחזור לפנייה מהאתר: ' || coalesce(v_name, v_phone, v_email), 200), case when v_phone is not null then 'call' else 'email' end,
    now() + interval '15 minutes', cid, v_owner, 'high');

  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.crm_web_lead(text, jsonb) from public;
grant execute on function public.crm_web_lead(text, jsonb) to anon, authenticated;
