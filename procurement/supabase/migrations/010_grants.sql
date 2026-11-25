-- 010: function privileges. Nothing is callable by default; the app gets exactly its API.
-- Internal functions (stock_apply, approvals_route, approval_decide, request_line_refresh, po_recalc, invoice_match, idem_*, audit, ...)
-- stay uncallable from the API, so every state change goes through a function that checks permissions.
-- Re-run this file after adding functions in a later migration.

revoke execute on all functions in schema public from public, anon, authenticated;

-- used inside RLS policies and security-invoker reports (each checks the caller itself)
grant execute on function
  public.my_orgs(), public.my_role(uuid), public.has_perm(uuid, text), public.is_member(uuid), public.can_see_site(uuid, uuid),
  public.all_sites_member(uuid), public.app_setting(uuid, text), public.can_fill_role(public.app_role, public.app_role),
  public.net_unit(numeric, numeric), public.item_last_price(uuid, uuid), public.item_avg_price(uuid, int),
  public.budget_figures(uuid), public.supplier_score(uuid), public.my_approvals(uuid)
to authenticated;

-- the API
grant execute on function
  -- organization and users
  public.org_create(text, boolean), public.claim_invitations(), public.member_invite(uuid, text, public.app_role, boolean, uuid[], numeric),
  public.member_update(uuid, uuid, public.app_role, boolean, uuid[], numeric, boolean), public.settings_update(uuid, jsonb),
  public.org_rename(uuid, text), public.approval_rules_replace(uuid, text, jsonb),
  -- inventory
  public.stock_operation(uuid, uuid, uuid, text, numeric, text, numeric, text),
  public.transfer_create(uuid, uuid, uuid, jsonb, text, uuid, text), public.transfer_ship(uuid, text),
  public.transfer_receive(uuid, jsonb, text, text), public.transfer_cancel(uuid, text),
  public.count_open(uuid, uuid, text), public.count_record(uuid, jsonb), public.count_post(uuid, text),
  public.asset_event(uuid, jsonb), public.loan_out(uuid, uuid, uuid, uuid, numeric, date, text, text),
  public.loan_return(uuid, numeric, numeric, numeric, text, text),
  -- requests
  public.request_save(jsonb), public.request_check(uuid), public.request_submit(uuid, text), public.request_decide(uuid, text, text, text),
  public.request_cancel(uuid, text), public.request_reserve(uuid, numeric, text), public.reservation_issue(uuid, numeric, text),
  public.reservation_release(uuid, text),
  -- orders, receipts, returns
  public.po_save(jsonb), public.po_from_request(uuid, uuid, uuid[]), public.po_warnings(uuid), public.po_budget_check(uuid),
  public.po_submit(uuid, text), public.po_decide(uuid, text, text, text), public.po_revise(uuid, text),
  public.po_set_status(uuid, text, date, text), public.receipt_post(uuid, jsonb, text, int, int, text, text),
  public.po_inspect(uuid, text), public.po_cancel(uuid, text), public.po_close(uuid, text),
  public.supplier_return_post(uuid, jsonb, text, text),
  -- quotes
  public.rfq_create(jsonb), public.rfq_compare(uuid), public.rfq_award(uuid, uuid, text, text), public.rfq_cancel(uuid, text),
  -- invoices
  public.invoice_register(jsonb, text), public.invoice_recheck(uuid), public.invoice_approve(uuid, text, text),
  public.invoice_pay(uuid, date, text), public.invoice_reject(uuid, text),
  -- budgets
  public.budget_list(uuid), public.budget_save(jsonb), public.budget_revise(uuid, numeric, text),
  -- analytics and assistant
  public.supplier_scores(uuid), public.stock_status(uuid, uuid), public.spend_breakdown(uuid, date, date),
  public.savings_summary(uuid, date, date), public.command_center(uuid), public.alerts(uuid),
  public.price_trends(uuid, numeric), public.spend_anomalies(uuid, int, int), public.consolidation_opportunities(uuid),
  public.best_supplier_for_category(uuid, uuid)
to authenticated;
