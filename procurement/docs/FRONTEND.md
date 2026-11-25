# Frontend conventions (procurement system)

Static app, no build step, ES modules. Hebrew, RTL. Talks to Supabase (PostgREST + RPC) via `js/core/api.js`.
Every state change that matters goes through a server function (RPC) that checks permissions, locks rows and runs in a
transaction. The client never computes money or stock that it then saves: it shows previews, the server decides.

## Files

- `index.html`, `css/app.css` (design system: do not edit), `css/views-<group>.css` (screen styles of one group).
- `js/app.js` – shell, routes (all routes are already registered there), global search. A route `orders/:id` loads
  `js/views/orders.js` and calls its default export `async ({ params, query, path, refresh }) → Node`.
  One module serves all routes of its screen group: branch on `path` (e.g. `path === 'orders/new'`, `params.id`).
- `js/core/api.js` – `rpc(name, args)`, `db(table)` query builder, `idemKey()`, `auth`.
- `js/core/store.js` – `store` (org, role, `store.can(perm)`, `store.ref.{sites,categories,types,suppliers,items,people}`),
  lookups `siteName(id)`, `itemName(id)`, `item(id)`, `supplierName(id)`, `categoryName(id)`, `personName(id)`, `setting(key)`,
  and `refreshRef('items')` after creating master data.
- `js/core/format.js` – `money`, `money0`, `moneyShort`, `qty(v, uom)`, `num`, `pct`, `date`, `dateTime`, `ago`, `isoDate`,
  `addDays`, label maps (`ROLE`, `STATUS`, `URGENCY`, `MOVE`, `ALERT`, `WARNING`, `MATCH`, `DOC_KIND`, `CONDITION`, `SITE_KIND`),
  `statusLabel(kind, s)`, `errorText(e)` (server error codes → Hebrew sentence).
- `js/core/router.js` – `href('orders/123')` → `'#/orders/123'`, `go(path)`, `setQuery({...})`.
- `js/ui/dom.js` – `h('div.cls#id', {attrs, onclick}, ...children)`, `clear`, `debounce`. Text is always text (no innerHTML).
- `js/ui/components.js` – `pageHeader({title, sub, actions, crumbs})`, `section(title, body, {actions, id, note})`,
  `kpi(label, value, {sub, href, tone})` inside `h('div.kpis', ...)`, `badge(kind, status)`, `tone(label, t)`,
  `button(label, onClick, {kind:'primary'|'ghost'|'danger', ic, small, href})` (shows a spinner while the promise runs),
  `facts([[label, value]])`, `tabs([{id,label,count,render}], active, onChange)`, `skeleton`, `empty(title, text, action)`,
  `note(text, 'info'|'warn'|'bad'|'good')`, `avatar(name)`.
- `js/ui/table.js` – `dataTable({ id, columns, rows, rowHref, selectable, bulk, exportName, empty, toolbar })`: search, select
  filters (`filter: 'select'` with `options` or `filterValue`), sort, resize, hide, saved views, export to Excel/CSV.
  Column: `{ key, label, num, value(row) (text used for search/sort/export), render(row) (node), sort(row), exportValue(row), hidden, search:false }`.
  Use `num: true` for numbers and money (right-aligned in tables means end-aligned; the CSS does it).
- `js/ui/forms.js` – `field(label, input, {hint, required, wide})` inside `h('div.form-grid', ...)`; `text`, `number`,
  `dateInput`, `textarea`, `select(options, attrs, {empty})`, `formData(root)`, `validate(root)`;
  `picker({ items: itemOptions | supplierOptions | siteOptions | peopleOptions, value, onPick, required, label })` (`.value`);
  `linesEditor({ cols: ['item','qty','price','discount','description','note'], lines, priceHint(itemId), onChange })` with `.get()` and `.valid()`.
