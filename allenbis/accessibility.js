(() => {
  'use strict';

  const $ = id => document.getElementById(id),
    q = $('q'),
    clear = $('clearSearch');
  q.addEventListener('input', () => {
    clear.disabled = !q.value;
  });
  clear.onclick = () => {
    q.value = '';
    clear.disabled = true;
    q.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    q.focus();
  };
  function describe(form) {
    if (!form || form.dataset.accessible) return;
    form.dataset.accessible = 'true';
    form.noValidate = true;
    const input = form.querySelector('input'),
      help = document.createElement('p'),
      error = document.createElement('p');
    help.id = input.id + 'Help';
    help.className = 'budget-help';
    help.textContent = 'סכום בשקלים, עם עד שתי ספרות אחרי הנקודה.';
    error.id = input.id + 'Error';
    error.className = 'budget-error';
    error.setAttribute('role', 'alert');
    error.setAttribute('aria-atomic', 'true');
    input.setAttribute('aria-describedby', help.id + ' ' + error.id);
    form.append(help, error);
  }
  describe($('budgetQuick'));
  const observer = new MutationObserver(() => describe($('budgetForm')));
  observer.observe($('featureBody'), {
    childList: true
  });
  document.addEventListener('submit', e => {
    if (!['budgetQuick', 'budgetForm'].includes(e.target.id)) return;
    describe(e.target);
    const input = e.target.querySelector('input'),
      error = $(input.id + 'Error'),
      n = window.AllenbisCommerce.parseMoney(input.value),
      max = window.ALLENBIS_COMMERCE_CONFIG.budget.maxMinor;
    if (!n || n > max) {
      e.preventDefault();
      e.stopImmediatePropagation();
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'יש להזין סכום חיובי, עד ' + new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS'
      }).format(max / 100) + ', עם עד שתי ספרות אחרי הנקודה.';
      input.focus();
    } else {
      input.removeAttribute('aria-invalid');
      error.textContent = '';
    }
  }, true);
  document.addEventListener('input', e => {
    if (['budgetQuickInput', 'budgetInput'].includes(e.target.id)) {
      e.target.removeAttribute('aria-invalid');
      const error = $(e.target.id + 'Error');
      if (error) error.textContent = '';
    }
  });
  // Native modal inertness plus explicit wrap keeps Tab/Shift+Tab inside even one-control dialogs.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const dialog = e.target.closest('dialog[open]');
    if (!dialog) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(x => x.getClientRects().length && !x.closest('[hidden]'));
    if (!controls.length) return;
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      e.stopImmediatePropagation();
      (e.shiftKey ? last : first).focus();
    }
  }, true);
  const notice = $('previewNotice');
  notice.setAttribute('aria-describedby', 'previewNoticeDescription');
  notice.querySelector('.panel>p').id = 'previewNoticeDescription';
  for (const dialog of document.querySelectorAll('dialog')) dialog.setAttribute('aria-modal', 'true');
  function dimensions() {
    const top = document.querySelector('.top'),
      footer = document.querySelector('.cartbar');
    document.documentElement.style.setProperty('--header-height', getComputedStyle(top).position === 'sticky' ? top.getBoundingClientRect().height + 'px' : '0px');
    document.documentElement.style.setProperty('--cart-height', footer.getBoundingClientRect().height + 'px');
  }
  new ResizeObserver(dimensions).observe(document.querySelector('.top'));
  new ResizeObserver(dimensions).observe(document.querySelector('.cartbar'));
  window.addEventListener('resize', dimensions);
  dimensions();
})();
