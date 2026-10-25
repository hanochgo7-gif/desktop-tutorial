# קשר CRM – ארכיטקטורה (for contributors)

A HubSpot-class CRM, Hebrew/RTL, static (no build step, no server). Vanilla ES modules, served from GitHub Pages at `/crm/`.
Run locally: `python3 -m http.server 8765` from the repo root, open http://localhost:8765/crm/.
Data lives in the browser (IndexedDB) – see `js/core/store.js`.

## Files

```
crm/index.html            shell markup; links css/app.css + one css file per feature area
crm/css/app.css           design tokens + all shared components (buttons, inputs, table, board, panels, overlays, timeline...)
crm/css/{analytics,automation,commerce,work,admin}.css   feature-area styles (each area owns one file)
crm/js/app.js             bootstrap: store init, sidebar/top bar, shortcuts, onboarding, loads engines/*.js, starts scheduler
crm/js/core/util.js       html`` templating (auto-escaped), render(), on() delegation, fmt (he-IL), dates, CSV, prng, mergeTemplate
crm/js/core/store.js      store singleton: collections, insert/update/remove, history, trash, associations, backups, events
crm/js/core/schema.js     OBJECTS, properties (getProps/getProp), option lists, pipelines/stages, displayName, getValue
crm/js/core/filters.js    filter engine (OPS, opsFor, testFilter, applyFilters, searchRecords, describeFilter), lead scoring (scoreOf)
crm/js/core/records.js    domain ops: createRecord, updateRecord, deleteRecords, logActivity, createTask, completeTask, notify, findDuplicates
crm/js/core/router.js     hash routes -> lazy views; navigate(), setQuery()
crm/js/core/scheduler.js  registerJob(name, fn) – runs every 30s in a single tab (Web Locks)
crm/js/core/seed.js       demo data + installDefaults(); calls js/seeds/automation.js and js/seeds/commerce.js
crm/js/ui/components.js   modal, drawer, confirmDialog, promptDialog, toast, menu, avatar, userChip, badge, emptyState, pageHeader, tabs,
                          displayValue(prop, value, record, type), propInput(prop, value, opts), readProps(form, props), pickRecord(type)
crm/js/ui/icons.js        icon(name) – see ICON_NAMES
crm/js/ui/recordForm.js   openCreate(type, { defaults, associate, onCreated, open })
crm/js/ui/palette.js      Ctrl+K command palette
crm/js/views/*.js         one module per screen (see router.js for routes)
crm/js/engines/*.js       background engines, each exports init()
```

## Conventions

- **Views**: `export default async function view(el, ctx)`; render into `el`; return an optional cleanup fn.
  `ctx = { params, query, path, watch(colls, fn), refresh(), navigate(href) }`. Use `ctx.watch(['deals'], () => redraw())`
  to re-render on data changes (it is auto-unsubscribed when leaving the route). Use event delegation with `on(el, 'click', '[data-act]', fn)`.
- **Templating**: `html\`<p>${value}</p>\`` escapes values. Nest `html` results freely; arrays are joined. `raw(str)` only for trusted markup.
  `render(el, html...)` sets innerHTML. Never build HTML by string concat of user data.
- **Data**: never mutate records directly. `store.insert(coll, data, {source})`, `store.update(coll, id, patch, {source})`,
  `store.remove(coll, id)` (goes to trash). For contacts/companies/deals/tickets use `createRecord/updateRecord` in records.js (validation + rules).
  Store events: `store.on('change', ({coll, op: 'insert'|'update'|'remove'|'bulk', record, prev, changes, source}) => ...)`;
  `changes = { key: {from, to} }`. `source` is 'user'|'import'|'workflow'|'form'|'sequence'|'system'|'restore'.
  Engines must ignore events they caused (check `source`) to avoid loops.
- **Associations**: `store.link(typeA, idA, typeB, idB)`, `store.unlink(...)`, `store.linked(type, id, targetType)` -> records,
  `store.linkedIds(...)`. Types: 'contact' | 'company' | 'deal' | 'ticket'.
- **Current user**: `store.settings.currentUserId`; users are in `store.all('users')`.
- **Formatting**: `fmt.money(n)`, `fmt.date(d)`, `fmt.dateTime(d)`, `fmt.relative(d)`, `fmt.number(n)`, `fmt.percent(n)`. Currency ILS.
- **Hebrew copy**: plain, active, sentence case. Buttons say exactly what happens ("שמירת תהליך", not "אישור"). Errors say what
  happened and how to fix it. Empty states invite the first action. Gender: OBJECTS[type].fem tells if the noun is feminine.