- `js/ui/overlay.js` – `modal({title, body, actions:[{label, kind, onClick(close)}], wide})` (onClick returning `false` keeps it open;
  a thrown error is shown as a toast), `confirmDialog({title, text, confirm, danger, reason, reasonLabel})` → `true` / reason text / `null`,
  `toast(msg, tone)`, `toastError(e)`.
- `js/ui/charts.js` – `barChart(data, {label})`, `rankBars(list, {label})`, `meter({amount, actual, committed})`.
- `js/ui/export.js` – `downloadCSV`, `downloadXLSX`, `parseCSV` (for imports).
- `js/views/home.js` – the command center: the reference for how a screen is written.

## Data (see `supabase/migrations/*.sql` for every column)

Org-scoped tables (always filter `.eq('org_id', store.org.id)`): `sites`, `categories`, `item_types`, `items`, `item_site_settings`,
`suppliers`, `supplier_documents`, `supplier_prices`, `employees`, `stock_balances`, `stock_movements` (append-only ledger),
`reservations`, `transfers`(+`transfer_lines`), `stock_counts`(+`stock_count_lines`), `assets`(+`asset_events`), `loans`,
`requests`(+`request_lines`), `rfqs`(+`rfq_lines`, `rfq_suppliers`), `quotes`(+`quote_lines`), `purchase_orders`(+`po_lines`),
`receipts`(+`receipt_lines`), `supplier_returns`(+lines), `invoices`(+`invoice_lines`), `budgets`(+`budget_revisions`),
`approvals`, `approval_rules`, `audit_log`, `invitations`, `memberships`, `membership_sites`, `profiles`, `saved_views`.
Row Level Security already hides what the user may not see (other sites, money without `finance.view`).

Direct writes allowed (RLS checks the permission): master data `sites`, `categories`, `item_types`, `items`,
`item_site_settings`, `suppliers`, `supplier_documents`, `supplier_prices`, `employees`, `assets` (insert/update of descriptive
columns), `quotes`/`quote_lines` and `rfq_suppliers` while the RFQ is open, `saved_views`, own `profiles` name/phone.
Nothing is ever deleted that has history: deactivate (`status`/`active`) instead.

### RPC (args are named exactly like this; pass `p_idem: idemKey()` where the function has it)

Inventory: `stock_operation(p_org, p_site, p_item, p_op, p_qty, p_reason, p_unit_cost, p_idem)` with p_op
`opening|issue|adjustment|write_off|damaged|repaired|write_off_damaged` (adjustment qty may be negative; opening/adjustment/write_off
need `stock.adjust` and a reason). `transfer_create(p_org, p_from, p_to, p_lines [{item_id, qty, request_line_id?}], p_note, p_request_id, p_idem)`,
`transfer_ship(p_transfer, p_idem)`, `transfer_receive(p_transfer, p_lines [{line_id, received_qty}] | null, p_note, p_idem)`, `transfer_cancel(p_transfer, p_reason)`.
`count_open(p_org, p_site, p_note)`, `count_record(p_count, p_lines [{item_id, counted_qty}])`, `count_post(p_count, p_idem)`.
`asset_event(p_asset, p {kind: moved|assigned|returned|service|repair|condition|retired|lost|note, at, cost, site_id, employee_id, note, condition, next_service_on, done})`.
`loan_out(p_org, p_site, p_item, p_employee, p_qty, p_due, p_note, p_idem)`, `loan_return(p_loan, p_returned, p_damaged, p_lost, p_note, p_idem)`.
Reports: `stock_status(p_org, p_site?)` → per site+item: on_hand, reserved, available, damaged, on_order, in_transit, min/max/reorder,
avg_cost, stock_value (null without finance.view), daily_use, days_cover, stockout_date, below_min, below_reorder, suggested_qty, lead_time_days.

