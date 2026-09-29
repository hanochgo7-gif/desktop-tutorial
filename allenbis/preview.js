(() => {
  'use strict';

  const button = document.createElement('button');
  button.id = 'previewCheckout';
  button.className = 'v2-primary';
  button.type = 'button';
  button.textContent = 'להמשך הזמנה';
  button.setAttribute('aria-controls', 'previewNotice');
  button.setAttribute('aria-haspopup', 'dialog');
  document.querySelector('#sheet .panel').append(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'previewNotice';
  dialog.className = 'sheet';
  dialog.setAttribute('aria-labelledby', 'previewNoticeTitle');
  dialog.innerHTML = '<div class="panel"><div class="sheethead"><h2 id="previewNoticeTitle">ההזמנות באתר ייפתחו בקרוב</h2><button class="close" autofocus aria-label="סגירת ההודעה">×</button></div><p>Allenbis בתצוגה מקדימה. אפשר לעיין במוצרים ולבנות סל. עדיין לא ניתן לשלוח הזמנה או לבצע תשלום.</p><p>הסל שלך נשאר שמור במכשיר.</p></div>';
  document.body.append(dialog);
  button.onclick = () => window.AllenbisStore.openDialog('previewNotice');
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (document.activeElement === document.body || dialog.contains(document.activeElement)) button.focus();
  });
})();
