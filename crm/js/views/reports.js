// TODO: implemented by feature owner
import { html, render } from '../core/util.js';
import { pageHeader, emptyState } from '../ui/components.js';

export default async function view(el) {
  render(el, html`${pageHeader({ title: 'reports' })}${emptyState({ title: 'בבנייה', text: 'המסך הזה עוד לא מוכן.' })}`);
}