Requests: `request_save(p {id?, org_id, site_id, urgency, reason, needed_by, project, lines [{item_id, description?, qty, est_unit_price?, note?}]})`,
`request_check(p_request)` → {lines:[{line_id, item_id, qty, local_available, other_sites:[{site_id, site_name, surplus}], open_po_qty, open_pos,
in_transit_qty, similar_requests, last_price, avg_price}], budgets:[{name, available, after, over}], est_total},
`request_submit(p_request, p_idem)`, `request_decide(p_request, p_decision 'approve'|'reject', p_comment, p_idem)`, `request_cancel(p_request, p_reason)`,
`request_reserve(p_line, p_qty, p_idem)`, `reservation_issue(p_reservation, p_qty, p_idem)`, `reservation_release(p_reservation, p_reason)`.
Approvals inbox: `my_approvals(p_org)` → [{doc_type 'po'|'request', doc_id, number, site_id, amount, step, required_role, reason, created_at}].

Orders: `po_save(p {id?, org_id, supplier_id, site_id, expected_date, payment_terms, credit_days, vat_rate, order_discount, shipping_cost, notes,
internal_notes, request_id?, lines [{item_id, description?, qty, unit_price, discount_pct?, request_line_id?}]})` → {id, number, net_total, vat_amount, total},
`po_from_request(p_request, p_supplier, p_line_ids?)`, `po_warnings(p_po)`, `po_budget_check(p_po)`, `po_submit(p_po, p_idem)` → {over_budget, budgets, warnings},
`po_decide(p_po, p_decision, p_comment, p_idem)`, `po_revise(p_po, p_reason)`, `po_set_status(p_po, p_status 'sent'|'supplier_confirmed'|'in_delivery'|'expected_date', p_expected, p_note)`,
`receipt_post(p_po, p_lines [{po_line_id, qty_accepted, qty_rejected?, reject_reason?}], p_delivery_note, p_quality 1-5, p_service 1-5, p_note, p_idem)` → {number, po_status, open_lines},
`po_inspect(p_po, p_note)`, `po_cancel(p_po, p_reason)`, `po_close(p_po, p_reason)`, `supplier_return_post(p_po, p_lines [{po_line_id, qty, from_damaged}], p_reason, p_idem)`.

Quotes: `rfq_create(p {org_id, site_id, title, request_id?, due_date, note, lines [{item_id, qty, request_line_id?}], supplier_ids})`,
`rfq_compare(p_rfq)` → {quotes:[{quote_id, supplier_id, supplier_name, valid, full_cover, quoted_lines, base, line_discounts, order_discount, shipping,
net, vat, total, effective_cost, delivery_days, payment_terms, credit_days, warranty, min_qty_applies, prices_include_vat, supplier_score, quality_score,
value_score, is_cheapest, is_fastest, is_best_quality, is_recommended, diff_from_cheapest}], lines:[{rfq_line_id, item_id, qty, last_price, avg_price,
list_price, offers:[{quote_id, supplier_id, net_unit, min_qty}]}], weights, cost_of_capital_pct, vat_rate},
`rfq_award(p_rfq, p_quote, p_reason, p_idem)` → {po:{id, number}}, `rfq_cancel(p_rfq, p_reason)`.

Invoices: `invoice_register(p {org_id, supplier_id, po_id?, invoice_no, invoice_date, net_amount, vat_amount, shipping_charged, note, lines [{po_line_id?, description?, qty, unit_price}]}, p_idem)`
→ {id, match:{status, issues}}, `invoice_recheck(p_invoice)`, `invoice_approve(p_invoice, p_comment, p_idem)`, `invoice_pay(p_invoice, p_paid_on, p_ref)`, `invoice_reject(p_invoice, p_reason)`.
Budgets: `budget_list(p_org)`, `budget_figures(p_budget)`, `budget_save(p {...})`, `budget_revise(p_budget, p_delta, p_reason)`.
Analytics: `command_center(p_org)`, `alerts(p_org)`, `supplier_scores(p_org)`, `supplier_score(p_supplier)`, `spend_breakdown(p_org, p_from, p_to)`,
`savings_summary(p_org, p_from, p_to)`, `price_trends(p_org, p_min_pct)`, `spend_anomalies(p_org, p_days, p_limit)`, `consolidation_opportunities(p_org)`,
`best_supplier_for_category(p_org, p_category)`.
Admin: `member_invite(p_org, p_email, p_role, p_all_sites, p_site_ids, p_approval_limit)`, `member_update(p_org, p_user, p_role, p_all_sites, p_site_ids, p_approval_limit, p_active)`,
`settings_update(p_org, p_settings)`, `org_rename(p_org, p_name)`, `approval_rules_replace(p_org, p_doc_type, p_rules [{min_amount, max_amount, step, required_role}])`.

