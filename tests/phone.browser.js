// Run on a fresh mobile page with agent-browser eval --stdin.
(async () => {
  const assert = (value, message) => { if (!value) throw Error(message); };
  const shell = document.querySelector('[data-phone]');
  const screen = document.querySelector('.phone-screen');
  const keypad = document.querySelector('.phone-keypad');
  const icons = [...document.querySelectorAll('.desktop-icons [data-open]')];
  const selected = () => icons.findIndex((icon) => icon.hasAttribute('data-phone-selected'));
  const active = (id) => document.getElementById(id).hasAttribute('data-active');
  const home = () => document.querySelector('.phone-softkeys [data-phone-confirm]').click();
  const key = (value) => keypad.querySelector(`[data-phone-key="${value}"]`).click();
  assert(matchMedia('(max-width: 700px)').matches, 'Use a mobile viewport');
  assert(icons.length === 5 && !document.getElementById('percorso'), 'The redundant background section must be removed');
  assert(!shell.hasAttribute('data-reading'), 'Mobile must initially show the app menu');
  assert([...document.querySelectorAll('h1')].filter((heading) => heading.getClientRects().length).length === 1, 'The menu needs one visible primary heading');
  assert(getComputedStyle(keypad).display !== 'none', 'Physical keys are missing');
  assert(!document.querySelector('.desktop-icons').inert, 'The initial menu must be interactive');
  const softkey = document.querySelector('.phone-softkey');
  const openLabel = document.documentElement.lang === 'en' ? 'Open' : 'Apri';
  assert(softkey.textContent === openLabel, 'The menu action must say Open');
  softkey.click();
  assert(active('benvenuto') && softkey.textContent === 'Menu', 'The contextual action must open an app then offer Menu');
  home();
  assert(softkey.textContent === openLabel, 'Returning home must restore Open');
  const initialHeight = screen.getBoundingClientRect().height;
  document.querySelector('[data-phone-direction="right"]').click();
  assert(selected() === 1, 'D-pad did not select the next app');
  keypad.querySelector('[data-phone-confirm]').click();
  assert(active('profilo') && shell.hasAttribute('data-reading'), 'Confirm did not open the selected app');
  assert(screen.getBoundingClientRect().height > initialHeight + 100, 'Reading did not expand the screen');
  assert(keypad.inert && getComputedStyle(keypad).display === 'none', 'Reading must retire the hardware keypad');
  assert(document.querySelector('.desktop-icons').inert, 'Covered menu must leave keyboard navigation');
  home();
  assert(!shell.hasAttribute('data-reading') && selected() === 1, 'Back did not restore menu selection');
  assert(!keypad.inert, 'Returning to the menu did not restore the keypad');
  const direction = (name) => keypad.querySelector(`[data-phone-direction="${name}"]`).click();
  for (const name of ['left', 'right', 'up', 'down']) {
    const start = selected();
    const visited = new Set();
    for (let step = 0; step < icons.length; step++) {
      visited.add(selected());
      const previous = selected();
      direction(name);
      assert(selected() !== previous, `${name}: every press must move the selection`);
    }
    assert(visited.size === icons.length && selected() === start, `${name}: repeated presses must reach every icon before returning`);
  }
  for (const [index, icon] of icons.entries()) {
    icon.focus();
    for (const [first, opposite] of [['up', 'down'], ['down', 'up'], ['left', 'right'], ['right', 'left']]) {
      direction(first);
      direction(opposite);
      assert(selected() === index, `${first}/${opposite}: opposite arrows must restore the starting icon`);
    }
  }
  const six = keypad.querySelector('[data-phone-key="6"]');
  assert(!six.disabled && getComputedStyle(six).opacity === '1', 'Key 6 must look like the other numeric keys');
  assert(document.querySelectorAll('.phone-softkeys button').length === 1, 'Phone must expose a single contextual action');
  assert(!document.querySelector('[data-phone-back], [data-phone-menu]'), 'Duplicate Menu/Back controls must be removed');
  key('6');
  assert(!shell.hasAttribute('data-reading'), 'Unassigned key must not launch another app');
  for (const [index, icon] of icons.entries()) {
    key(String(index + 1));
    assert(active(icon.dataset.open), `Shortcut ${index + 1} opened the wrong section`);
    home();
  }
  icons[2].click();
  assert(active('progetti'), 'Direct touch did not open projects');
  const content = document.querySelector('#progetti .window-content');
  const fixture = document.createElement('div');
  fixture.style.height = '1600px';
  content.append(fixture);
  content.scrollTop = 0;
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  await new Promise(requestAnimationFrame);
  assert(content.scrollTop > 0, 'D-pad keyboard equivalent did not scroll long content');
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: '7', bubbles: true }));
  assert(content.scrollTop === 0, 'Numeric scroll-up shortcut failed');
  fixture.remove();
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!shell.hasAttribute('data-reading'), 'Escape did not return to the phone menu');
  const theme = document.documentElement.dataset.theme;
  key('9');
  assert(document.documentElement.dataset.theme !== theme, 'Numeric theme shortcut failed');
  key('9');
  key('3');
  home();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Browser history did not respond')), 2000);
    window.addEventListener('popstate', () => { clearTimeout(timer); resolve(); }, { once: true });
    history.back();
  });
  assert(active('progetti') && document.activeElement === document.getElementById('progetti'), 'Browser Back did not restore the app and focus');
  home();
  key('4');
  assert(document.querySelector('#curriculum button[disabled]'), 'Missing CV must remain unavailable');
  home();
  assert(document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight, 'Phone shell overflows the viewport');
  const languages = document.querySelector('.phone-status .languages a');
  assert(languages && languages.href !== location.href, 'Language switching is not reachable in the phone');
  assert(getComputedStyle(document.querySelector('.taskbar')).display === 'none', 'Desktop taskbar leaked into the phone');
  return 'PASS: five-app menu, circular arrow navigation, D-pad, 1–5 shortcuts, reading, history, theme, focus and overflow';
})();
