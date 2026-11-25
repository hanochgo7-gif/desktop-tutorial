-- 011: demo data. Fills an organization marked is_demo with six months of history so every screen can be tried.
-- Refuses to run on a production organization. All names are invented and labelled as demo.

-- Ledger line with an explicit time (history), same rules as stock_apply. Internal to the seed.
create or replace function public.demo_move(p_org uuid, p_site uuid, p_item uuid, p_type text, p_qty numeric, p_cost numeric, p_at timestamptz,
  p_ref_type text default 'manual', p_ref_id uuid default null, p_ref_no text default null, p_reason text default null, p_by uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.stock_balances;
begin
  insert into public.stock_balances(org_id, site_id, item_id) values (p_org, p_site, p_item) on conflict do nothing;
  select * into b from public.stock_balances where site_id = p_site and item_id = p_item for update;
  if b.on_hand + p_qty < 0 then return; end if;            -- the generator never drives stock negative
  if p_qty > 0 and p_cost is not null then
    update public.stock_balances set avg_cost = round((b.on_hand * b.avg_cost + p_qty * p_cost) / nullif(b.on_hand + p_qty, 0), 4) where site_id = p_site and item_id = p_item;
  end if;
  update public.stock_balances set on_hand = on_hand + p_qty, updated_at = p_at where site_id = p_site and item_id = p_item;
  insert into public.stock_movements(org_id, site_id, item_id, type, qty_delta, unit_cost, ref_type, ref_id, ref_no, reason, balance_after, created_by, created_at)
  values (p_org, p_site, p_item, p_type, p_qty, coalesce(case when p_qty > 0 then p_cost end, b.avg_cost), p_ref_type, p_ref_id, p_ref_no, p_reason, b.on_hand + p_qty, p_by, p_at);
end $$;

create or replace function public.demo_seed(p_org uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.orgs; v_me uuid := (select auth.uid()); v_by uuid; v_buyer uuid := gen_random_uuid();
  s_w uuid; s_n uuid; s_c uuid; s_s uuid; s_e uuid; v_sites uuid[];
  c_pipe uuid; c_valve uuid; c_weld uuid; c_safe uuid; c_build uuid; c_elec uuid; c_tools uuid; c_office uuid; c_mach uuid;
  t_cons uuid; t_fixed uuid; t_tool uuid; t_safe uuid; t_office uuid; t_elec uuid; t_mach uuid;
  sup uuid[]; v_item record; v_site uuid; d date; v_po uuid; v_no text; v_line uuid; v_rec uuid; v_inv uuid; v_qty numeric; v_price numeric;
  v_exp date; v_rcv date; v_sup uuid; n_po int := 0; v_status text; v_net numeric; v_i int; v_req uuid; v_rfq uuid; v_q uuid; rl record;
begin
  select * into o from public.orgs where id = p_org;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not o.is_demo then raise exception 'NOT_A_DEMO_ORG' using errcode = 'P0001'; end if;
  if v_me is not null and public.my_role(p_org) <> 'super_admin' then raise exception 'FORBIDDEN:settings.manage' using errcode = '42501'; end if;
  if exists (select 1 from public.items where org_id = p_org) then raise exception 'DEMO_ALREADY_SEEDED' using errcode = 'P0001'; end if;
  v_by := coalesce(v_me, (select user_id from public.memberships where org_id = p_org and role = 'super_admin' limit 1));
  perform setseed(0.42);
  -- a demo colleague (no login) who opened the documents waiting today, so the demo user can approve them
  insert into public.profiles(id, email, full_name) values (v_buyer, 'buyer-' || left(v_buyer::text, 8) || '@demo.invalid', 'קניין (הדגמה)');
  insert into public.memberships(org_id, user_id, role, all_sites) values (p_org, v_buyer, 'buyer', true);

  -- sites
  insert into public.sites(org_id, code, name, kind, status, address, manager_id, opened_on, phase, needs) values
    (p_org, 'WH', 'מחסן מרכזי (הדגמה)', 'warehouse', 'active', 'אזור תעשייה (הדגמה)', v_by, current_date - 900, null, null) returning id into s_w;
  insert into public.sites(org_id, code, name, kind, status, address, manager_id, opened_on, expected_close_on, phase, needs) values
    (p_org, 'N1', 'אתר צפון – חוות שרתים (הדגמה)', 'site', 'active', 'צפון (הדגמה)', v_by, current_date - 200, current_date + 160, 'הנחת צנרת', 'צנרת, מגופים וציוד ריתוך בכמויות גדולות') returning id into s_n;
  insert into public.sites(org_id, code, name, kind, status, address, manager_id, opened_on, expected_close_on, phase, needs) values
    (p_org, 'C1', 'אתר מרכז – חוות שרתים (הדגמה)', 'site', 'active', 'מרכז (הדגמה)', v_by, current_date - 120, current_date + 240, 'עבודות עפר והטמנת מיכלים', 'ציוד בטיחות, חומרי בנייה ומכונות') returning id into s_c;
  insert into public.sites(org_id, code, name, kind, status, address, manager_id, opened_on, expected_close_on, phase, needs) values
    (p_org, 'S1', 'אתר דרום – תחנת תדלוק (הדגמה)', 'site', 'active', 'דרום (הדגמה)', v_by, current_date - 60, current_date + 90, 'שיפוץ רחבת תדלוק', 'חומרים מתכלים וציוד חשמלי') returning id into s_s;
  insert into public.sites(org_id, code, name, kind, status, address, opened_on, phase) values
    (p_org, 'E1', 'אתר מזרח (הדגמה)', 'site', 'planned', 'מזרח (הדגמה)', current_date + 45, 'תכנון') returning id into s_e;
  v_sites := array[s_n, s_c, s_s];

  -- categories
  insert into public.categories(org_id, name) values (p_org, 'צנרת ואביזרים') returning id into c_pipe;
  insert into public.categories(org_id, parent_id, name) values (p_org, c_pipe, 'מגופים ואוגנים') returning id into c_valve;
  insert into public.categories(org_id, name) values (p_org, 'ריתוך וחיתוך') returning id into c_weld;
  insert into public.categories(org_id, name) values (p_org, 'ציוד בטיחות') returning id into c_safe;
  insert into public.categories(org_id, name) values (p_org, 'חומרי בנייה') returning id into c_build;
  insert into public.categories(org_id, name) values (p_org, 'ציוד חשמלי') returning id into c_elec;
  insert into public.categories(org_id, name) values (p_org, 'כלי עבודה') returning id into c_tools;
  insert into public.categories(org_id, name) values (p_org, 'ציוד משרדי') returning id into c_office;
  insert into public.categories(org_id, name) values (p_org, 'מכונות וציוד כבד') returning id into c_mach;
  select id into t_cons from public.item_types where org_id = p_org and name = 'ציוד מתכלה';
  select id into t_fixed from public.item_types where org_id = p_org and name = 'ציוד קבוע';
  select id into t_tool from public.item_types where org_id = p_org and name = 'כלי עבודה';
  select id into t_safe from public.item_types where org_id = p_org and name = 'ציוד בטיחות';
  select id into t_office from public.item_types where org_id = p_org and name = 'ציוד משרדי';
  select id into t_elec from public.item_types where org_id = p_org and name = 'ציוד חשמלי';
  select id into t_mach from public.item_types where org_id = p_org and name = 'מכונות';

  -- items: sku, name, category, type, uom, min, max, lead time, base price, weekly use per site
  create temporary table demo_items (sku text, name text, cat uuid, typ uuid, uom text, mn numeric, mx numeric, lead int, price numeric, use_w numeric) on commit drop;
  insert into demo_items values
    ('PIP-ST-4', 'צינור פלדה 4" (6 מ׳)', c_pipe, t_cons, 'יח׳', 20, 120, 14, 420, 6),
    ('PIP-ST-2', 'צינור פלדה 2" (6 מ׳)', c_pipe, t_cons, 'יח׳', 30, 150, 14, 210, 8),
    ('PIP-HDPE-110', 'צינור HDPE 110 מ״מ (מטר)', c_pipe, t_cons, 'מטר', 100, 600, 10, 38, 40),
    ('ELB-4-90', 'זווית 90° 4" לריתוך', c_pipe, t_cons, 'יח׳', 20, 100, 10, 65, 6),
    ('FLG-4-150', 'אוגן 4" 150#', c_valve, t_cons, 'יח׳', 10, 60, 21, 140, 3),
    ('VLV-BALL-2', 'מגוף כדורי 2"', c_valve, t_cons, 'יח׳', 6, 40, 21, 380, 1.5),
    ('VLV-GATE-4', 'מגוף שער 4"', c_valve, t_cons, 'יח׳', 4, 20, 30, 1450, 0.6),
    ('BLT-M16', 'בורג M16 עם אום (ערכה)', c_valve, t_cons, 'ערכה', 50, 400, 7, 9, 30),
    ('WLD-E7018', 'אלקטרודות ריתוך 7018 (5 ק״ג)', c_weld, t_cons, 'אריזה', 15, 80, 7, 115, 5),
    ('WLD-DISC-115', 'דיסק חיתוך 115 מ״מ', c_weld, t_cons, 'יח׳', 50, 300, 5, 6.5, 35),
    ('WLD-GAS-AR', 'בלון ארגון (מילוי)', c_weld, t_cons, 'בלון', 4, 20, 3, 260, 1.5),
    ('SAF-HLM', 'קסדת מגן', c_safe, t_safe, 'יח׳', 15, 60, 5, 38, 1.5),
    ('SAF-VST', 'אפוד זוהר', c_safe, t_safe, 'יח׳', 20, 80, 5, 18, 2.5),
    ('SAF-GLV', 'כפפות עבודה', c_safe, t_safe, 'זוג', 60, 300, 5, 11, 20),
    ('SAF-HRN', 'רתמת בטיחות לעבודה בגובה', c_safe, t_safe, 'יח׳', 6, 25, 14, 420, 0.3),
    ('SAF-GOG', 'משקפי מגן', c_safe, t_safe, 'יח׳', 20, 100, 5, 14, 3),
    ('BLD-CEM-50', 'מלט 50 ק״ג', c_build, t_cons, 'שק', 40, 300, 3, 29, 30),
    ('BLD-SAND', 'חול נקי (קוב)', c_build, t_cons, 'קוב', 10, 80, 2, 95, 6),
    ('BLD-LINER', 'יריעת איטום HDPE (מ״ר)', c_build, t_cons, 'מ״ר', 200, 2000, 21, 24, 60),
    ('ELE-CBL-4', 'כבל חשמל 4x16 (מטר)', c_elec, t_elec, 'מטר', 100, 800, 10, 31, 35),
    ('ELE-BRK-32', 'מפסק זרם 32A', c_elec, t_elec, 'יח׳', 10, 50, 10, 85, 1.2),
    ('ELE-LGT', 'פנס הצפה LED לאתר', c_elec, t_elec, 'יח׳', 4, 20, 10, 240, 0.3),
    ('TL-GRND', 'משחזת זווית 115', c_tools, t_tool, 'יח׳', 3, 12, 7, 390, 0.2),
    ('TL-DRL', 'מקדחה רוטטת', c_tools, t_tool, 'יח׳', 2, 8, 7, 850, 0.1),
    ('TL-WRCH', 'מפתח צינורות 24"', c_tools, t_tool, 'יח׳', 3, 12, 7, 170, 0.1),
    ('OFF-PPR', 'נייר A4 (קרטון)', c_office, t_office, 'קרטון', 2, 15, 3, 120, 0.5),
    ('OFF-TNR', 'טונר למדפסת', c_office, t_office, 'יח׳', 1, 6, 5, 310, 0.2),
    ('MCH-WLD', 'רתכת אינוורטר 300A', c_mach, t_mach, 'יח׳', null, null, 30, 9800, 0),
    ('MCH-GEN', 'גנרטור נייד 20 קו״א', c_mach, t_mach, 'יח׳', null, null, 45, 28500, 0),
    ('MCH-PMP', 'משאבת טבילה 3"', c_mach, t_fixed, 'יח׳', null, null, 21, 4200, 0);
  insert into public.items(org_id, sku, name, category_id, type_id, uom, min_qty, max_qty, lead_time_days, description)
  select p_org, sku, name, cat, typ, uom, mn, mx, lead, 'פריט הדגמה' from demo_items;

  -- suppliers
  insert into public.suppliers(org_id, name, company_no, phone, email, payment_terms, credit_days, delivery_terms, fixed_discount_pct, category_ids, notes, status) values
    (p_org, 'צנרת ואביזרים בע״מ (הדגמה)', '510000001', '03-0000001', 'orders1@example.com', 'שוטף + 60', 60, 'הובלה לאתר כלולה מעל 5,000 ₪', 2, array[c_pipe, c_valve], 'ספק הדגמה', 'active'),
    (p_org, 'מתכת והנדסה (הדגמה)', '510000002', '03-0000002', 'orders2@example.com', 'שוטף + 30', 30, 'איסוף עצמי או הובלה בתשלום', 0, array[c_pipe, c_weld], 'ספק הדגמה', 'active'),
    (p_org, 'ציוד בטיחות ישיר (הדגמה)', '510000003', '03-0000003', 'orders3@example.com', 'שוטף + 45', 45, 'משלוח תוך 3 ימים', 5, array[c_safe], 'ספק הדגמה', 'active'),
    (p_org, 'חומרי בניין הדרום (הדגמה)', '510000004', '08-0000004', 'orders4@example.com', 'שוטף + 30', 30, 'פריקה במנוף בתשלום', 0, array[c_build], 'ספק הדגמה. איחורים חוזרים ברבעון האחרון', 'active'),
    (p_org, 'חשמל ותאורה (הדגמה)', '510000005', '03-0000005', 'orders5@example.com', 'שוטף + 60', 60, 'משלוח למחסן המרכזי', 3, array[c_elec, c_tools], 'ספק הדגמה', 'active'),
    (p_org, 'מכונות וציוד כבד (הדגמה)', '510000006', '04-0000006', 'orders6@example.com', 'מקדמה 30%, יתרה שוטף + 30', 30, 'הובלה מיוחדת', 0, array[c_mach], 'ספק הדגמה', 'on_hold');
  select array_agg(id order by company_no) into sup from public.suppliers where org_id = p_org;
  insert into public.supplier_documents(org_id, supplier_id, kind, title, valid_until) values
    (p_org, sup[1], 'insurance', 'ביטוח צד ג׳', current_date + 200),
    (p_org, sup[3], 'certificate', 'תו תקן לציוד מגן', current_date + 20),
    (p_org, sup[4], 'insurance', 'ביטוח צד ג׳', current_date - 5),
    (p_org, sup[6], 'agreement', 'הסכם מסגרת', current_date + 365);
  insert into public.supplier_prices(org_id, supplier_id, item_id, unit_price, valid_from, valid_until, source)
  select p_org, sup[1], i.id, round(di.price * 0.97, 2), current_date - 120, current_date + 245, 'הסכם מסגרת 2026 (הדגמה)'
  from public.items i join demo_items di on di.sku = i.sku where i.org_id = p_org and di.cat in (c_pipe, c_valve);

  insert into public.employees(org_id, name, employee_no, site_id) values
    (p_org, 'עובד הדגמה 1', '101', s_n), (p_org, 'עובד הדגמה 2', '102', s_n), (p_org, 'עובד הדגמה 3', '103', s_c), (p_org, 'עובד הדגמה 4', '104', s_s);

  insert into public.budgets(org_id, name, site_id, period_start, period_end, original_amount, owner_id) values
    (p_org, 'אתר צפון 2026', s_n, date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 680000, v_by),
    (p_org, 'אתר מרכז 2026', s_c, date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 430000, v_by),
    (p_org, 'אתר דרום 2026', s_s, date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 240000, v_by),
    (p_org, 'ציוד בטיחות – כלל החברה 2026', null, date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date, 90000, v_by);
  update public.budgets set category_id = c_safe where org_id = p_org and name like 'ציוד בטיחות%';

  -- opening stock 180 days ago at the warehouse and the two older sites
  for v_item in select i.id, di.* from public.items i join demo_items di on di.sku = i.sku where i.org_id = p_org and di.mx is not null loop
    perform public.demo_move(p_org, s_w, v_item.id, 'opening', round(v_item.mx * 0.8), v_item.price, now() - interval '180 days', 'manual', null, null, 'יתרת פתיחה (הדגמה)', v_by);
    perform public.demo_move(p_org, s_n, v_item.id, 'opening', round(v_item.mx * 0.5), v_item.price, now() - interval '180 days', 'manual', null, null, 'יתרת פתיחה (הדגמה)', v_by);
    perform public.demo_move(p_org, s_c, v_item.id, 'opening', round(v_item.mx * 0.4), v_item.price, now() - interval '110 days', 'manual', null, null, 'יתרת פתיחה (הדגמה)', v_by);
    perform public.demo_move(p_org, s_s, v_item.id, 'opening', round(v_item.mx * 0.3), v_item.price, now() - interval '55 days', 'manual', null, null, 'יתרת פתיחה (הדגמה)', v_by);
  end loop;

  -- 26 weeks of history: consumption at sites, and a purchase order per site and category group when stock runs low
  for v_i in reverse 25..0 loop
    d := current_date - v_i * 7;
    foreach v_site in array v_sites loop
      if v_site = s_c and v_i > 15 then continue; end if;
      if v_site = s_s and v_i > 7 then continue; end if;
      for v_item in select i.id, di.* from public.items i join demo_items di on di.sku = i.sku where i.org_id = p_org and di.use_w > 0 loop
        v_qty := greatest(0, round(v_item.use_w * (0.6 + random()::numeric * 0.8) * case when v_site = s_n then 1.3 when v_site = s_s then 0.6 else 1 end));
        if v_qty > 0 then
          perform public.demo_move(p_org, v_site, v_item.id, 'issue', -v_qty, null, d + time '10:00' + (random()::numeric * interval '6 hours'), 'manual', null, null, 'שימוש באתר (הדגמה)', v_by);
        end if;
      end loop;
      -- every three weeks: reorder what is under minimum
      if v_i % 3 = 0 and v_i > 0 then
        for v_sup in select distinct case when di.cat in (c_pipe, c_valve) then case when random()::numeric < 0.7 then sup[1] else sup[2] end
                                  when di.cat = c_weld then sup[2] when di.cat = c_safe then sup[3] when di.cat = c_build then sup[4]
                                  else sup[5] end
                     from demo_items di where di.use_w > 0 loop
          v_no := public.next_doc_no(p_org, 'PO');
          v_exp := d + 7;
          v_status := 'closed';
          insert into public.purchase_orders(org_id, number, supplier_id, site_id, status, order_date, expected_date, vat_rate, shipping_cost,
              payment_terms, credit_days, created_by, submitted_by, submitted_at, approved_at, sent_at, created_at)
          select p_org, v_no, v_sup, v_site, v_status, d, v_exp, 0.18, case when random()::numeric < 0.4 then 150 else 0 end, s.payment_terms, s.credit_days,
                 v_by, v_by, d, d, d, d
          from public.suppliers s where s.id = v_sup returning id into v_po;
          v_net := 0;
          for v_item in
            select i.id, di.*, b.on_hand from public.items i join demo_items di on di.sku = i.sku
            join public.stock_balances b on b.item_id = i.id and b.site_id = v_site
            where i.org_id = p_org and di.use_w > 0 and b.on_hand < di.mx * 0.6
              and ((di.cat in (c_pipe, c_valve) and v_sup in (sup[1], sup[2])) or (di.cat = c_weld and v_sup = sup[2])
                   or (di.cat = c_safe and v_sup = sup[3]) or (di.cat = c_build and v_sup = sup[4])
                   or (di.cat in (c_elec, c_tools, c_office) and v_sup = sup[5]))
          loop
            v_qty := ceil(v_item.mx - v_item.on_hand);
            -- prices drift: pipes up ~12% over the half year, the second pipe supplier 6% dearer
            v_price := round(v_item.price * (1 + case when v_item.cat in (c_pipe, c_valve) then (25 - v_i) * 0.005 else 0 end)
                                          * case when v_sup = sup[2] then 1.06 else 1 end * (0.97 + random()::numeric * 0.06), 2);
            insert into public.po_lines(po_id, line_no, item_id, qty, unit_price, line_net, received_qty)
            values (v_po, (select count(*) + 1 from public.po_lines where po_id = v_po), v_item.id, v_qty, v_price, round(v_qty * v_price, 2), v_qty)
            returning id into v_line;
            v_net := v_net + round(v_qty * v_price, 2);
          end loop;
          if v_net = 0 then
            update public.purchase_orders set status = 'cancelled', cancel_reason = 'ללא שורות (הדגמה)', cancelled_at = d where id = v_po;
            continue;
          end if;
          perform public.po_recalc(v_po);
          insert into public.approvals(org_id, doc_type, doc_id, step, required_role, status, decided_by, decided_at, created_at)
          values (p_org, 'po', v_po, 1, 'procurement_manager', 'approved', v_by, d, d);
          -- the building-materials supplier is late more and more often
          v_rcv := v_exp + case when v_sup = sup[4] and v_i < 12 then 3 + floor(random()::numeric * 6)::int when random()::numeric < 0.15 then floor(random()::numeric * 4)::int else -floor(random()::numeric * 2)::int end;
          if v_rcv > current_date then v_rcv := current_date; end if;
          insert into public.receipts(org_id, number, po_id, site_id, delivery_note_no, received_at, received_by, on_time, quality_rating, service_rating)
          values (p_org, public.next_doc_no(p_org, 'GR'), v_po, v_site, 'DN-' || (1000 + n_po), v_rcv + time '09:00', v_by, v_rcv <= v_exp,
                  case when v_sup = sup[4] then 3 else 4 + floor(random()::numeric * 2)::int end, case when v_sup = sup[4] then 2 else 4 + floor(random()::numeric * 2)::int end)
          returning id into v_rec;
          for rl in select * from public.po_lines where po_id = v_po loop
            insert into public.receipt_lines(receipt_id, po_line_id, qty_accepted) values (v_rec, rl.id, rl.qty);
            perform public.demo_move(p_org, v_site, rl.item_id, 'receipt', rl.qty, public.net_unit(rl.unit_price, rl.discount_pct), v_rcv + time '09:00',
              'po', v_po, v_no, 'קליטה (הדגמה)', v_by);
          end loop;
          insert into public.invoices(org_id, supplier_id, po_id, invoice_no, invoice_date, due_date, net_amount, vat_amount, total, shipping_charged, status,
              match_result, registered_by, registered_at, approved_by, approved_at, paid_at)
          select p_org, v_sup, v_po, 'D-' || (5000 + n_po), v_rcv + 2, v_rcv + 2 + coalesce(p.credit_days, 30), p.net_total, p.vat_amount, p.total, p.shipping_cost,
                 case when v_rcv + 2 + coalesce(p.credit_days, 30) < current_date then 'paid' else 'approved' end,
                 jsonb_build_object('issues', '[]'::jsonb), v_by, v_rcv + 2, v_by, v_rcv + 3,
                 case when v_rcv + 2 + coalesce(p.credit_days, 30) < current_date then v_rcv + 2 + coalesce(p.credit_days, 30) end
          from public.purchase_orders p where p.id = v_po returning id into v_inv;
          insert into public.invoice_lines(invoice_id, po_line_id, qty, unit_price, line_net)
          select v_inv, l.id, l.qty, l.unit_price, l.line_net from public.po_lines l where l.po_id = v_po;
          n_po := n_po + 1;
        end loop;
      end if;
    end loop;
  end loop;

  -- a few items ran low this week (the forecast and the alerts should catch them)
  for v_item in select i.id, di.mn, b.on_hand, b.site_id from public.items i join demo_items di on di.sku = i.sku
      join public.stock_balances b on b.item_id = i.id
      where i.org_id = p_org and ((di.sku in ('WLD-GAS-AR', 'VLV-BALL-2') and b.site_id = s_n) or (di.sku in ('SAF-HRN', 'BLD-LINER') and b.site_id = s_c)) loop
    if v_item.on_hand > v_item.mn * 0.5 then
      perform public.demo_move(p_org, v_item.site_id, v_item.id, 'issue', -(v_item.on_hand - floor(v_item.mn * 0.5)), null, now() - interval '20 hours',
        'manual', null, null, 'שימוש מוגבר השבוע (הדגמה)', v_by);
    end if;
  end loop;

  -- open documents for today's work
  -- 1. an order on its way, late
  perform public.po_save(jsonb_build_object('org_id', p_org, 'supplier_id', sup[4], 'site_id', s_c, 'expected_date', current_date - 4,
    'lines', jsonb_build_array(jsonb_build_object('item_id', (select id from public.items where org_id = p_org and sku = 'BLD-CEM-50'), 'qty', 200, 'unit_price', 30),
                               jsonb_build_object('item_id', (select id from public.items where org_id = p_org and sku = 'BLD-SAND'), 'qty', 40, 'unit_price', 96))));
  update public.purchase_orders set status = 'sent', submitted_by = v_by, submitted_at = now() - interval '12 days', approved_at = now() - interval '11 days',
    sent_at = now() - interval '11 days', order_date = current_date - 12 where org_id = p_org and status = 'draft';
  -- 2. a partly delivered order
  perform public.po_save(jsonb_build_object('org_id', p_org, 'supplier_id', sup[1], 'site_id', s_n, 'expected_date', current_date + 3,
    'lines', jsonb_build_array(jsonb_build_object('item_id', (select id from public.items where org_id = p_org and sku = 'PIP-ST-4'), 'qty', 100, 'unit_price', 455),
                               jsonb_build_object('item_id', (select id from public.items where org_id = p_org and sku = 'ELB-4-90'), 'qty', 60, 'unit_price', 66))));
  select id into v_po from public.purchase_orders where org_id = p_org and status = 'draft';
  update public.purchase_orders set status = 'partially_received', submitted_by = v_by, submitted_at = now() - interval '6 days', approved_at = now() - interval '5 days',
    sent_at = now() - interval '5 days', order_date = current_date - 6 where id = v_po;
  insert into public.receipts(org_id, number, po_id, site_id, delivery_note_no, received_at, received_by, on_time, quality_rating, service_rating)
  values (p_org, public.next_doc_no(p_org, 'GR'), v_po, s_n, 'DN-7781', now() - interval '1 day', v_by, true, 5, 4) returning id into v_rec;
  for rl in select * from public.po_lines where po_id = v_po loop
    insert into public.receipt_lines(receipt_id, po_line_id, qty_accepted) values (v_rec, rl.id, round(rl.qty * 0.6));
    update public.po_lines set received_qty = round(rl.qty * 0.6) where id = rl.id;
    perform public.demo_move(p_org, s_n, rl.item_id, 'receipt', round(rl.qty * 0.6), rl.unit_price, now() - interval '1 day', 'po', v_po,
      (select number from public.purchase_orders where id = v_po), 'קליטה חלקית (הדגמה)', v_by);
  end loop;
  -- 3. an order waiting for approval (above 10,000: procurement manager then CFO)
  perform public.po_save(jsonb_build_object('org_id', p_org, 'supplier_id', sup[1], 'site_id', s_c, 'expected_date', current_date + 21,
    'lines', jsonb_build_array(jsonb_build_object('item_id', (select id from public.items where org_id = p_org and sku = 'VLV-GATE-4'), 'qty', 12, 'unit_price', 1520))));
  select id into v_po from public.purchase_orders where org_id = p_org and status = 'draft';
  update public.purchase_orders set status = 'pending_approval', submitted_by = v_by, submitted_at = now() - interval '1 day', warnings = public.po_warnings(v_po) where id = v_po;
  perform public.approvals_route(p_org, 'po', v_po, 0, (select net_total from public.purchase_orders where id = v_po), false);
  -- 4. an invoice that does not match its order
  select p.id into v_po from public.purchase_orders p where p.org_id = p_org and p.supplier_id = sup[2] and p.status = 'closed' order by p.order_date desc limit 1;
  if v_po is not null then
    insert into public.invoices(org_id, supplier_id, po_id, invoice_no, invoice_date, due_date, net_amount, vat_amount, total, status, registered_by)
    select p_org, sup[2], v_po, 'D-EXC-1', current_date - 1, current_date + 29, round(p.net_total * 0.12, 2), round(round(p.net_total * 0.12, 2) * 0.18, 2),
           round(p.net_total * 0.12, 2) + round(round(p.net_total * 0.12, 2) * 0.18, 2), 'registered', v_by
    from public.purchase_orders p where p.id = v_po returning id into v_inv;
    insert into public.invoice_lines(invoice_id, po_line_id, qty, unit_price, line_net)
    select v_inv, l.id, round(l.qty * 0.1, 3), round(l.unit_price * 1.2, 2), round(round(l.qty * 0.1, 3) * round(l.unit_price * 1.2, 2), 2)
    from public.po_lines l where l.po_id = v_po;
    update public.invoices set net_amount = x.n, vat_amount = round(x.n * 0.18, 2), total = x.n + round(x.n * 0.18, 2)
      from (select sum(line_net) n from public.invoice_lines where invoice_id = v_inv) x where id = v_inv;
    perform public.invoice_match(v_inv);
  end if;
  -- 5. requests: one waiting, one approved and not yet covered
  insert into public.requests(org_id, number, site_id, requested_by, urgency, reason, needed_by, status, est_total, submitted_at)
  values (p_org, public.next_doc_no(p_org, 'PR'), s_s, v_by, 'high', 'החלפת קווי דלק ברחבה (הדגמה)', current_date + 10, 'submitted', 0, now() - interval '3 hours')
  returning id into v_req;
  insert into public.request_lines(request_id, line_no, item_id, qty, est_unit_price)
  select v_req, row_number() over (), i.id, q, public.item_last_price(i.id) from (values ('PIP-ST-2', 24), ('VLV-BALL-2', 6), ('BLT-M16', 40)) x(sku, q)
  join public.items i on i.org_id = p_org and i.sku = x.sku;
  update public.requests set est_total = (select coalesce(sum(round(qty * coalesce(est_unit_price, 0), 2)), 0) from public.request_lines where request_id = v_req) where id = v_req;
  insert into public.approvals(org_id, doc_type, doc_id, step, required_role) values (p_org, 'request', v_req, 1, 'site_manager');
  insert into public.requests(org_id, number, site_id, requested_by, urgency, reason, needed_by, status, est_total, submitted_at, decided_at)
  values (p_org, public.next_doc_no(p_org, 'PR'), s_c, v_by, 'normal', 'ציוד בטיחות לצוות חדש (הדגמה)', current_date + 14, 'approved', 0, now() - interval '2 days', now() - interval '1 day')
  returning id into v_req;
  insert into public.request_lines(request_id, line_no, item_id, qty, est_unit_price)
  select v_req, row_number() over (), i.id, q, public.item_last_price(i.id) from (values ('SAF-HRN', 8), ('SAF-HLM', 12), ('SAF-VST', 12)) x(sku, q)
  join public.items i on i.org_id = p_org and i.sku = x.sku;
  update public.requests set est_total = (select coalesce(sum(round(qty * coalesce(est_unit_price, 0), 2)), 0) from public.request_lines where request_id = v_req) where id = v_req;
  -- 6. an open RFQ with three quotes to compare
  insert into public.rfqs(org_id, number, title, site_id, due_date, created_by) values
    (p_org, public.next_doc_no(p_org, 'RFQ'), 'צנרת ומגופים לשלב ב׳ – אתר צפון (הדגמה)', s_n, current_date + 3, v_by) returning id into v_rfq;
  insert into public.rfq_lines(rfq_id, line_no, item_id, qty)
  select v_rfq, row_number() over (), i.id, q from (values ('PIP-ST-4', 80), ('VLV-BALL-2', 20), ('FLG-4-150', 40)) x(sku, q)
  join public.items i on i.org_id = p_org and i.sku = x.sku;
  insert into public.rfq_suppliers(rfq_id, supplier_id) values (v_rfq, sup[1]), (v_rfq, sup[2]), (v_rfq, sup[5]);
  insert into public.quotes(org_id, rfq_id, supplier_id, quote_no, valid_until, delivery_days, payment_terms, credit_days, shipping_cost, warranty, entered_by)
  values (p_org, v_rfq, sup[1], 'Q-881', current_date + 20, 14, 'שוטף + 60', 60, 0, '12 חודשים', v_by) returning id into v_q;
  insert into public.quote_lines(quote_id, rfq_line_id, unit_price, discount_pct)
  select v_q, rl2.id, case i.sku when 'PIP-ST-4' then 462 when 'VLV-BALL-2' then 395 else 148 end, 2
  from public.rfq_lines rl2 join public.items i on i.id = rl2.item_id where rl2.rfq_id = v_rfq;
  insert into public.quotes(org_id, rfq_id, supplier_id, quote_no, valid_until, delivery_days, payment_terms, credit_days, shipping_cost, warranty, entered_by)
  values (p_org, v_rfq, sup[2], '2026-114', current_date + 10, 5, 'שוטף + 30', 30, 650, '6 חודשים', v_by) returning id into v_q;
  insert into public.quote_lines(quote_id, rfq_line_id, unit_price)
  select v_q, rl2.id, case i.sku when 'PIP-ST-4' then 449 when 'VLV-BALL-2' then 372 else 151 end
  from public.rfq_lines rl2 join public.items i on i.id = rl2.item_id where rl2.rfq_id = v_rfq;
  insert into public.quotes(org_id, rfq_id, supplier_id, quote_no, valid_until, delivery_days, payment_terms, credit_days, shipping_cost, prices_include_vat, entered_by)
  values (p_org, v_rfq, sup[5], 'E-55', current_date + 15, 21, 'שוטף + 60', 60, 0, true, v_by) returning id into v_q;
  insert into public.quote_lines(quote_id, rfq_line_id, unit_price)
  select v_q, rl2.id, case i.sku when 'PIP-ST-4' then 529 when 'VLV-BALL-2' then 449 else null end
  from public.rfq_lines rl2 join public.items i on i.id = rl2.item_id where rl2.rfq_id = v_rfq;

  -- documents opened today are the demo buyer's
  update public.purchase_orders set created_by = v_buyer, submitted_by = coalesce(submitted_by, v_buyer)
   where org_id = p_org and status in ('pending_approval', 'sent', 'partially_received');
  update public.purchase_orders set submitted_by = v_buyer where org_id = p_org and status in ('pending_approval', 'sent', 'partially_received');
  update public.requests set requested_by = v_buyer where org_id = p_org;
  update public.rfqs set created_by = v_buyer where org_id = p_org;
  update public.invoices set registered_by = v_buyer where org_id = p_org and status in ('registered', 'exception', 'matched');

  -- fixed assets
  insert into public.assets(org_id, item_id, asset_tag, serial_no, purchase_date, purchase_cost, supplier_id, warranty_until, last_service_on, next_service_on, site_id, location, responsible_user_id, condition)
  select p_org, i.id, x.tag, x.sn, current_date - x.age, x.cost, sup[6], current_date - x.age + 730, current_date - 80, current_date + x.nxt, x.site, x.loc, v_by, x.cond
  from (values ('MCH-WLD', 'AS-0001', 'WLD300-77812', 400, 9800, 10, s_n, 'מכולת ציוד', 'good'),
               ('MCH-WLD', 'AS-0002', 'WLD300-77813', 400, 9800, -3, s_c, 'מכולת ציוד', 'fair'),
               ('MCH-GEN', 'AS-0003', 'GEN20-11902', 220, 28500, 40, s_n, 'חצר האתר', 'good'),
               ('MCH-PMP', 'AS-0004', 'PMP3-5501', 90, 4200, 5, s_c, 'בור החפירה', 'good')) x(sku, tag, sn, age, cost, nxt, site, loc, cond)
  join public.items i on i.org_id = p_org and i.sku = x.sku;

  return jsonb_build_object('ok', true, 'orders', n_po);
end $$;
revoke all on function public.demo_move(uuid, uuid, uuid, text, numeric, numeric, timestamptz, text, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.demo_seed(uuid) from public, anon;
grant execute on function public.demo_seed(uuid) to authenticated;