Permissions (`store.can(...)`): settings.manage, users.manage, audit.view, sites.manage, items.manage, suppliers.manage, stock.view, stock.move,
stock.adjust, stock.transfer, stock.count, requests.create, requests.approve, rfq.manage, po.create, po.approve, po.send, po.cancel,
receipts.post, invoices.register, invoices.approve_payment, budgets.view, budgets.manage, finance.view, reports.view.
Hide or disable actions the user may not do. The server enforces them anyway; the UI must not offer what will be refused.

## Rules for every screen

1. Real data only. No placeholder numbers, no fake rows. Missing value → `—`; zero is `0`; empty list → `empty(title, text, action)`.
2. Every button does a real thing through `rpc` or `db`. After a change: `toast('…')` in plain Hebrew naming what happened
   ("ההזמנה נשלחה לאישור"), then re-render (`refresh()` from the view args, or rebuild the section).
3. Errors: `toastError(e)` (uses `errorText`). Never show raw English errors.
4. Irreversible or outward actions (approve, reject, cancel, post a receipt, post a count, award, pay) → `confirmDialog` with a
   summary of what will happen; when the server needs a reason, ask with `reason: true`.
5. Mutating RPCs that accept `p_idem` get `idemKey()` created once per dialog opening (so a double click is applied once).
6. Words of the trade, sentence case, no English UI labels, no ALL CAPS, no emoji. Numbers: `money` in tables of documents,
   `moneyShort`/`money0` in summaries; quantities with their unit.
7. Layout: `pageHeader` → (notes) → content sections. List screens: header with the primary action, then `dataTable`.
   Detail screens: header with status badge and the next action as the primary button, `facts` with the key fields, then `tabs`
   or sections (lines, history, related documents). Breadcrumbs on detail screens.
8. Colour only for status and data. No icons in coloured circles, no gradients, no shadows on cards, no zebra tables.
9. Must work at 390px wide: tables scroll inside `.tbl__wrap`, forms stack, no horizontal page scroll.
10. Accessibility: every input has a label (`field`), buttons are buttons, links are links, tab order follows reading order.
11. Performance: load what the screen needs in parallel (`Promise.all`), select only needed columns, `limit` long lists
    (ledger, audit) and offer "more".

## Testing your screens

- Database: `tests/dev_db.sh` builds `proc_dev` (do not run it while others are working; it resets everyone's data).
  For your own copy: `createdb -h /tmp -p 5499 -U postgres -T proc_dev proc_dev_<you>` and start a server on your own port:
  `PGDATABASE=proc_dev_<you> node tests/devserver.mjs <port> &`.
- Logins (password `demo1234`): demo@example.com (super admin), cfo@example.com, buyer@example.com (procurement manager),
  site@example.com (site manager of the north site only), warehouse@example.com, viewer@example.com.
- Screenshots and console check: `APP_PORT=<port> NODE_PATH=/opt/node22/lib/node_modules node tests/ui/shot.mjs '<hash path>' 1440 out.png [email] [full]`
  prints `clean` or the console errors / failed requests / horizontal overflow. Check 1440 and 390, and as a limited user.
- Database tests: `tests/run.sh` (separate database, safe to run any time).
