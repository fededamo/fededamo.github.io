export function mountPhone({ desktop, mobile, open, home }) {
  const shell = document.querySelector('[data-phone]');
  const icons = desktop.querySelector('.desktop-icons');
  const links = [...icons.querySelectorAll('[data-open]')];
  const labels = links.map((link) => link.querySelector('span').textContent);
  const tray = document.querySelector('.tray');
  const trayParent = tray.parentElement;
  const tools = document.querySelector('[data-phone-tools]');
  const keypad = document.querySelector('.phone-keypad');
  const heading = desktop.querySelector('.welcome-copy h1');
  const welcome = heading.parentElement;
  const introduction = heading.nextElementSibling;
  const phoneName = desktop.querySelector('[data-phone-name]');
  const english = document.documentElement.lang === 'en';
  const text = english
    ? { theme: 'Change theme', up: 'Scroll up', down: 'Scroll down', language: 'Change language', menu: 'Menu', open: 'Open selected app', shortOpen: 'Open', unassigned: 'No app assigned' }
    : { theme: 'Cambia tema', up: 'Scorri verso l’alto', down: 'Scorri verso il basso', language: 'Cambia lingua', menu: 'Menu', open: 'Apri la selezione', shortOpen: 'Apri', unassigned: 'Nessuna app assegnata' };
  let selected = 0;
  let current = null;

  links.forEach((link, index) => {
    const badge = document.createElement('span');
    badge.className = 'phone-shortcut';
    badge.textContent = index + 1;
    badge.setAttribute('aria-hidden', 'true');
    link.append(badge);
  });
  for (const button of keypad.querySelectorAll('[data-phone-key]')) {
    const key = button.dataset.phoneKey;
    const action = Number(key) >= 1 && Number(key) <= links.length ? labels[Number(key) - 1]
      : { 6: text.unassigned, 7: text.up, 8: text.down, 9: text.theme, '*': text.menu, 0: text.menu, '#': text.language }[key];
    button.setAttribute('aria-label', `${key}: ${action}`);
    button.title = action;
  }

  function select(index, focus = false) {
    selected = Math.max(0, Math.min(index, links.length - 1));
    links.forEach((link, index) => {
      link.toggleAttribute('data-phone-selected', index === selected);
      link.tabIndex = mobile.matches ? (index === selected ? 0 : -1) : 0;
    });
    document.querySelector('[data-phone-caption]').textContent = current ? labels[links.findIndex((link) => link.dataset.open === current)] : labels[selected];
    if (focus && !current) {
      links[selected].focus({ preventScroll: true });
      links[selected].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function back() {
    if (!current) return;
    home();
    select(selected, true);
  }

  function showMenu() {
    home();
    select(selected, true);
  }

  function scroll(direction) {
    if (!current) { move(direction < 0 ? 'up' : 'down'); return; }
    desktop.querySelector(`#${current} .window-content`).scrollBy({ top: direction * 110, behavior: 'instant' });
  }

  function move(direction) {
    if (current) {
      if (direction === 'up' || direction === 'down') scroll(direction === 'up' ? -1 : 1);
      else {
        select((selected + (direction === 'left' ? -1 : 1) + links.length) % links.length);
        open(links[selected].dataset.open);
      }
      return;
    }
    const step = direction === 'left' || direction === 'up' ? -1 : 1;
    select((selected + step + links.length) % links.length, true);
  }

  function confirm() {
    if (current) showMenu();
    else open(links[selected].dataset.open);
  }

  function key(key) {
    const number = Number(key);
    if (number >= 1 && number <= links.length) {
      select(number - 1);
      open(links[selected].dataset.open);
    } else if (key === '7') scroll(-1);
    else if (key === '8') scroll(1);
    else if (key === '9') {
      const select = document.querySelector('[data-theme-select]');
      select.value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    else if (key === '*') back();
    else if (key === '0') showMenu();
    else if (key === '#') document.querySelector('.languages a').click();
  }

  shell.addEventListener('click', (event) => {
    if (!mobile.matches) return;
    const control = event.target.closest('[data-phone-direction], [data-phone-confirm], [data-phone-key]');
    if (!control || control.disabled) return;
    if (control.hasAttribute('data-phone-direction')) move(control.dataset.phoneDirection);
    else if (control.hasAttribute('data-phone-confirm')) confirm();
    else if (control.hasAttribute('data-phone-key')) key(control.dataset.phoneKey);
  });
  icons.addEventListener('focusin', (event) => {
    if (!mobile.matches) return;
    const link = event.target.closest('[data-open]');
    if (link) select(links.indexOf(link));
  });
  icons.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open]');
    if (mobile.matches && link) select(links.indexOf(link));
  });
  document.addEventListener('keydown', (event) => {
    if (!mobile.matches || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      event.stopPropagation();
      move(event.key.slice(5).toLowerCase());
    } else if (/^[0-9*#]$/.test(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      key(event.key);
    } else if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      back();
    }
  }, true);

  return {
    sync(id) {
      current = id;
      if (mobile.matches && !id) phoneName.append(heading);
      else if (heading.parentElement !== welcome) welcome.insertBefore(heading, introduction);
      const target = mobile.matches ? tools : trayParent;
      if (tray.parentElement !== target) target.append(tray);
      shell.toggleAttribute('data-reading', mobile.matches && id !== null);
      keypad.inert = mobile.matches && id !== null;
      if (id) {
        const index = links.findIndex((link) => link.dataset.open === id);
        if (index !== -1) selected = index;
      }
      select(selected);
      for (const button of shell.querySelectorAll('[data-phone-confirm]')) button.setAttribute('aria-label', id ? text.menu : text.open);
      shell.querySelector('.phone-softkey').textContent = id ? text.menu : text.shortOpen;
      for (const bar of desktop.querySelectorAll('[data-drag]')) bar.tabIndex = mobile.matches ? -1 : 0;
    },
  };
}