- **Design**: use the shared classes in app.css (`.btn .btn-primary .btn-ghost .btn-sm .btn-icon`, `.input`, `.field .field-label`, `.panel .panel-head .panel-body`,
  `.table-wrap .table`, `.tabs .tab`, `.seg`, `.badge-{color}`, `.empty`, `.grid .grid-2/3/4`, `.kpi`, `.notice`, `.toolbar`, `.page-head` via pageHeader()).
  Colours: CSS variables only (`--ink`, `--ink-2`, `--ink-3`, `--line`, `--surface`, `--surface-2`, `--surface-3`, `--brand`, `--brand-soft`, `--money`, `--danger`, `--warn`).
  Must work in light and dark mode, RTL, and down to 360px wide. Visible keyboard focus. Respect reduced motion. No new fonts.
  Put feature styles only in your area's css file, prefixed by a feature class to avoid collisions.
- **No external libraries / CDNs.** Everything is hand-written (charts are SVG).

## Data shapes

```
users          { id, name, email, role: 'admin'|'sales'|'support'|'marketing', title, active }
contacts       { firstName, lastName, email, phone, jobTitle, lifecycle, leadStatus, source, tags[], city, address, linkedin, birthday,
                 marketingConsent, unsubscribed, ownerId, lastActivityAt, ...custom }
companies      { name, domain, industry, type, size, annualRevenue, phone, city, address, taxId, linkedin, description, ownerId, lastActivityAt }
deals          { name, amount, pipelineId, stageId, closeDate, dealType, priority, source, nextStep, lostReason, closedAt, stageChangedAt, ownerId,
                 lineItems?: [{ id, productId, name, description, qty, price, discount(%) }] }
tickets        { subject, description, pipelineId, stageId, priority, category, channel, dueAt, closedAt, ownerId }
activities     { type: 'note'|'email'|'call'|'meeting'|'whatsapp'|'sms', subject, body, at, ownerId, targets: [{type,id}],
                 call: outcome, direction('in'|'out'), durationMin; meeting: endAt, location, attendees[contactId];
                 email: to, status('logged'|'sent'|'scheduled'), templateId, sequenceId }
tasks          { title, type: 'todo'|'call'|'email'|'meeting', priority: 'low'|'medium'|'high', status: 'open'|'done', dueAt, completedAt,
                 ownerId, notes, targets: [{type,id}], reminderAt? }
history        { type, recordId, key, from, to, at, by, source }   (property history; deals have stageId history)
products       { name, sku, price, unit, recurring: null|'monthly'|'yearly', category, description, active, cost? }
quotes         { number, title, dealId, contactId, companyId, status: 'draft'|'sent'|'accepted'|'declined'|'expired', issuedAt, validUntil,
                 items: [{ id, productId, name, description, qty, price, discount }], discount(%), vatRate, notes, terms, ownerId, acceptedAt, signedBy? }
templates      { name, category, subject, body (plain text with {{contact.firstName}} {{company.name|fallback}} {{deal.name}} {{me.name}} {{business.name}}), ownerId, usageCount }
sequences      { name, active, steps: [{ id, delayDays, kind: 'email'|'task'|'call', templateId?, subject?, body?, taskTitle? }],
                 settings: { businessDaysOnly, stopOnReply, sendHour } }
enrollments    { sequenceId, contactId, status: 'active'|'finished'|'stopped'|'paused', stepIndex, nextAt, enrolledAt, enrolledBy, log: [{stepId, at, activityId?, taskId?}] }
workflows      { name, description, active, object: 'contact'|'company'|'deal'|'ticket',
                 trigger: { event: 'created'|'property_changed'|'stage_changed'|'form_submitted', prop?, to?, formId? },
                 conditions: { match, filters }, actions: [{ id, type, config }], reenroll, stats: { enrolled, lastRunAt } }
workflowLogs   { workflowId, recordType, recordId, at, status: 'ok'|'error'|'waiting', steps: [{ actionId, type, at, ok, message }] }
scheduled      { kind, runAt, payload }   (generic delayed jobs, e.g. workflow delays)
forms          { name, title, intro, fields: [{ id, prop, label, required, placeholder }], submitLabel, successMessage, consentText,
                 setLifecycle, ownerId, notifyUserId, addTags[], createDeal: bool, active, views, submissionsCount }
submissions    { formId, contactId, data, at }
reports        { name, object, chart: 'bar'|'column'|'line'|'donut'|'funnel'|'table'|'kpi', measure: { agg: 'count'|'sum'|'avg', prop },
                 groupBy: { prop, bucket?: 'day'|'week'|'month'|'quarter' }, filters: { match, filters }, dateRange: { prop, preset }, onDashboard, size }
dashboards     { name, widgets: [{ reportId, size: 'sm'|'md'|'lg' }] }
views          { type, name, filters, columns[], sort: {key, dir}, shared, ownerId }      (saved list views; owned by views/objects.js)
notifications  { userId, text, link, kind, read }
settings       store.settings – see DEFAULT_SETTINGS in store.js (company details, vatRate, pipelines, options, customProps, scoring, quote...)
```

Filters everywhere: `{ match: 'all'|'any', filters: [{ prop, op, value }] }` evaluated with `applyFilters(type, records, set)`.
