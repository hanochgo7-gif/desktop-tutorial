// All my tasks, grouped: overdue, today, upcoming, no date, done (last 14 days).

import { html, render, on, fmt, startOfDay, endOfDay } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, TASK_TYPES, label, dueClass } from '../core/model.js';
import { pageHeader, icon, setTitle, emptyState } from '../ui/components.js';
import { openTaskForm, taskEditBtn } from '../ui/forms.js';
import { completeTask } from './contact.js';

export default async function view(el, ctx) {
  setTitle('משימות');
  const draw = () => {
    const open = store.filter('crm_tasks', (t) => t.status === 'open');
    const sod = startOfDay(), eod = endOfDay();
    const by = (a, b) => ((a.due_at || '9') < (b.due_at || '9') ? -1 : 1);
    const groups = [
      { title: 'באיחור', items: open.filter((t) => t.due_at && new Date(t.due_at) < sod).sort(by), cls: 'g-overdue' },
      { title: 'היום', items: open.filter((t) => t.due_at && new Date(t.due_at) >= sod && new Date(t.due_at) <= eod).sort(by) },
      { title: 'בהמשך', items: open.filter((t) => t.due_at && new Date(t.due_at) > eod).sort(by) },
      { title: 'בלי תאריך', items: open.filter((t) => !t.due_at) },
      { title: 'בוצעו לאחרונה', items: store.filter('crm_tasks', (t) => t.status === 'done' && new Date(t.completed_at) > Date.now() - 14 * 864e5).sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1)), done: true },
    ];
    render(el, html`
      ${pageHeader({ title: 'משימות', subtitle: `${open.length} פתוחות`, actions: html`<button class="btn btn-primary" data-act="new">${icon('plus')}משימה חדשה</button>` })}
      ${!store.all('crm_tasks').length ? emptyState({ icon: 'task', title: 'אין משימות', text: 'משימות נוצרות כשמוסיפים ליד, כשמתעדים שיחה ובוחרים צעד הבא, או ידנית.', action: { act: 'new', label: 'משימה חדשה', icon: 'plus' } }) : ''}
      ${groups.filter((g) => g.items.length).map((g) => html`<section class="panel task-group ${g.cls || ''}">
        <div class="panel-head"><h2>${g.title} <span class="tab-count">${g.items.length}</span></h2></div>
        <ul class="task-list">${g.items.slice(0, g.done ? 30 : 200).map((t) => {
          const c = store.get('crm_contacts', t.contact_id);
          const d = store.get('crm_deals', t.deal_id);
          return html`<li class="task-row ${g.done ? 'done' : ''}">
            <button class="task-check ${g.done ? 'done' : ''}" data-act="${g.done ? 'undo' : 'done'}" data-id="${t.id}" aria-label="${g.done ? 'החזרה למשימות פתוחות' : 'סימון כבוצע'}: ${t.title}">${icon('check')}</button>
            <div class="grow"><button class="linkbtn task-title" data-act="edit-task" data-id="${t.id}">${t.title}</button>
              <div class="task-meta">
                <span class="${g.done ? '' : dueClass(t.due_at)}">${g.done ? `בוצע ${fmt.relative(t.completed_at)}` : t.due_at ? fmt.dateTime(t.due_at) : 'בלי תאריך'}</span>
                <span>${label(TASK_TYPES, t.type)}</span>
                ${c ? html`<a href="#/c/${c.id}">${contactName(c)}</a>` : ''}
                ${d ? html`<a href="#/d/${d.id}">${d.name}</a>` : ''}
                ${t.priority === 'high' ? html`<span class="danger-text">עדיפות גבוהה</span>` : ''}
                ${g.done && t.outcome ? html`<span>${t.outcome}</span>` : ''}
              </div></div>${taskEditBtn(t)}</li>`;
        })}</ul></section>`)}`);
  };
  draw();
  ctx.watch(['crm_tasks', 'crm_contacts', 'crm_deals'], draw);
  on(el, 'click', '[data-act]', (e, b) => {
    const a = b.dataset.act;
    if (a === 'new') openTaskForm();
    if (a === 'edit-task') openTaskForm({ task: store.get('crm_tasks', b.dataset.id) });
    if (a === 'done') completeTask(b.dataset.id);
    if (a === 'undo') store.update('crm_tasks', b.dataset.id, { status: 'open' });
  });
}
